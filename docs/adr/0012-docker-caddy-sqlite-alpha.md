# ADR 0012 — Docker, Caddy i SQLite per a l’Alpha

- **Estat:** acceptat
- **Data:** 2026-09-29
- **Relacionat:** [0004](0004-stack-fastapi-vue3-micromamba.md), [0007](0007-calendari-polling.md), [0009](0009-purga-avisos-arxivats.md)

## Context

L’Alpha+ s’ha de poder provar al camp en un sol VPS, amb HTTPS i la base que ja té l’aplicació. El desenvolupament local continua amb micromamba i Vite. Les rutes Vue (`/espais`, `/avisos`, `/analisi`) coincideixen amb rutes FastAPI; un mateix origen no pot servir les dues sense una frontera.

No cal, per aquesta prova, una base de servidor, cues ni orquestració.

## Decisió

- Desplegament amb **Docker Compose** en **un sol VPS**. Dos serveis: `backend` (FastAPI / Uvicorn, un procés i un worker) i `web` (Caddy amb la SPA ja compilada).
- Només Caddy publica els ports 80 i 443. FastAPI escolta a la xarxa interna, sense port 8000 a l’amfitrió.
- El prefix extern `/api` el treu Caddy (i el proxy de Vite en desenvolupament) abans d’arribar a FastAPI. Les rutes internes de l’API no canvien.
- SQLite persistent al volum `espais_data`, fitxer `/data/espais.sqlite3`. Les migracions segueixen sent Alembic a l’arrencada (`bootstrap_session_factory`).
- `ESPAIS_SECRET` és obligatori quan `ESPAIS_ENV=production`. El valor de desenvolupament no serveix al contenidor.
- Sense PostgreSQL, Redis, Celery, Kubernetes ni registry d’imatges en aquesta Alpha.

## Conseqüències

- Operació: [`docs/17-desplegament-docker.md`](../17-desplegament-docker.md). Còpia i restauració: `tools/backup-sqlite.sh` i `tools/restore-sqlite.sh`.
- `environment.yml` continua sent l’entorn local. `backend/requirements.txt` és només el runtime de la imatge, amb versions fixades.
- El service worker no tracta `/api` com a navegació de la SPA. Les rutes Vue que abans es denegaven al fallback perquè coincidien amb l’API tornen a poder rebre `index.html`.
- Un sol worker: SQLite i el bucle de purga del lifespan no es comparteixen entre processos.
- El correu no canvia: si `ESPAIS_SMTP_HOST` és buit, es queda el notifier de log.

## Migració futura a PostgreSQL

Quan la prova de camp ho demani (concurrència d’escriptura, més d’un procés), es canvia `DATABASE_URL` i l’adaptador, amb una migració Alembic nova. Fins aleshores no s’introdueix PostgreSQL. El criteri és una necessitat real d’escriptura concurrent, no el desplegament en si.

## Alternatives rebutjades

- PostgreSQL, Redis o Kubernetes ja en l’Alpha.
- `vite preview` com a servidor de producció.
- Canviar el contracte intern de FastAPI per prefixar `/api` als routers.
- Incloure `espais.sqlite3` dins la imatge.
