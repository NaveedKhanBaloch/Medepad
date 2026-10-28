"""Use case: the numbers and recent activity on the dashboard."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.llm.factory import provider_info
from app.infrastructure.repositories import AdminRepository, GenerationRepository, PromptRepository, TemplateRepository


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def summary(self) -> dict:
        templates = TemplateRepository(self.db).list()
        generations = GenerationRepository(self.db)
        since = datetime.now(timezone.utc) - timedelta(days=1)
        groups: dict[str, int] = {}
        for t in templates:
            groups[t.group_name or "Other"] = groups.get(t.group_name or "Other", 0) + 1
        return {
            "templates": len(templates),
            "active_templates": sum(1 for t in templates if t.is_active),
            "prompts": PromptRepository(self.db).count(),
            "admins": AdminRepository(self.db).count(),
            "generations_total": generations.count(),
            "generations_today": generations.count(since),
            "groups": [{"name": k, "count": v} for k, v in groups.items()],
            "recently_changed": sorted(
                ({"id": t.id, "name": t.name, "group_name": t.group_name, "updated_at": t.updated_at,
                  "active_version": t.active_prompt.version if t.active_prompt else None} for t in templates),
                key=lambda x: x["updated_at"], reverse=True,
            )[:5],
            "ai": provider_info(get_settings()),
        }
