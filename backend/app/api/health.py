"""Ruta de salut: comprova que l’API respon. Sense lògica de negoci."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/salut")
def salut() -> dict[str, str]:
    return {"estat": "ok"}
