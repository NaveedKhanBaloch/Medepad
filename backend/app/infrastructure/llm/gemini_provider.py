"""Note generator that uses Google Gemini (free tier works)."""
from app.domain.notes import GeneratedNote, NoteRequest
from app.infrastructure.llm.gemini_client import GeminiClient
from app.infrastructure.llm.prompt_builder import build_messages, parse_note
import json


class GeminiNoteGenerator:
    provider_name = "gemini"

    def __init__(self, client: GeminiClient, temperature: float = 0.2):
        self._client = client
        self.model_name = client.model
        self._temperature = temperature

    def generate(self, request: NoteRequest) -> GeneratedNote:
        system, user = build_messages(request)  # same instructions and output rules as every provider
        data = self._client.generate_json(
            system=system["content"], parts=[{"text": user["content"]}], temperature=self._temperature
        )
        note = parse_note(json.dumps(data), request)
        note.provider, note.model = self.provider_name, self._client.used_model
        return note
