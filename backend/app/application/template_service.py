"""Use cases: templates and their prompt versions.

A template has many prompts (v1, v2, v3 ...). Saving never overwrites: every save is a new version.
One version per template is "in use" (templates.active_prompt_id) - that is the one the clinical app will use.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.errors import ConflictError, DomainError, NotFoundError
from app.infrastructure.db.models import Admin, Prompt, Template
from app.infrastructure.repositories import PromptRepository, TemplateRepository


def clean_sections(sections: list[str]) -> list[str]:
    out: list[str] = []
    for s in sections:
        s = s.strip()
        if s and s.lower() not in {x.lower() for x in out}:
            out.append(s[:120])
    return out


class TemplateService:
    def __init__(self, db: Session):
        self.db = db
        self.templates = TemplateRepository(db)
        self.prompts = PromptRepository(db)

    # ---- templates ------------------------------------------------------------------------------------------------
    def list(self) -> list[Template]:
        return self.templates.list()

    def get(self, template_id: int) -> Template:
        t = self.templates.get(template_id)
        if t is None:
            raise NotFoundError("Template not found.")
        return t

    def create(self, *, name: str, group_name: str, description: str, sections: list[str], include_codes: bool,
               is_premium: bool, prompt: str, by: Admin) -> Template:
        name = name.strip()
        if not name:
            raise DomainError("Give the template a name.")
        if self.templates.by_name(name):
            raise ConflictError("A template with this name already exists.")
        sections = clean_sections(sections)
        if not sections:
            raise DomainError("Add at least one section heading (for example Subjective, Objective, Assessment, Plan).")
        if not prompt.strip():
            raise DomainError("Write the prompt for this template.")
        t = self.templates.add(Template(
            name=name, group_name=group_name.strip(), description=description.strip(), sections=sections,
            include_codes=include_codes, is_premium=is_premium, sort_order=self.templates.next_sort_order(),
        ))
        first = self.prompts.add(Prompt(template_id=t.id, version=1, content=prompt.strip(), change_note="First version",
                                        created_by_id=by.id))
        t.active_prompt_id = first.id
        self.db.commit()
        return t

    def update(self, template_id: int, **changes) -> Template:
        t = self.get(template_id)
        if "name" in changes and changes["name"] is not None:
            name = changes["name"].strip()
            other = self.templates.by_name(name)
            if not name:
                raise DomainError("The name cannot be empty.")
            if other and other.id != t.id:
                raise ConflictError("A template with this name already exists.")
            t.name = name
        if changes.get("sections") is not None:
            sections = clean_sections(changes["sections"])
            if not sections:
                raise DomainError("Keep at least one section heading.")
            t.sections = sections
        for field in ("group_name", "description"):
            if changes.get(field) is not None:
                setattr(t, field, changes[field].strip())
        for field in ("include_codes", "is_premium", "is_active"):
            if changes.get(field) is not None:
                setattr(t, field, changes[field])
        self.db.commit()
        return t

    def delete(self, template_id: int) -> None:
        self.templates.delete(self.get(template_id))
        self.db.commit()

    # ---- prompts --------------------------------------------------------------------------------------------------
    def prompt_versions(self, template_id: int) -> list[Prompt]:
        self.get(template_id)
        return self.prompts.for_template(template_id)

    def save_prompt(self, template_id: int, content: str, change_note: str, by: Admin, activate: bool) -> Prompt:
        t = self.get(template_id)
        content = content.strip()
        if not content:
            raise DomainError("The prompt cannot be empty.")
        latest = self.prompts.for_template(template_id)
        if latest and latest[0].content.strip() == content:
            raise DomainError("Nothing changed: this text is the same as the latest version.")
        p = self.prompts.add(Prompt(
            template_id=t.id, version=self.prompts.next_version(t.id), content=content,
            change_note=change_note.strip()[:255], created_by_id=by.id,
        ))
        if activate or t.active_prompt_id is None:
            t.active_prompt_id = p.id
        self.db.commit()
        return p

    def activate(self, template_id: int, prompt_id: int) -> Template:
        t = self.get(template_id)
        p = self.prompts.get(prompt_id)
        if p is None or p.template_id != t.id:
            raise NotFoundError("This prompt version does not belong to the template.")
        t.active_prompt_id = p.id
        self.db.commit()
        return t
