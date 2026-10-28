"""On start: create the tables, the first admin (when there is none), the super admin, and the starter templates.

Starter templates are the 52 researched templates (company, Nordic COSMIC/TakeCare, international), each with
its prompt as version 1. They are added only once: after that, admins own the templates and prompts.
"""
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.infrastructure.db.models import ROLE_ADMIN, ROLE_SUPER, Admin, Prompt, Template
from app.infrastructure.db.session import Base, SessionLocal, engine
from app.infrastructure.db.template_library import COMPANY_TEMPLATES, STANDARD_TEMPLATES
from app.infrastructure.repositories import AdminRepository, TemplateRepository


def add_missing_columns() -> None:
    """Small upgrade step for databases made before a column existed (keeps all data)."""
    columns = {c["name"] for c in inspect(engine).get_columns("admins")}
    if "role" not in columns:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT '{ROLE_ADMIN}'"))


def seed_first_admin(db: Session) -> None:
    repo = AdminRepository(db)
    if repo.count() == 0:
        s = get_settings()
        repo.add(Admin(name=s.seed_admin_name, email=s.seed_admin_email.strip().lower(),
                       password_hash=hash_password(s.seed_admin_password), role=ROLE_SUPER))


def sync_super_admin(db: Session) -> None:
    """Exactly one super admin: the account with SUPER_ADMIN_EMAIL (default: the first admin's email).
    If that account does not exist yet, the existing super admin stays (or the oldest admin becomes it)."""
    s = get_settings()
    email = (s.super_admin_email or s.seed_admin_email).strip().lower()
    admins = list(db.scalars(select(Admin).order_by(Admin.id)))
    if not admins:
        return
    chosen = next((a for a in admins if a.email == email), None)
    if chosen is None:
        chosen = next((a for a in admins if a.role == ROLE_SUPER), admins[0])
    for a in admins:
        a.role = ROLE_SUPER if a.id == chosen.id else ROLE_ADMIN
    chosen.is_active = True  # the super admin can never be locked out by being switched off


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
    add_missing_columns()
    with SessionLocal() as db:
        seed_first_admin(db)
        sync_super_admin(db)
        seed_templates(db)
        db.commit()
