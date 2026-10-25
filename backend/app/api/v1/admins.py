"""Admins manage other admins."""
from fastapi import APIRouter

from app.api.deps import DB, CurrentAdmin
from app.api.schemas import AdminCreateIn, AdminOut, AdminUpdateIn
from app.application.admin_service import AdminService

router = APIRouter(prefix="/admins", tags=["admins"])


@router.get("", response_model=list[AdminOut])
def list_admins(_: CurrentAdmin, db: DB):
    return AdminService(db).list()


@router.post("", response_model=AdminOut, status_code=201)
def create_admin(body: AdminCreateIn, admin: CurrentAdmin, db: DB):
    return AdminService(db).create(body.name, body.email, body.password, admin)


@router.patch("/{admin_id}", response_model=AdminOut)
def update_admin(admin_id: int, body: AdminUpdateIn, admin: CurrentAdmin, db: DB):
    return AdminService(db).update(admin_id, admin, name=body.name, is_active=body.is_active, password=body.password)
