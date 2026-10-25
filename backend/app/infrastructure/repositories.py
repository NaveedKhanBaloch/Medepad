"""Database access. The application layer talks to these classes, never to SQL directly."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.infrastructure.db.models import Admin, Generation, Prompt, Template


class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, admin_id: int) -> Admin | None:
        return self.db.get(Admin, admin_id)

    def by_email(self, email: str) -> Admin | None:
        return self.db.scalar(select(Admin).where(func.lower(Admin.email) == email.strip().lower()))

    def list(self) -> list[Admin]:
        return list(self.db.scalars(select(Admin).order_by(Admin.created_at)))

    def count(self) -> int:
        return self.db.scalar(select(func.count(Admin.id))) or 0

    def add(self, admin: Admin) -> Admin:
        self.db.add(admin)
        self.db.flush()
        return admin


class TemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, template_id: int) -> Template | None:
        return self.db.get(Template, template_id)

    def by_name(self, name: str) -> Template | None:
        return self.db.scalar(select(Template).where(func.lower(Template.name) == name.strip().lower()))

    def list(self) -> list[Template]:
        q = select(Template).options(selectinload(Template.prompts), selectinload(Template.active_prompt))
        return list(self.db.scalars(q.order_by(Template.sort_order, Template.name)))

    def count(self) -> int:
        return self.db.scalar(select(func.count(Template.id))) or 0

    def next_sort_order(self) -> int:
        return (self.db.scalar(select(func.max(Template.sort_order))) or 0) + 1

    def add(self, template: Template) -> Template:
        self.db.add(template)
        self.db.flush()
        return template

    def delete(self, template: Template) -> None:
        template.active_prompt_id = None
        self.db.flush()
        self.db.delete(template)


class PromptRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, prompt_id: int) -> Prompt | None:
        return self.db.get(Prompt, prompt_id)

    def for_template(self, template_id: int) -> list[Prompt]:
        q = select(Prompt).where(Prompt.template_id == template_id).order_by(Prompt.version.desc())
        return list(self.db.scalars(q.options(selectinload(Prompt.created_by))))

    def next_version(self, template_id: int) -> int:
        return (self.db.scalar(select(func.max(Prompt.version)).where(Prompt.template_id == template_id)) or 0) + 1

    def count(self) -> int:
        return self.db.scalar(select(func.count(Prompt.id))) or 0

    def add(self, prompt: Prompt) -> Prompt:
        self.db.add(prompt)
        self.db.flush()
        return prompt


class GenerationRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, generation: Generation) -> Generation:
        self.db.add(generation)
        self.db.flush()
        return generation

    def get(self, generation_id: int) -> Generation | None:
        return self.db.get(Generation, generation_id)

    def recent(self, limit: int = 20, template_id: int | None = None) -> list[Generation]:
        q = select(Generation).options(
            selectinload(Generation.template), selectinload(Generation.prompt), selectinload(Generation.created_by)
        )
        if template_id:
            q = q.where(Generation.template_id == template_id)
        return list(self.db.scalars(q.order_by(Generation.created_at.desc(), Generation.id.desc()).limit(limit)))

    def count(self, since=None) -> int:
        q = select(func.count(Generation.id))
        if since is not None:
            q = q.where(Generation.created_at >= since)
        return self.db.scalar(q) or 0
