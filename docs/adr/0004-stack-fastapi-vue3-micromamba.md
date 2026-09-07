# ADR 0004 — FastAPI, Vue 3 i micromamba

- **Estat:** acceptat
- **Data:** 2026-09-07

## Context

Es vol backend Python lleuger, front modern mobile-first, i entorns reproduïbles sense `.venv`. Vue no s’instal·la globalment.

## Decisió

- Backend: FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2 + pytest, entorn conda **micromamba** (`environment.yml`, nom `espais`).
- Frontend: Vue 3 + Vite + Composition API + Pinia + Vue Router, dependències només a `frontend/`.
- Dev DB: SQLite, esquema compatible amb PostgreSQL.
- Analogia Angular: composables + `provide`/`inject`.

## Conseqüències

- Documentar com crear l’entorn a README quan existeixi `environment.yml` (Fase 1).
- CI ha d’usar micromamba o imatge equivalent, no `python -m venv`.
- Vue CLI / paquets globals queden prohibits al protocol.

## Alternatives rebutjades

- Django monolític, Flask sense tipus, Angular, `.venv` per desenvolupador.
