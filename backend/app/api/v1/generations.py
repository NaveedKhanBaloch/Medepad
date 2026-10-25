"""Generate notes from a prompt + transcript, and the history of results."""
from fastapi import APIRouter, Query

from app.api.deps import DB, CurrentAdmin
from app.api.schemas import GenerateIn, GenerationOut
from app.application.generation_service import GenerationService
from app.domain.errors import NotFoundError
from app.infrastructure.db.models import Generation
from app.infrastructure.repositories import GenerationRepository

router = APIRouter(tags=["generations"])


def generation_out(g: Generation) -> GenerationOut:
    out = GenerationOut.model_validate(g)
    out.template_name = g.template.name if g.template else None
    out.prompt_version = g.prompt.version if g.prompt else None
    out.created_by_name = g.created_by.name if g.created_by else None
    return out


@router.post("/generate", response_model=GenerationOut)
def generate(body: GenerateIn, admin: CurrentAdmin, db: DB):
    """Prompt + transcript -> notes. Saved in the history."""
    g = GenerationService(db).generate(by=admin, **body.model_dump())
    db.refresh(g)
    return generation_out(g)


@router.get("/generations", response_model=list[GenerationOut])
def list_generations(_: CurrentAdmin, db: DB, template_id: int | None = None, limit: int = Query(20, ge=1, le=100)):
    return [generation_out(g) for g in GenerationService(db).recent(limit, template_id)]


@router.get("/generations/{generation_id}", response_model=GenerationOut)
def get_generation(generation_id: int, _: CurrentAdmin, db: DB):
    g = GenerationRepository(db).get(generation_id)
    if g is None:
        raise NotFoundError("Result not found.")
    return generation_out(g)
