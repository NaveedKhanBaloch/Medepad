"""Azure OpenAI / OpenAI note generator."""
from openai import APIError, AzureOpenAI, OpenAI

from app.domain.errors import GenerationError
from app.domain.notes import GeneratedNote, NoteRequest
from app.infrastructure.llm.prompt_builder import build_messages, parse_note


class OpenAINoteGenerator:
    def __init__(self, client: OpenAI, model: str, provider_name: str, temperature: float = 0.2):
        self._client = client
        self.model_name = model
        self.provider_name = provider_name
        self._temperature = temperature

    @classmethod
    def azure(cls, endpoint: str, api_key: str, deployment: str, api_version: str, temperature: float):
        client = AzureOpenAI(azure_endpoint=endpoint, api_key=api_key, api_version=api_version)
        # With Azure, "model" is the *deployment name* created in Azure AI Foundry.
        return cls(client, deployment, "azure_openai", temperature)

    @classmethod
    def openai(cls, api_key: str, model: str, temperature: float):
        return cls(OpenAI(api_key=api_key), model, "openai", temperature)

    def generate(self, request: NoteRequest) -> GeneratedNote:
        try:
            response = self._client.chat.completions.create(
                model=self.model_name,
                messages=build_messages(request),
                temperature=self._temperature,
                response_format={"type": "json_object"},
            )
        except APIError as exc:
            raise GenerationError(f"Note generation failed: {exc.message}") from exc

        note = parse_note(response.choices[0].message.content or "", request)
        note.provider, note.model = self.provider_name, self.model_name
        return note
