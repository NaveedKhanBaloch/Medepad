"""Password hashing (bcrypt), password rules and sign-in tokens (JWT)."""
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings
from app.domain.errors import DomainError

ROLE = "admin"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def check_password_rules(password: str) -> None:
    """At least 10 characters with an upper-case letter, a lower-case letter, a number and a symbol."""
    rules = [
        (len(password) >= 10, "at least 10 characters"),
        (re.search(r"[A-Z]", password), "an upper-case letter"),
        (re.search(r"[a-z]", password), "a lower-case letter"),
        (re.search(r"\d", password), "a number"),
        (re.search(r"[^A-Za-z0-9]", password), "a symbol such as @ or #"),
    ]
    missing = [text for ok, text in rules if not ok]
    if missing:
        raise DomainError("The password needs " + ", ".join(missing) + ".")


def create_access_token(admin_id: int, remember: bool = False) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    lifetime = timedelta(days=settings.remember_me_days) if remember else timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": str(admin_id), "role": ROLE, "iat": now, "exp": now + lifetime}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("role") != ROLE:
        raise jwt.InvalidTokenError("not an admin token")
    return payload
