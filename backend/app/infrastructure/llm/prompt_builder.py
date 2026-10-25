"""Builds the chat messages sent to the LLM and parses its JSON reply.

The template's prompt (editable in the admin panel) is the *instruction*. The transcript is
*input data* and is always sent in a separate user message, so the two are never mixed up.
"""
import json
import re

from app.domain import languages
from app.domain.errors import GenerationError
from app.domain.notes import DiagnosticCode, GeneratedNote, NoteRequest, NoteSection


def build_messages(req: NoteRequest) -> list[dict]:
    code = languages.normalize(req.writing_language) or "en"
    language = languages.name(code)
    headings_rule = (
        "exactly these headings, in this order:"
        if code == "en"
        else (
            f"these headings, each translated into {language} by its clinical meaning (not word for word; for "
            "example \"Subjective\" = what the patient reports, \"Objective\" = examination findings and "
            "measurements, \"Assessment\" = the diagnosis, \"Plan\" = treatment and follow-up) and followed by the "
            "English heading in brackets, e.g. \"<translated heading> (Plan)\", in this order:"
        )
    )
    sections = "\n".join(f"- {s}" for s in req.sections) or "- Summary"
    codes_rule = (
        'Include "diagnostic_codes": a list of up to 5 ICD-10 codes '
        '({"code": "M54.5", "description": "Low back pain"}) supported by the conversation.'
        if req.include_diagnostic_codes
        else 'Set "diagnostic_codes" to an empty list.'
    )
    contract = f"""
OUTPUT RULES (always apply, regardless of the instructions above):
- Write the whole note (title, summary, headings and every section) in {language}, using {languages.script(code)},
  even if the conversation was in another language or mixed languages. Translate faithfully; do not add anything.
- Keep drug names, doses, units, numbers and ICD-10 codes exactly as they are.
- Use only information present in the transcript. If a section has no information, write "Not discussed" in {language}; every fixed phrase (e.g. "No referral made.") is also written in {language}.
- Respond with a single JSON object and nothing else, in this exact shape:
  {{"title": "<3-6 word name for this conversation, e.g. Recurring lower back pain>",
    "summary": "<2-3 sentence overview>",
    "sections": [{{"title": "<section heading>", "content": "<text, may use '- ' bullet lines>"}}],
    "diagnostic_codes": [{{"code": "...", "description": "..."}}]}}
- "sections" must contain {headings_rule}
{sections}
- {codes_rule}
""".strip()

    return [
        {"role": "system", "content": f"{req.prompt.strip()}\n\n{contract}"},
        {"role": "user", "content": f"TRANSCRIPT:\n\"\"\"\n{req.transcript.strip()}\n\"\"\""},
    ]


_ESCAPED = re.compile(r"\\u([0-9a-fA-F]{4})")


def _clean(value: object) -> str:
    """The model sometimes writes a symbol as an escape code ("38.1 \\u00b0C"): turn it back into the symbol."""
    return _ESCAPED.sub(lambda m: chr(int(m.group(1), 16)), str(value)).strip()


def parse_note(raw: str, req: NoteRequest) -> GeneratedNote:
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fenced:
        text = fenced.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise GenerationError("The language model returned an invalid response. Please try again.") from exc

    sections = [
        NoteSection(title=_clean(s.get("title", "")), content=_clean(s.get("content", "")))
        for s in data.get("sections", [])
        if isinstance(s, dict)
    ]
    codes = [
        DiagnosticCode(code=_clean(c.get("code", "")), description=_clean(c.get("description", "")))
        for c in data.get("diagnostic_codes", []) or []
        if isinstance(c, dict) and c.get("code")
    ]
    return GeneratedNote(
        title=_clean(data.get("title", ""))[:120],
        summary=_clean(data.get("summary", "")),
        sections=sections,
        diagnostic_codes=codes if req.include_diagnostic_codes else [],
    )
