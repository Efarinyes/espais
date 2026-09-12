# Stack

ADR: [0004](adr/0004-stack-fastapi-vue3-micromamba.md).

## Backend

- Python 3.12+ en entorn **micromamba/conda**. Nom de l’entorn: `espais`.
- **Mai** `.venv`, `virtualenv` ni instal·lació global de paquets del projecte.
- FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2, Alembic.
- SQLite en desenvolupament i tests; esquema compatible amb PostgreSQL (tipus, sense extensions SQLite-only a producció futura).
- Manteniment v1: bucle al lifespan (purga d’avisos arxivats, ADR [0009](adr/0009-purga-avisos-arxivats.md)). Sense Celery ni cron.
- pytest, httpx.

L’entorn local **ja existeix** (`micromamba/envs/espais`, Python 3.12, stack anterior a conda-forge). No es recrea.

`environment.yml` al repo (Fase 1) **documenta** aquest entorn amb dependències explícites (no un dump de tot el prefix). És la font de veritat del repositori; l’env local n’és la instància instal·lada.

```bash
# Entorn ja present (aquesta màquina): usar-lo
micromamba activate espais
# o: micromamba run -n espais pytest

# Només si `espais` NO existeix (CI, altra màquina)
micromamba env create -f environment.yml

# Alinear paquets nous (p. ex. ruff), mai create a sobre
micromamba env update -n espais -f environment.yml
```

Mai `micromamba env create` si l’entorn `espais` ja existeix.

## Frontend

- Vue 3 + Vite, **només al directori `frontend/`**.
- Instal·lació amb el package manager del projecte dins `frontend/` (`package.json` local). Mai `npm install -g vue`.
- Vue Router, Pinia (sessió), Composition API, `<script setup>`.
- Estils: **Tailwind CSS** + **DaisyUI**, tema custom paleta mediterrània (ADR [0006](adr/0006-tailwind-daisy-pwa.md)). Mobile-first. Toc ≥ 44px.
- PWA instal·lable (`vite-plugin-pwa`): esquelet cachejat; l’API cal xarxa.
- Tests: Vitest + Vue Test Utils.

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
- WebSocket/SSE de calendari a v1: el front té un port de disparador (ADR [0007](adr/0007-calendari-polling.md)); l’adaptador actual és polling HTTP.
