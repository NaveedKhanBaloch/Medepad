"""Use cases: more than one admin. Admins add other admins (there is no public sign-up)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import check_password_rules, hash_password
from app.domain.errors import ConflictError, DomainError, NotFoundError
from app.infrastructure.db.models import Admin
from app.infrastructure.repositories import AdminRepository


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AdminRepository(db)

    def list(self) -> list[Admin]:
        return self.repo.list()

    def create(self, name: str, email: str, password: str, by: Admin) -> Admin:
        email = email.strip().lower()
        if self.repo.by_email(email):
            raise ConflictError("An admin with this email already exists.")
        check_password_rules(password)
        admin = self.repo.add(Admin(name=name.strip(), email=email, password_hash=hash_password(password), created_by_id=by.id))
        self.db.commit()
        return admin

    def update(self, admin_id: int, by: Admin, name: str | None = None, is_active: bool | None = None,
               password: str | None = None) -> Admin:
        admin = self.repo.get(admin_id)
        if admin is None:
            raise NotFoundError("Admin not found.")
        if name is not None and name.strip():
            admin.name = name.strip()
        if is_active is not None:
            if admin.id == by.id and not is_active:
                raise DomainError("You cannot switch off your own account.")
            if not is_active and sum(1 for a in self.repo.list() if a.is_active and a.id != admin.id) == 0:
                raise DomainError("At least one admin must stay switched on.")
            admin.is_active = is_active
        if password:
            check_password_rules(password)
            admin.password_hash = hash_password(password)
            admin.failed_logins, admin.locked_until = 0, None
        self.db.commit()
        return admin
