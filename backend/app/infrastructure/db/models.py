"""Database tables.

    admins        people who may sign in to the admin view (several admins, email + password)
    templates     what a doctor picks, e.g. "Standard SOAP note"; points to the prompt currently in use
    prompts       the instructions behind a template; every save is a new version (one template -> many prompts)
    generations   every "Generate" run: prompt + transcript -> notes (kept to compare results later)
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    group_name: Mapped[str] = mapped_column(String(80), default="", index=True)
    # Ordered headings of the note, e.g. ["Current", "Findings", "Assessment", "Plan", "Referral"]
    sections: Mapped[list] = mapped_column(JSON, default=list)
    include_codes: Mapped[bool] = mapped_column(Boolean, default=True)  # ask for ICD-10 codes
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # offered to the clinical app
    sort_order: Mapped[int] = mapped_column(Integer, default=1000)
    # The prompt version the clinical app should use (chosen in Settings)
    active_prompt_id: Mapped[int | None] = mapped_column(
        ForeignKey("prompts.id", ondelete="SET NULL", use_alter=True, name="fk_templates_active_prompt"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    prompts: Mapped[list[Prompt]] = relationship(
        back_populates="template", cascade="all, delete-orphan", order_by="Prompt.version.desc()",
        foreign_keys="Prompt.template_id",
    )
    active_prompt: Mapped[Prompt | None] = relationship(foreign_keys=[active_prompt_id], post_update=True)


class Prompt(Base):
    __tablename__ = "prompts"
    __table_args__ = (UniqueConstraint("template_id", "version", name="uq_prompt_template_version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("templates.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    change_note: Mapped[str] = mapped_column(String(255), default="")
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    template: Mapped[Template] = relationship(back_populates="prompts", foreign_keys=[template_id])
    created_by: Mapped[Admin | None] = relationship()


class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("templates.id", ondelete="SET NULL"), nullable=True, index=True)
    # The saved prompt version used, or empty when an unsaved draft was tested
    prompt_id: Mapped[int | None] = mapped_column(ForeignKey("prompts.id", ondelete="SET NULL"), nullable=True)
    prompt_text: Mapped[str] = mapped_column(Text)  # exact text sent, so results can be compared later
    transcript: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(10), default="en")
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provider: Mapped[str] = mapped_column(String(40), default="")
    model: Mapped[str] = mapped_column(String(80), default="")
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    template: Mapped[Template | None] = relationship()
    prompt: Mapped[Prompt | None] = relationship()
    created_by: Mapped[Admin | None] = relationship()
