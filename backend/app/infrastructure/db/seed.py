"""On start: create the tables, the first admin (when there is none) and the starter templates (when there are none).

Starter templates are the 52 researched templates (company, Nordic COSMIC/TakeCare, international), each with
its prompt as version 1. They are added only once: after that, admins own the templates and prompts.
"""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.infrastructure.db.models import Admin, Prompt, Template
from app.infrastructure.db.session import Base, SessionLocal, engine
from app.infrastructure.db.template_library import COMPANY_TEMPLATES, STANDARD_TEMPLATES
from app.infrastructure.repositories import AdminRepository, TemplateRepository


def seed_first_admin(db: Session) -> None:
    repo = AdminRepository(db)
    if repo.count() == 0:
        s = get_settings()
        repo.add(Admin(name=s.seed_admin_name, email=s.seed_admin_email.strip().lower(),
                       password_hash=hash_password(s.seed_admin_password)))


def seed_templates(db: Session) -> None:
    if TemplateRepository(db).count() > 0:
        return
    for order, d in enumerate([*COMPANY_TEMPLATES, *STANDARD_TEMPLATES]):
        t = Template(name=d.name, description=d.description, group_name=d.group, sections=list(d.sections),
                     include_codes=d.codes, is_premium=d.premium, sort_order=order)
        db.add(t)
        db.flush()
        p = Prompt(template_id=t.id, version=1, content=d.prompt, change_note="Starter prompt")
        db.add(p)
        db.flush()
        t.active_prompt_id = p.id


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_first_admin(db)
        seed_templates(db)
        db.commit()
