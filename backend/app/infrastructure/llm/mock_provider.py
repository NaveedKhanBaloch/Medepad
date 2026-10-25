"""Offline note generator for local development and tests.

It does NOT understand the conversation. It sorts transcript sentences into sections using
keywords so the full record -> transcript -> note flow can be exercised without an API key.
"""
import re

from app.domain.notes import GeneratedNote, NoteRequest, NoteSection
from app.domain.titles import suggest_title
from app.infrastructure.codes import IcdCodeLookup

KEYWORDS = {
    "subjective": ["pain", "feel", "hurt", "since", "started", "history", "complain", "years", "ago", "worse"],
    "current situation": ["pain", "feel", "hurt", "since", "started", "complain", "worse", "today"],
    "history": ["years", "ago", "before", "previous", "history", "injury", "used to"],
    "objective": ["exam", "pressure", "temperature", "observed", "tender", "range of motion", "looks"],
    "findings": ["exam", "tender", "observed", "range of motion", "looks", "noticed"],
    "assessment": ["likely", "think", "diagnos", "seems", "consistent", "probably", "assess"],
    "plan": ["recommend", "prescrib", "therapy", "follow", "exercise", "medication", "schedule", "should"],
    "medication": ["medication", "mg", "tablet", "prescrib", "ibuprofen", "dose", "pill"],
    "decisions": ["decide", "agreed", "decision", "approve", "we will", "go with", "final"],
    "action items": ["will", "deadline", "by friday", "by monday", "assign", "take care", "follow up", "task"],
    "summary": [],
}


def _sentences(transcript: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", transcript)
    return [p.strip() for p in parts if len(p.strip()) > 3]


class MockNoteGenerator:
    provider_name = "mock"
    model_name = "keyword-mock"

    def __init__(self, code_lookup: IcdCodeLookup):
        self._codes = code_lookup

    def generate(self, request: NoteRequest) -> GeneratedNote:
        sentences = _sentences(request.transcript)
        used: set[int] = set()
        sections: list[NoteSection] = []
        for heading in request.sections or ["Summary"]:
            words = next((v for k, v in KEYWORDS.items() if k in heading.lower()), [])
            picked = [
                i for i, s in enumerate(sentences)
                if i not in used and any(w in s.lower() for w in words)
            ][:4]
            used.update(picked)
            content = "\n".join(f"- {sentences[i]}" for i in picked) or "Not discussed"
            sections.append(NoteSection(title=heading, content=content))

        codes = self._codes.suggest(request.transcript) if request.include_diagnostic_codes else []
        summary = " ".join(sentences[:2]) if sentences else "No conversation content was provided."
        return GeneratedNote(
            title=suggest_title(request.transcript) or "",
            summary=f"[Mock output — configure an LLM provider for real notes] {summary}",
            sections=sections,
            diagnostic_codes=codes,
            provider=self.provider_name,
            model=self.model_name,
        )
