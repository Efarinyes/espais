---
name: backend-fastapi
description: Backend FastAPI en capes amb micromamba, SQLAlchemy 2 i casos d’ús SOLID. Use when creating or changing Python API, use cases, repositories, environment.yml, Alembic, or conda env. Never use .venv.
---

# Backend FastAPI — Espais

## Entorn

Micromamba/conda (`environment.yml`, env `espais`). **Mai** `.venv` ni `python -m venv`.

## Capes

`api` → `usecases` → `domain` + `ports` ← `adapters`

Routers prims. Un cas d’ús per acció. `entity_id` a totes les queries de negoci.

## Checklist

- [ ] Dependències al conda env, no pip solt sense llista
- [ ] Cas d’ús testejable amb fakes
- [ ] Sense lògica de solapament/mail al router
- [ ] SQLite dev; tipus compatibles amb PostgreSQL
- [ ] Clock i UUID injectats si cal determinisme
- [ ] Ruff quan existeixi el projecte Python

## Recursos

- [docs/10-arquitectura.md](../../../docs/10-arquitectura.md)
- [docs/11-stack.md](../../../docs/11-stack.md)
- [docs/12-solid-estandards.md](../../../docs/12-solid-estandards.md)
