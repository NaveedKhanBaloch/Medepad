import os
import tempfile

import pytest

# Tests use their own empty SQLite database and never call a real AI service.
_db_file = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_file}"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-at-least-32-bytes-long"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["GEMINI_API_KEY"] = ""
os.environ["SEED_ADMIN_EMAIL"] = "admin@medepad.local"
os.environ["SEED_ADMIN_PASSWORD"] = "Admin@12345"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def login(client, email="admin@medepad.local", password="Admin@12345"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def h(client):
    return login(client)
