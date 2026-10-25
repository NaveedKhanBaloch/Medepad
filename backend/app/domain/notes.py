"""Core domain objects for note generation. No framework or database imports here."""
from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class NoteRequest:
    """Everything the LLM needs to turn a transcript into a structured note."""

    prompt: str                     # instruction text from the template's active prompt
    transcript: str                 # conversation text (speaker-labelled when available)
    sections: list[str]             # ordered headings the note must contain
    writing_language: str = "en"    # language the note is written in
    include_diagnostic_codes: bool = False


@dataclass
class NoteSection:
    title: str
    content: str


@dataclass
class DiagnosticCode:
    code: str
    description: str
    verified: bool = False  # True when the code exists in our reference list


@dataclass
class GeneratedNote:
    sections: list[NoteSection]
    summary: str = ""
    diagnostic_codes: list[DiagnosticCode] = field(default_factory=list)
    provider: str = ""
    model: str = ""
    title: str = ""  # short name for the consultation, e.g. "Recurring lower back pain"

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "summary": self.summary,
            "sections": [{"title": s.title, "content": s.content} for s in self.sections],
            "diagnostic_codes": [
                {"code": c.code, "description": c.description, "verified": c.verified} for c in self.diagnostic_codes
            ],
            "provider": self.provider,
            "model": self.model,
        }


class NoteGenerator(Protocol):
    """Port implemented by infrastructure/llm/* (Azure OpenAI, OpenAI, mock)."""

    provider_name: str
    model_name: str

    def generate(self, request: NoteRequest) -> GeneratedNote: ...


class CodeLookup(Protocol):
    """Port for the diagnostic code reference list (ICD-10 JSON file)."""

    def verify(self, codes: list[DiagnosticCode]) -> list[DiagnosticCode]: ...
