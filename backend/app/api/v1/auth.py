"""Sign-in for admins (email + password; no Google sign-in, no public sign-up)."""
from fastapi import APIRouter

from app.api.deps import DB, CurrentAdmin
from app.api.schemas import AdminOut, ChangePasswordIn, LoginIn, TokenOut
from app.application.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: DB):
    token, admin = AuthService(db).login(body.email, body.password, body.remember)
    return TokenOut(access_token=token, admin=AdminOut.model_validate(admin))


@router.get("/me", response_model=AdminOut)
def me(admin: CurrentAdmin):
    return admin


@router.post("/change-password", status_code=204)
def change_password(body: ChangePasswordIn, admin: CurrentAdmin, db: DB):
    AuthService(db).change_password(admin, body.current_password, body.new_password)
