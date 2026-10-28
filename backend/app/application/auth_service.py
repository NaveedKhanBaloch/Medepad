"""Use cases: admin sign-in (email + password only), account lock after repeated failures, change password."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import check_password_rules, create_access_token, hash_password, verify_password
from app.domain.errors import AuthenticationError, DomainError, TooManyRequestsError
from app.infrastructure.db.models import Admin
from app.infrastructure.repositories import AdminRepository

# Same answer for unknown email and wrong password, so nobody can find out which emails are admins.
WRONG = "Wrong email or password."
# Used to spend the same time on unknown emails as on real ones (no timing hints).
_DUMMY_HASH = hash_password("not-a-real-password-1A!")


def _aware(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.admins = AdminRepository(db)

    def login(self, email: str, password: str, remember: bool = False) -> tuple[str, Admin]:
        settings = get_settings()
        now = datetime.now(timezone.utc)
        admin = self.admins.by_email(email)
        if admin is None:
            verify_password(password, _DUMMY_HASH)
            raise AuthenticationError(WRONG)
        locked_until = _aware(admin.locked_until)
        if locked_until and locked_until > now:
            minutes = max(1, int((locked_until - now).total_seconds() // 60) + 1)
            raise TooManyRequestsError(f"Too many wrong passwords. Try again in {minutes} minute(s).")
        if not verify_password(password, admin.password_hash):
            admin.failed_logins += 1
            if admin.failed_logins >= settings.login_max_failures:
                admin.failed_logins = 0
                admin.locked_until = now + timedelta(minutes=settings.login_lock_minutes)
            self.db.commit()
            raise AuthenticationError(WRONG)
        if not admin.is_active:
            raise AuthenticationError("This admin account has been switched off. Ask another admin to switch it on.")
        admin.failed_logins, admin.locked_until, admin.last_login_at = 0, None, now
        self.db.commit()
        return create_access_token(admin.id, remember), admin

    def change_password(self, admin: Admin, current: str, new: str) -> None:
        if not verify_password(current, admin.password_hash):
            raise DomainError("The current password is not correct.")
        check_password_rules(new)
        admin.password_hash = hash_password(new)
        self.db.commit()
