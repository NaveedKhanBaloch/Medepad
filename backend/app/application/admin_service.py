"""Use cases: managing admins. Only the super admin may add admins, switch them off/on and set their passwords.

There is no public sign-up. Every admin changes their own password in Settings (old password + new password).
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import check_password_rules, hash_password
from app.domain.errors import ConflictError, DomainError, NotFoundError, PermissionDeniedError
from app.infrastructure.db.models import ROLE_ADMIN, Admin
from app.infrastructure.repositories import AdminRepository

ONLY_SUPER = "Only the super admin can manage admins."


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AdminRepository(db)

    @staticmethod
    def _require_super(by: Admin) -> None:
        if not by.is_super_admin:
            raise PermissionDeniedError(ONLY_SUPER)

    def list(self, by: Admin) -> list[Admin]:
        self._require_super(by)
        return self.repo.list()

    def create(self, name: str, email: str, password: str, by: Admin) -> Admin:
        self._require_super(by)
        email = email.strip().lower()
        if self.repo.by_email(email):
            raise ConflictError("An admin with this email already exists.")
        check_password_rules(password)
        admin = self.repo.add(Admin(name=name.strip(), email=email, password_hash=hash_password(password),
                                    role=ROLE_ADMIN, created_by_id=by.id))
        self.db.commit()
        return admin

    def update(self, admin_id: int, by: Admin, name: str | None = None, is_active: bool | None = None,
               password: str | None = None) -> Admin:
        self._require_super(by)
        admin = self.repo.get(admin_id)
        if admin is None:
            raise NotFoundError("Admin not found.")
        if name is not None and name.strip():
            admin.name = name.strip()
        if is_active is not None and is_active != admin.is_active:
            if admin.is_super_admin:
                raise DomainError("The super admin account cannot be switched off.")
            admin.is_active = is_active
        if password:
            if admin.id == by.id:
                raise DomainError("Change your own password in Settings (with your current password).")
            check_password_rules(password)
            admin.password_hash = hash_password(password)
            admin.failed_logins, admin.locked_until = 0, None
        self.db.commit()
        return admin
