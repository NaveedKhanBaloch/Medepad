"""Admin sign-in (email + password only), account lock, several admins."""
from tests.conftest import login


def test_login_and_me(client, h):
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["email"] == "admin@medepad.local" and me["is_active"]


def test_wrong_password_gives_the_same_message_as_unknown_email(client):
    a = client.post("/api/v1/auth/login", json={"email": "admin@medepad.local", "password": "nope"})
    b = client.post("/api/v1/auth/login", json={"email": "nobody@medepad.local", "password": "nope"})
    assert a.status_code == b.status_code == 401 and a.json() == b.json()


def test_no_google_sign_in_and_no_public_sign_up(client):
    assert client.post("/api/v1/auth/google", json={}).status_code == 404
    assert client.post("/api/v1/auth/register", json={}).status_code == 404


def test_everything_needs_sign_in(client):
    for path in ("/api/v1/templates", "/api/v1/admins", "/api/v1/dashboard", "/api/v1/generations"):
        assert client.get(path).status_code == 401
    assert client.get("/api/v1/templates", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_several_admins_and_password_rules(client, h):
    weak = client.post("/api/v1/admins", json={"name": "Sara", "email": "sara@example.com", "password": "short"}, headers=h)
    assert weak.status_code == 400 and "10 characters" in weak.json()["detail"]
    r = client.post("/api/v1/admins", json={"name": "Sara", "email": "Sara@Example.com", "password": "Strong#Pass123"}, headers=h)
    assert r.status_code == 201 and r.json()["email"] == "sara@example.com"
    assert client.post("/api/v1/admins", json={"name": "X", "email": "sara@example.com", "password": "Strong#Pass123"}, headers=h).status_code == 409
    sara = login(client, "sara@example.com", "Strong#Pass123")
    assert len(client.get("/api/v1/admins", headers=sara).json()) >= 2
    # switch Sara off -> she can no longer sign in
    client.patch(f"/api/v1/admins/{r.json()['id']}", json={"is_active": False}, headers=h)
    assert client.post("/api/v1/auth/login", json={"email": "sara@example.com", "password": "Strong#Pass123"}).status_code == 401


def test_cannot_switch_off_yourself(client, h):
    me = client.get("/api/v1/auth/me", headers=h).json()
    r = client.patch(f"/api/v1/admins/{me['id']}", json={"is_active": False}, headers=h)
    assert r.status_code == 400


def test_account_locks_after_five_wrong_passwords(client, h):
    client.post("/api/v1/admins", json={"name": "Lock", "email": "lock@example.com", "password": "Strong#Pass123"}, headers=h)
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "lock@example.com", "password": "wrong"})
    r = client.post("/api/v1/auth/login", json={"email": "lock@example.com", "password": "Strong#Pass123"})
    assert r.status_code == 429 and "Try again" in r.json()["detail"]


def test_change_password(client, h):
    client.post("/api/v1/admins", json={"name": "Ali", "email": "ali@example.com", "password": "Strong#Pass123"}, headers=h)
    ali = login(client, "ali@example.com", "Strong#Pass123")
    bad = client.post("/api/v1/auth/change-password", json={"current_password": "wrong", "new_password": "Newer#Pass456"}, headers=ali)
    assert bad.status_code == 400
    ok = client.post("/api/v1/auth/change-password", json={"current_password": "Strong#Pass123", "new_password": "Newer#Pass456"}, headers=ali)
    assert ok.status_code == 204
    login(client, "ali@example.com", "Newer#Pass456")
