"""Generate notes from a prompt + transcript, and the history of results."""
from fastapi import APIRouter, Query
from fastapi.responses import Response

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
def list_generations(_: CurrentAdmin, db: DB, template_id: int | None = None, limit: int = Query(20, ge=1, le=500)):
    return [generation_out(g) for g in GenerationService(db).recent(limit, template_id)]


@router.get("/generations/export")
def export_generations(_: CurrentAdmin, db: DB, template_id: int | None = None):
    """All results (optionally of one template) as a ZIP of Word files: notes, transcript and prompt used."""
    from app.infrastructure.note_export import results_zip

    items = GenerationService(db).recent(1000, template_id)
    if not items:
        raise NotFoundError("There are no results to download.")
    return Response(
        results_zip(items),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="medepad-results.zip"', "Cache-Control": "private, no-store"},
    )


@router.delete("/generations/{generation_id}", status_code=204)
def delete_generation(generation_id: int, _: CurrentAdmin, db: DB):
    """Removes one result from the history."""
    repo = GenerationRepository(db)
    g = repo.get(generation_id)
    if g is None:
        raise NotFoundError("Result not found.")
    db.delete(g)
    db.commit()


@router.get("/generations/{generation_id}", response_model=GenerationOut)
def get_generation(generation_id: int, _: CurrentAdmin, db: DB):
    g = GenerationRepository(db).get(generation_id)
    if g is None:
        raise NotFoundError("Result not found.")
    return generation_out(g)


@router.get("/generations/{generation_id}/download")
def download_generation(generation_id: int, _: CurrentAdmin, db: DB):
    """The generated notes as a Word document."""
    from urllib.parse import quote

    from app.infrastructure.note_export import note_docx, safe_name

    g = GenerationRepository(db).get(generation_id)
    if g is None or not g.result:
        raise NotFoundError("These notes cannot be downloaded.")
    name = safe_name(f"{g.template.name if g.template else 'Notes'} notes")
    fallback = name.encode("ascii", "ignore").decode().strip() or "notes.docx"
    return Response(
        note_docx(g),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(name)}",
            "Cache-Control": "private, no-store",
        },
    )
