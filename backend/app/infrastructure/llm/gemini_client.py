"""Tiny client for the Google Gemini REST API (free key from https://aistudio.google.com).

Used for two jobs: writing notes from a transcript, and transcribing audio with speaker labels.
Audio up to ~14 MB is sent inline; bigger files go through the Gemini Files API first."""
import base64
import json
import re
import time

import httpx

from app.domain.errors import GenerationError

BASE = "https://generativelanguage.googleapis.com"
INLINE_LIMIT = 14 * 1024 * 1024  # inline requests are capped at 20 MB after base64
# Free models are sometimes "busy" (503), out of free quota (429) or retired (404). We move straight to the
# next model in the list, and remember the bad ones for a while so later requests don't waste time on them.
DEFAULT_FALLBACKS = ("gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest")
BUSY = (500, 502, 503, 504)
COOLDOWN_SECONDS = {429: 15 * 60, 404: 24 * 3600, **{code: 60 for code in BUSY}}
_cooldown: dict[str, float] = {}  # model -> time until which it is skipped


def reset_cooldowns() -> None:
    _cooldown.clear()


class GeminiClient:
    def __init__(self, api_key: str, model: str, timeout: float = 240, fallbacks: tuple[str, ...] | list[str] = DEFAULT_FALLBACKS):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.fallbacks = [m for m in fallbacks if m and m != model]
        self.used_model = model  # the model that actually answered last time

    def _headers(self) -> dict:
        return {"x-goog-api-key": self.api_key}

    @staticmethod
    def _raise(resp: httpx.Response) -> None:
        if resp.status_code < 400:
            return
        try:
            message = resp.json().get("error", {}).get("message", "")
        except ValueError:
            message = resp.text[:200]
        if resp.status_code == 429:
            raise GenerationError("The free Gemini limit was reached. Wait a minute and try again.")
        if resp.status_code in BUSY:
            raise GenerationError("Gemini is busy right now. Please try again in a minute.")
        if resp.status_code in (400, 401, 403) and "key" in message.lower():
            raise GenerationError("The Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env.")
        raise GenerationError(f"Gemini could not process this ({resp.status_code}): {message[:200]}")

    def generate_json(self, *, system: str, parts: list[dict], temperature: float = 0.2) -> dict:
        body = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"},
        }
        chain = [self.model, *self.fallbacks]
        now = time.monotonic()
        ready = [m for m in chain if _cooldown.get(m, 0) <= now]
        last_busy: httpx.Response | None = None  # last "busy / out of quota" answer, for the error message
        last_error: GenerationError | None = None
        for model in ready or chain:  # if every model is cooling down, try them all anyway
            try:
                resp = httpx.post(
                    f"{BASE}/v1beta/models/{model}:generateContent",
                    headers=self._headers(), json=body, timeout=httpx.Timeout(self.timeout, connect=15),
                )
            except httpx.TimeoutException:
                _cooldown[model] = time.monotonic() + 60
                continue
            except httpx.HTTPError as exc:
                raise GenerationError(f"Could not reach Gemini: {exc}") from exc
            if resp.status_code in COOLDOWN_SECONDS:
                _cooldown[model] = time.monotonic() + COOLDOWN_SECONDS[resp.status_code]
                last_busy = resp
                continue  # busy, out of free quota for this model, or retired -> next model
            self._raise(resp)
            self.used_model = model
            try:
                return self._parse(resp.json())
            except GenerationError as exc:  # a broken or cut-off reply: ask the next model instead
                last_error = exc
                continue
        if last_error is not None:
            raise last_error
        if last_busy is not None:
            self._raise(last_busy)  # "free limit reached" / "busy" message
        raise GenerationError("Gemini did not answer in time. Please try again.")

    @staticmethod
    def _parse(data: dict) -> dict:
        try:
            text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
        except (KeyError, IndexError, TypeError) as exc:
            reason = (data.get("promptFeedback") or {}).get("blockReason") or "empty response"
            raise GenerationError(f"Gemini returned no result ({reason}). Please try again.") from exc
        fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
        text = (fenced.group(1) if fenced else text).strip()
        try:
            value, _ = json.JSONDecoder().raw_decode(text)  # ignores anything after the JSON
        except json.JSONDecodeError as exc:
            raise GenerationError("Gemini returned an invalid response. Please try again.") from exc
        if not isinstance(value, dict):
            raise GenerationError("Gemini returned an invalid response. Please try again.")
        return value

    def audio_part(self, data: bytes, mime_type: str, display_name: str) -> dict:
        """Inline audio for small files, otherwise upload through the Files API."""
        if len(data) <= INLINE_LIMIT:
            return {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(data).decode()}}
        return {"file_data": {"mime_type": mime_type, "file_uri": self._upload(data, mime_type, display_name)}}

    def _upload(self, data: bytes, mime_type: str, display_name: str) -> str:
        try:
            start = httpx.post(
                f"{BASE}/upload/v1beta/files",
                headers={
                    **self._headers(),
                    "X-Goog-Upload-Protocol": "resumable",
                    "X-Goog-Upload-Command": "start",
                    "X-Goog-Upload-Header-Content-Length": str(len(data)),
                    "X-Goog-Upload-Header-Content-Type": mime_type,
                },
                json={"file": {"display_name": display_name[:100]}},
                timeout=60,
            )
            self._raise(start)
            upload_url = start.headers.get("x-goog-upload-url")
            if not upload_url:
                raise GenerationError("Gemini did not accept the audio upload.")
            done = httpx.post(
                upload_url,
                headers={"X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize"},
                content=data,
                timeout=httpx.Timeout(self.timeout, connect=15),
            )
            self._raise(done)
            file = done.json()["file"]
            # Audio is usually ready at once; wait briefly while Google processes it.
            for _ in range(30):
                if file.get("state") in (None, "ACTIVE"):
                    return file["uri"]
                if file.get("state") == "FAILED":
                    raise GenerationError("Gemini could not read this audio file.")
                time.sleep(2)
                info = httpx.get(f"{BASE}/v1beta/{file['name']}", headers=self._headers(), timeout=30)
                self._raise(info)
                file = info.json()
            raise GenerationError("Gemini took too long to prepare the audio. Please try again.")
        except httpx.HTTPError as exc:
            raise GenerationError(f"Could not reach Gemini: {exc}") from exc
