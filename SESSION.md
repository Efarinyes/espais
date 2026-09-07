# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 0 — Bíblia (feta)
- **Següent fase:** 1 — Esquelet (pendent)

## Darrera feina

Protocol de tancament: `session-close` escriu `SESSION.md` i **sempre** aplica `repo-github` (mode tancament), independent dels commits de la sessió. Repositori local a `main`; sense `origin`. Producte intern i gratuït; autoservei ciutadà = backlog.

## Següent tasca

Arrencar la **Fase 1 — Esquelet** (un pas: branca + entorn):

1. `session-start` + `repo-github`: branca `fase/1-esquelet` des de `main`.
2. `environment.yml` micromamba (env `espais`, mai `.venv`).
3. FastAPI mínim + tests pytest.
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
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat

Cap ADR nou. Git només local fins a demanda explícita.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Assistència v1: compte; extensible amb `AttendanceRecord.strategy`.
- Ús intern i gratuït. Sense cobrament al backlog ni al model.
- Actes oberts al públic: reserva del coordinador a v1.
- Backlog: transferència de responsable, diversos responsables, unió d’entitats, coordinador multi-entitat, autoservei ciutadà, assistència nominativa.
- Durant la sessió: `repo-github` preservar. Al final: `session-close` → `repo-github` tancament (sempre, perquè `SESSION.md` ha canviat).
