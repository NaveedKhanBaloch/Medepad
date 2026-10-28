"""Templates and their prompt versions."""
from fastapi import APIRouter

from app.api.deps import DB, CurrentAdmin
from app.api.schemas import (
    ActivateIn,
    PromptCreateIn,
    PromptOut,
    TemplateCreateIn,
    TemplateOut,
    TemplateSummaryOut,
    TemplateUpdateIn,
    VersionBrief,
)
from app.application.template_service import TemplateService
from app.infrastructure.db.models import Prompt, Template

router = APIRouter(prefix="/templates", tags=["templates"])


def prompt_out(p: Prompt) -> PromptOut:
    out = PromptOut.model_validate(p)
    out.created_by_name = p.created_by.name if p.created_by else None
    return out


def summary_out(t: Template) -> TemplateSummaryOut:
    out = TemplateSummaryOut.model_validate(t)
    out.active_version = t.active_prompt.version if t.active_prompt else None
    out.prompt_count = len(t.prompts)
    return out


def template_out(t: Template, svc: TemplateService) -> TemplateOut:
    out = TemplateOut(**summary_out(t).model_dump())
    out.prompts = [prompt_out(p) for p in svc.prompt_versions(t.id)]
    return out


@router.get("", response_model=list[TemplateSummaryOut])
def list_templates(_: CurrentAdmin, db: DB, with_versions: bool = False):
    out = []
    for t in TemplateService(db).list():
        item = summary_out(t)
        if with_versions:
            item.versions = [VersionBrief(id=p.id, version=p.version, change_note=p.change_note, created_at=p.created_at)
                             for p in sorted(t.prompts, key=lambda p: -p.version)]
        out.append(item)
    return out


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(body: TemplateCreateIn, admin: CurrentAdmin, db: DB):
    svc = TemplateService(db)
    return template_out(svc.create(by=admin, **body.model_dump()), svc)


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: int, _: CurrentAdmin, db: DB):
    svc = TemplateService(db)
    return template_out(svc.get(template_id), svc)


@router.patch("/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, body: TemplateUpdateIn, _: CurrentAdmin, db: DB):
    svc = TemplateService(db)
    return template_out(svc.update(template_id, **body.model_dump(exclude_unset=True)), svc)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, _: CurrentAdmin, db: DB):
    TemplateService(db).delete(template_id)


@router.get("/{template_id}/prompts", response_model=list[PromptOut])
def list_prompts(template_id: int, _: CurrentAdmin, db: DB):
    return [prompt_out(p) for p in TemplateService(db).prompt_versions(template_id)]


@router.post("/{template_id}/prompts", response_model=PromptOut, status_code=201)
def save_prompt(template_id: int, body: PromptCreateIn, admin: CurrentAdmin, db: DB):
    """Saves the text as a new version (never overwrites). `activate` also puts it in use."""
    return prompt_out(TemplateService(db).save_prompt(template_id, body.content, body.change_note, admin, body.activate))


@router.put("/{template_id}/active-prompt", response_model=TemplateOut)
def set_active_prompt(template_id: int, body: ActivateIn, _: CurrentAdmin, db: DB):
    """Chooses which prompt version this template uses."""
    svc = TemplateService(db)
    return template_out(svc.activate(template_id, body.prompt_id), svc)
