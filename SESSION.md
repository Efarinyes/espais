# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 1 — Esquelet (feta)
- **Següent fase:** 2 — Identitat i tenant (pendent)

## Darrera feina

Esquelet executable a `fase/1-esquelet`: `environment.yml` explícit (env `espais` aprofitat, ruff via `env update`), FastAPI `GET /salut` + pytest, Vue 3+TS a `frontend/` + Vitest, CI GitHub Actions. Sense remot. SOLID: capes buides, salut sense negoci.

## Següent tasca

Arrencar la **Fase 2 — Identitat i tenant** (un pas: `RegisterEntity` + tests, no tota la fase):

1. `session-start` + branca `fase/2-identitat` des de `fase/1-esquelet` o `main` quan es fusioni.
2. Cas d’ús `RegisterEntity` (TDD) i aïllament `entity_id`.
3. Sessió / auth mínima.
4. Front: registre i empty state guiat.

Skills: `registration-onboarding`, `backend-fastapi`, `frontend-vue`, `testing-quality`, `ui-ux-mobile`, `session-close`.

Remot GitHub: encara sota demanda.

## Blockers

Cap. PR de `fase/1-esquelet` a `main` quan es vulgui publicar (local).

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test`. Vue no global.
- Revisió SOLID Fase 1: routers prims; usecases/domain/ports/adapters buits a propòsit; Pinia només sessió.
