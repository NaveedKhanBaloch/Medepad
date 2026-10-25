"""Request and response shapes of the API."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.domain.languages import CODES


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth & admins ------------------------------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)  # not validated further: wrong emails get the normal answer
    password: str = Field(min_length=1, max_length=200)
    remember: bool = False


class AdminOut(ORM):
    id: int
    name: str
    email: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=1, max_length=200)


class AdminCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AdminUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    password: str | None = Field(default=None, max_length=200)


# ---- templates & prompts ------------------------------------------------------------------------------------------
class PromptOut(ORM):
    id: int
    template_id: int
    version: int
    content: str
    change_note: str
    created_at: datetime
    created_by_name: str | None = None


class VersionBrief(BaseModel):
    id: int
    version: int
    change_note: str
    created_at: datetime


class TemplateSummaryOut(ORM):
    id: int
    name: str
    description: str
    group_name: str
    sections: list[str]
    include_codes: bool
    is_premium: bool
    is_active: bool
    active_prompt_id: int | None
    active_version: int | None = None
    prompt_count: int = 0
    updated_at: datetime
    versions: list[VersionBrief] = []  # only with ?with_versions=true


class TemplateOut(TemplateSummaryOut):
    prompts: list[PromptOut] = []


class TemplateCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    group_name: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=2000)
    sections: list[str] = Field(min_length=1, max_length=40)
    include_codes: bool = True
    is_premium: bool = False
    prompt: str = Field(min_length=1, max_length=50_000)


class TemplateUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=160)
    group_name: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=2000)
    sections: list[str] | None = Field(default=None, max_length=40)
    include_codes: bool | None = None
    is_premium: bool | None = None
    is_active: bool | None = None


class PromptCreateIn(BaseModel):
    content: str = Field(min_length=1, max_length=50_000)
    change_note: str = Field(default="", max_length=255)
    activate: bool = False


class ActivateIn(BaseModel):
    prompt_id: int


# ---- generating notes ---------------------------------------------------------------------------------------------
class GenerateIn(BaseModel):
    transcript: str = Field(min_length=1, max_length=120_000)
    template_id: int | None = None
    prompt_id: int | None = None
    # Unsaved text from the editor (when empty, the chosen version / the template's prompt in use is used)
    prompt_text: str | None = Field(default=None, max_length=50_000)
    sections: list[str] | None = Field(default=None, max_length=40)
    include_codes: bool | None = None
    language: str = "en"

    @field_validator("language")
    @classmethod
    def _known(cls, v: str) -> str:
        if v not in CODES:
            raise ValueError("Unknown language")
        return v


class GenerationOut(ORM):
    id: int
    template_id: int | None
    template_name: str | None = None
    prompt_id: int | None
    prompt_version: int | None = None
    prompt_text: str
    transcript: str
    language: str
    result: dict | None
    provider: str
    model: str
    latency_ms: int
    success: bool
    error: str | None
    created_by_name: str | None = None
    created_at: datetime
