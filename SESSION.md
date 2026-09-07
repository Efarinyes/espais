# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 0 — Bíblia (feta)
- **Següent fase:** 1 — Esquelet (pendent)

## Darrera feina

Procediment micromamba aclarit: aprofitar l’entorn existent `espais`; `environment.yml` (Fase 1) el documenta; `env create` només si no existeix. Cap esquelet d’app encara.

## Següent tasca

Arrencar la **Fase 1 — Esquelet**:

1. `session-start` + `repo-github`: branca `fase/1-esquelet` des de `main`.
2. Usar l’env micromamba `espais` (ja creat). Escriure `environment.yml` explícit a partir d’ell. No `env create`.
3. FastAPI mínim + tests pytest (`micromamba run -n espais pytest`).
4. Vue 3 + Vite **només a `frontend/`** + Vitest.
5. CI mínima de tests.

Skills Fase 1: `session-start`, `repo-github`, `backend-fastapi`, `frontend-vue`, `testing-quality`, `architecture-solid`, `session-close`.

Remot GitHub: quan es vulgui pujar, `repo-github` bootstrap remot.

## Blockers

Cap.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat (conseqüència: env local ja creat)
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Assistència v1: compte; extensible amb `AttendanceRecord.strategy`.
- Ús intern i gratuït. Sense cobrament al backlog ni al model.
- Actes oberts al públic: reserva del coordinador a v1.
- Backlog: transferència de responsable, diversos responsables, unió d’entitats, coordinador multi-entitat, autoservei ciutadà, assistència nominativa.
- Micromamba: si `espais` existeix, s’usa; `environment.yml` pinnat explícit; mai `.venv`.
- Durant la sessió: `repo-github` preservar. Al final: `session-close` → `repo-github` tancament.
