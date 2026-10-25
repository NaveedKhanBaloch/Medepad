"""Settings, read from backend/.env (copy .env.example to .env)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Medepad Admin API"

    # PostgreSQL, e.g. postgresql+psycopg://postgres:password@localhost:5432/medepad_admin
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/medepad_admin"

    # Sign-in
    jwt_secret: str = "change-me-in-production-use-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 8
    remember_me_days: int = 7
    login_max_failures: int = 5  # wrong passwords in a row before the account is locked for a while
    login_lock_minutes: int = 15

    # First admin, made on first start when there are no admins yet
    seed_admin_name: str = "Medepad Admin"
    seed_admin_email: str = "admin@medepad.local"
    seed_admin_password: str = "Admin@12345"

    # Notes: "gemini" (free key from Google AI Studio), "openai", "azure_openai" or "mock" (offline samples)
    llm_provider: str = "mock"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"
    gemini_fallback_models: str = "gemini-3.5-flash-lite,gemini-flash-latest"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_version: str = "2024-10-21"
    llm_temperature: float = 0.2

    cors_origins: str = "http://localhost:3001"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
