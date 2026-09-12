"""Fàbrica de l’app FastAPI. Els routers no calculen negoci."""

import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.adapters.maintenance import run_archived_notification_purge_loop
from app.adapters.sqlalchemy.schema import bootstrap_session_factory
from app.adapters.system import SystemClock
from app.adapters.tokens import HmacTokenIssuer
from app.api.analisi import router as analisi_router
from app.api.avisos import router as avisos_router
from app.api.health import router as health_router
from app.api.invitations import router as invitations_router
from app.api.register import router as register_router
from app.api.reserves import router as reserves_router
from app.api.session import router as session_router
from app.api.spaces import router as spaces_router
from app.ports.identity import TokenIssuer


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    if getattr(application.state, "session_factory", None) is None:
        application.state.session_factory = bootstrap_session_factory()
    stop = asyncio.Event()
    task: asyncio.Task[None] | None = None
    if getattr(application.state, "enable_maintenance", False):
        task = asyncio.create_task(
            run_archived_notification_purge_loop(application.state.session_factory, stop)
        )
    try:
        yield
    finally:
        stop.set()
        if task is not None:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


def create_app(
    *,
    session_factory: sessionmaker | None = None,
    token_issuer: TokenIssuer | None = None,
    enable_maintenance: bool = False,
) -> FastAPI:
    application = FastAPI(title="Espais", lifespan=lifespan)
    application.state.session_factory = session_factory
    application.state.enable_maintenance = enable_maintenance
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
    application.include_router(invitations_router)
    application.include_router(spaces_router)
    application.include_router(reserves_router)
    application.include_router(avisos_router)
    application.include_router(analisi_router)
    return application


app = create_app(enable_maintenance=True)
