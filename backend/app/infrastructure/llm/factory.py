"""Chooses the note generator from settings (LLM_PROVIDER): gemini, openai, azure_openai or mock."""
from app.core.config import Settings
from app.domain.notes import NoteGenerator
from app.infrastructure.codes import get_code_lookup
from app.infrastructure.llm.gemini_client import GeminiClient
from app.infrastructure.llm.gemini_provider import GeminiNoteGenerator
from app.infrastructure.llm.mock_provider import MockNoteGenerator


def gemini_client(settings: Settings) -> GeminiClient:
    fallbacks = [m.strip() for m in settings.gemini_fallback_models.split(",") if m.strip()]
    return GeminiClient(settings.gemini_api_key, settings.gemini_model, fallbacks=fallbacks)


def build_note_generator(settings: Settings) -> NoteGenerator:
    provider = settings.llm_provider.lower()
    if provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("LLM_PROVIDER=gemini needs GEMINI_API_KEY in backend/.env")
        return GeminiNoteGenerator(gemini_client(settings), settings.llm_temperature)
    if provider in ("openai", "azure_openai"):
        from app.infrastructure.llm.openai_provider import OpenAINoteGenerator

        if provider == "openai":
            if not settings.openai_api_key:
                raise RuntimeError("LLM_PROVIDER=openai needs OPENAI_API_KEY in backend/.env")
            return OpenAINoteGenerator.openai(settings.openai_api_key, settings.openai_model, settings.llm_temperature)
        if not (settings.azure_openai_endpoint and settings.azure_openai_api_key and settings.azure_openai_deployment):
            raise RuntimeError("LLM_PROVIDER=azure_openai needs AZURE_OPENAI_ENDPOINT, _API_KEY and _DEPLOYMENT")
        return OpenAINoteGenerator.azure(
            settings.azure_openai_endpoint, settings.azure_openai_api_key, settings.azure_openai_deployment,
            settings.azure_openai_api_version, settings.llm_temperature,
        )
    return MockNoteGenerator(get_code_lookup())


def provider_info(settings: Settings) -> dict:
    provider = settings.llm_provider.lower()
    model = {
        "gemini": settings.gemini_model,
        "openai": settings.openai_model,
        "azure_openai": settings.azure_openai_deployment,
    }.get(provider, "keyword-mock")
    ready = {
        "gemini": bool(settings.gemini_api_key),
        "openai": bool(settings.openai_api_key),
        "azure_openai": bool(settings.azure_openai_api_key),
    }.get(provider, True)
    return {"provider": provider if provider in ("gemini", "openai", "azure_openai") else "mock", "model": model, "ready": ready}
