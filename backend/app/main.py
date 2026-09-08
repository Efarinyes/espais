"""Fàbrica de l’app FastAPI. Els routers no calculen negoci."""

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker

from app.api.health import router as health_router
from app.api.register import router as register_router


def create_app(*, session_factory: sessionmaker | None = None) -> FastAPI:
    application = FastAPI(title="Espais")
    application.state.session_factory = session_factory
    application.include_router(health_router)
    application.include_router(register_router)
    return application


app = create_app()
