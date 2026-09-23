---
name: backend-fastapi
description: Backend FastAPI en capes amb micromamba, SQLAlchemy 2 i casos d’ús SOLID. Use when creating or changing Python API, use cases, repositories, environment.yml, Alembic, or conda env. Never use .venv.
---

# Backend FastAPI — Espais

## Entorn

Micromamba/conda, env `espais`. **Mai** `.venv` ni `python -m venv`.

Si `espais` ja existeix: usar-lo (`micromamba run -n espais`). No `env create` a sobre. `environment.yml` al repo pinnant deps explícites (Fase 1). Paquets nous (p. ex. ruff): `env update -n espais -f environment.yml`. `env create -f` només si l’entorn no existeix.

## Capes

`api` → `usecases` → `domain` + `ports` ← `adapters`

Routers prims. Un cas d’ús per acció. `entity_id` a totes les queries de negoci. No afegeixis capes ni un `*Service` calaix per encaixar SOLID; el nombre de línies no és el criteri.

## Checklist

- [ ] No recrear l’entorn `espais` si ja existeix
- [ ] Dependències al conda env i a `environment.yml` explícit (no dump de prefix)
- [ ] Cas d’ús testejable amb fakes
- [ ] Sense lògica de solapament/mail al router
- [ ] SQLite dev; tipus compatibles amb PostgreSQL
- [ ] Clock i UUID injectats si cal determinisme
- [ ] Ruff: `env update`, no `env create`

## Recursos

- [docs/10-arquitectura.md](../../../docs/10-arquitectura.md)
- [docs/11-stack.md](../../../docs/11-stack.md)
- [docs/12-solid-estandards.md](../../../docs/12-solid-estandards.md)
