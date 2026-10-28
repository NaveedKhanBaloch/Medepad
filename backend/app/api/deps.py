"""Shared dependencies: database session and the signed-in admin."""
from typing import Annotated

import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.domain.errors import AuthenticationError
from app.infrastructure.db.models import Admin
from app.infrastructure.db.session import get_db

DB = Annotated[Session, Depends(get_db)]


def current_admin(db: DB, authorization: Annotated[str | None, Header()] = None) -> Admin:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("Please sign in.")
    try:
        payload = decode_access_token(authorization.split(" ", 1)[1].strip())
    except jwt.PyJWTError as exc:
        raise AuthenticationError("Your session has ended. Please sign in again.") from exc
    admin = db.get(Admin, int(payload["sub"]))
    if admin is None or not admin.is_active:
        raise AuthenticationError("Please sign in.")
    return admin


CurrentAdmin = Annotated[Admin, Depends(current_admin)]
