"""Dashboard numbers and settings information."""
from fastapi import APIRouter

from app.api.deps import DB, CurrentAdmin
from app.application.dashboard_service import DashboardService
from app.core.config import get_settings
from app.domain.languages import LANGUAGES
from app.infrastructure.llm.factory import provider_info

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(_: CurrentAdmin, db: DB):
    return DashboardService(db).summary()


@router.get("/settings/ai")
def ai_settings(_: CurrentAdmin):
    """Which AI writes the notes (set in backend/.env) and the languages notes can be written in."""
    return {
        **provider_info(get_settings()),
        "languages": [{"code": code, "name": name} for code, (name, _locale, _script) in LANGUAGES.items()],
    }
