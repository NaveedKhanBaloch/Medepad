"""Use case: prompt + transcript -> notes.

The admin can test a saved prompt version or the unsaved text in the editor. The same rules as the clinical app
are added to the prompt (language, section headings, JSON shape), so results can be compared later.
Every run is stored in `generations`.
"""
from __future__ import annotations

import time

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain import languages
from app.domain.errors import DomainError, GenerationError
from app.domain.notes import NoteRequest
from app.infrastructure.codes import get_code_lookup
from app.infrastructure.db.models import Admin, Generation
from app.infrastructure.llm.factory import build_note_generator
from app.infrastructure.repositories import GenerationRepository, PromptRepository, TemplateRepository

MAX_TRANSCRIPT_CHARS = 120_000


class GenerationService:
    def __init__(self, db: Session):
        self.db = db
        self.templates = TemplateRepository(db)
        self.prompts = PromptRepository(db)
        self.generations = GenerationRepository(db)

    def generate(self, *, by: Admin, transcript: str, template_id: int | None = None, prompt_id: int | None = None,
                 prompt_text: str | None = None, sections: list[str] | None = None, include_codes: bool | None = None,
                 language: str = "en") -> Generation:
        transcript = transcript.strip()
        if not transcript:
            raise DomainError("Paste a transcript of the conversation first.")
        if len(transcript) > MAX_TRANSCRIPT_CHARS:
            raise DomainError("The transcript is too long for one note.")
        template = self.templates.get(template_id) if template_id else None
        if template_id and template is None:
            raise DomainError("Template not found.")
        prompt = self.prompts.get(prompt_id) if prompt_id else None
        if prompt_id and prompt is None:
            raise DomainError("Prompt version not found.")
        if prompt and template and prompt.template_id != template.id:
            raise DomainError("This prompt version belongs to another template.")
        text = (prompt_text or "").strip() or (prompt.content if prompt else "") or (
            template.active_prompt.content if template and template.active_prompt else "")
        if not text:
            raise DomainError("Write a prompt first.")
        if prompt and prompt_text and prompt_text.strip() != prompt.content.strip():
            prompt = None  # the editor text was changed: it is an unsaved draft, not that version
        heads = [s.strip() for s in (sections if sections is not None else (template.sections if template else [])) if s.strip()]
        codes = include_codes if include_codes is not None else (template.include_codes if template else True)
        code = languages.normalize(language) or "en"

        try:
            generator = build_note_generator(get_settings())
        except RuntimeError as exc:
            raise DomainError(str(exc)) from exc
        row = Generation(
            template_id=template.id if template else None, prompt_id=prompt.id if prompt else None, prompt_text=text,
            transcript=transcript, language=code, provider=generator.provider_name, model=generator.model_name,
            created_by_id=by.id,
        )
        started = time.perf_counter()
        try:
            note = generator.generate(NoteRequest(prompt=text, transcript=transcript, sections=heads or ["Summary"],
                                                  writing_language=code, include_diagnostic_codes=codes))
            note.diagnostic_codes = get_code_lookup().verify(note.diagnostic_codes)
            row.result, row.model, row.success = note.to_dict(), note.model or row.model, True
        except GenerationError as exc:
            row.success, row.error = False, exc.message
        except Exception as exc:  # network problems etc.
            row.success, row.error = False, f"Note generation failed: {exc}"
        row.latency_ms = int((time.perf_counter() - started) * 1000)
        self.generations.add(row)
        self.db.commit()
        if not row.success:
            raise GenerationError(row.error or "Note generation failed.")
        return row

    def recent(self, limit: int = 20, template_id: int | None = None) -> list[Generation]:
        return self.generations.recent(limit, template_id)
