# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 2 — Identitat i tenant (en curs; tros 1 fet)
- **Següent fase:** 2 continua (sessió + UI); no tancar la fase fins al criteri de `PLA-TREBALL.md`

## Darrera feina

Publicat l’esquelet: merge local `fase/1-esquelet` → `main` (fast-forward, `77bb98a`), sense push. Branca `fase/2-identitat`.

`RegisterEntity` atòmic (entitat + usuari + membership `responsible`): tests amb fakes (camí feliç, email duplicat, rollback sense òrfena, nom d’entitat no únic global) i adaptador SQLAlchemy/SQLite + Alembic `0001_identity`. Router prim `POST /registre` (201/400/409). Hash bcrypt. `entity_id` a la membership. Tipologia string lliure. Sense `CreateSpace`, invitacions, login ni front.

`micromamba run -n espais pytest`: 14 verds. Ruff net. `bcrypt` documentat a `environment.yml` (ja era a l’env).

## Següent tasca

Tros 2 de la Fase 2 — no tota la fase d’una vegada:

1. Autenticació / sessió i “veure només la seva entitat” (criteri de fase).
2. Front: registre + empty state guiat (`frontend-vue`, `ui-ux-mobile`).

Skills: `registration-onboarding`, `backend-fastapi`, `frontend-vue`, `testing-quality`, `ui-ux-mobile`, `session-close`.

Remot GitHub: encara sota demanda.

## Blockers

Cap.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat

Cap ADR nou: persistència i capes ja eren a 0001/0004.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix. Esquema: `alembic upgrade head` (SQLite `./espais.sqlite3` per defecte).
- Front: `cd frontend && npm test`. Vue no global.
- Revisió SOLID (tros 1): un cas d’ús; router sense negoci; ports + adaptadors; `list_all` només per tests d’identitat; unicitat d’email és de plataforma (no tenant). Deute conscient al tros 2: sessió/guard i UI. Invitació de coordinadors = Fase 4.
