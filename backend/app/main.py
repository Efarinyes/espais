"""Fàbrica de l’app FastAPI. Els routers no calculen negoci."""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.adapters.sqlalchemy.schema import bootstrap_session_factory
from app.adapters.system import SystemClock
from app.adapters.tokens import HmacTokenIssuer
from app.api.health import router as health_router
from app.api.register import router as register_router
from app.api.session import router as session_router
from app.api.spaces import router as spaces_router
from app.ports.identity import TokenIssuer


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    if getattr(application.state, "session_factory", None) is None:
        application.state.session_factory = bootstrap_session_factory()
    yield


def create_app(
    *,
    session_factory: sessionmaker | None = None,
    token_issuer: TokenIssuer | None = None,
) -> FastAPI:
    application = FastAPI(title="Espais", lifespan=lifespan)
    application.state.session_factory = session_factory
    application.state.token_issuer = token_issuer or HmacTokenIssuer(
        os.environ.get("ESPAIS_SECRET", "espais-dev-insegur"),
        SystemClock(),
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(register_router)
    application.include_router(session_router)
    application.include_router(spaces_router)
    return application


app = create_app()
