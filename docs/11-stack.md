# Stack

ADR: [0004](adr/0004-stack-fastapi-vue3-micromamba.md).

## Backend

- Python 3.12+ en entorn **micromamba/conda** (`environment.yml`). Nom de l’entorn: `espais`.
- **Mai** `.venv`, `virtualenv` ni instal·lació global de paquets del projecte.
- FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2, Alembic.
- SQLite en desenvolupament i tests; esquema compatible amb PostgreSQL (tipus, sense extensions SQLite-only a producció futura).
- pytest, httpx.

Activació prevista:

```bash
micromamba env create -f environment.yml
micromamba activate espais
```

## Frontend

- Vue 3 + Vite, **només al directori `frontend/`**.
- Instal·lació amb el package manager del projecte dins `frontend/` (`package.json` local). Mai `npm install -g vue`.
- Vue Router, Pinia (sessió), Composition API, `<script setup>`.
- Tests: Vitest + Vue Test Utils.
- Estils: CSS natiu amb design tokens (sense framework pesat a v1, tret que un ADR ho canviï). Mobile-first.

## Eines de qualitat

- Ruff (lint/format Python) quan s’activi la Fase 1.
- vue-tsc o JSDoc/TS al front: preferir **TypeScript** al Vue 3 del projecte (ADR implícit a Fase 1: sí TS).
- Pre-commit opcional; no saltar hooks.

## El que no s’usa a v1

- Django, Flask, Angular, React.
- `.venv`.
- Vue CLI global.
- ORM diferent de SQLAlchemy 2.
- Redis/cues pesades: reintents de correu amb flag i job simple, no Kubernetes.
