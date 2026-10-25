"""Medepad Admin API (FastAPI, clean architecture). All endpoints are under /api/v1.

Run:  uvicorn app.main:app --reload --port 8001
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import admins, auth, dashboard, generations, templates
from app.core.config import get_settings
from app.domain.errors import DomainError
from app.infrastructure.db.seed import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # tables, the first admin and the starter templates
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan,
              docs_url="/api/v1/docs", openapi_url="/api/v1/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/api/v1/health", tags=["health"])
def health():
    return {"status": "ok"}


for r in (auth.router, admins.router, templates.router, generations.router, dashboard.router):
    app.include_router(r, prefix="/api/v1")
