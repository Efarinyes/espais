"""Fàbrica de l’app FastAPI. Els routers no calculen negoci."""

from fastapi import FastAPI

from app.api.health import router as health_router


def create_app() -> FastAPI:
    application = FastAPI(title="Espais")
    application.include_router(health_router)
    return application


app = create_app()
