"""Admin sign-in (email + password only), account lock, roles (one super admin manages the other admins)."""
from tests.conftest import login


def test_login_and_me(client, h):
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["email"] == "admin@medepad.local" and me["is_active"] and me["role"] == "super_admin"


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


def test_super_admin_adds_admins_with_password_rules(client, h):
    weak = client.post("/api/v1/admins", json={"name": "Sara", "email": "sara@example.com", "password": "short"}, headers=h)
    assert weak.status_code == 400 and "10 characters" in weak.json()["detail"]
    r = client.post("/api/v1/admins", json={"name": "Sara", "email": "Sara@Example.com", "password": "Strong#Pass123"}, headers=h)
    assert r.status_code == 201 and r.json()["email"] == "sara@example.com" and r.json()["role"] == "admin"
    assert client.post("/api/v1/admins", json={"name": "X", "email": "sara@example.com", "password": "Strong#Pass123"}, headers=h).status_code == 409
    # super admin switches Sara off -> she can no longer sign in; switches her on again
    client.patch(f"/api/v1/admins/{r.json()['id']}", json={"is_active": False}, headers=h)
    assert client.post("/api/v1/auth/login", json={"email": "sara@example.com", "password": "Strong#Pass123"}).status_code == 401
    client.patch(f"/api/v1/admins/{r.json()['id']}", json={"is_active": True}, headers=h)
    # super admin sets a new password for Sara
    assert client.patch(f"/api/v1/admins/{r.json()['id']}", json={"password": "Reset#Pass456"}, headers=h).status_code == 200
    login(client, "sara@example.com", "Reset#Pass456")


def test_normal_admin_cannot_manage_admins_but_can_work(client, h):
    created = client.post("/api/v1/admins", json={"name": "Omar", "email": "omar@example.com", "password": "Strong#Pass123"}, headers=h).json()
    omar = login(client, "omar@example.com", "Strong#Pass123")
    assert client.get("/api/v1/admins", headers=omar).status_code == 403
    assert client.post("/api/v1/admins", json={"name": "Z", "email": "z@example.com", "password": "Strong#Pass123"}, headers=omar).status_code == 403
    me = client.get("/api/v1/auth/me", headers=h).json()
    for body in ({"is_active": False}, {"password": "Hacked#Pass123"}):
        r = client.patch(f"/api/v1/admins/{me['id']}", json=body, headers=omar)
        assert r.status_code == 403 and "super admin" in r.json()["detail"]
    assert client.patch(f"/api/v1/admins/{created['id']}", json={"is_active": False}, headers=omar).status_code == 403
    # ...but everything else works for a normal admin
    assert client.get("/api/v1/templates", headers=omar).status_code == 200
    assert client.get("/api/v1/dashboard", headers=omar).status_code == 200
    ok = client.post("/api/v1/auth/change-password", json={"current_password": "Strong#Pass123", "new_password": "Omar#Newer456"}, headers=omar)
    assert ok.status_code == 204


def test_super_admin_cannot_be_switched_off_and_changes_own_password_in_settings(client, h):
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert client.patch(f"/api/v1/admins/{me['id']}", json={"is_active": False}, headers=h).status_code == 400
    own = client.patch(f"/api/v1/admins/{me['id']}", json={"password": "Other#Pass123"}, headers=h)
    assert own.status_code == 400 and "Settings" in own.json()["detail"]


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


def test_super_admin_email_setting_moves_the_role(client, h, monkeypatch):
    """SUPER_ADMIN_EMAIL picks the one super admin; everyone else becomes a normal admin."""
    from app.core import config
    from app.infrastructure.db.models import Admin
    from app.infrastructure.db.seed import sync_super_admin
    from app.infrastructure.db.session import SessionLocal

    client.post("/api/v1/admins", json={"name": "Boss", "email": "boss@example.com", "password": "Strong#Pass123"}, headers=h)
    monkeypatch.setenv("SUPER_ADMIN_EMAIL", "boss@example.com")
    config.get_settings.cache_clear()
    try:
        with SessionLocal() as db:
            sync_super_admin(db)
            db.commit()
            roles = {a.email: a.role for a in db.query(Admin)}
        assert roles["boss@example.com"] == "super_admin"
        assert sum(1 for r in roles.values() if r == "super_admin") == 1 and roles["admin@medepad.local"] == "admin"
    finally:
        monkeypatch.delenv("SUPER_ADMIN_EMAIL")
        config.get_settings.cache_clear()
        with SessionLocal() as db:  # back to the first admin for the other tests
            sync_super_admin(db)
            db.commit()
