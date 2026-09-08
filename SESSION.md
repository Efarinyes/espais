# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 3 — Espais (en curs; CreateSpace + ListSpaces fets)
- **Següent fase:** 3 continua fins al criteri CRUD; després 4 — Coordinadors i reserves

## Darrera feina

A `fase/3-espais`: `CreateSpace` i `ListSpaces`. Nom únic per `(entity_id, nom)` (case-insensitive); el mateix nom entre entitats és permès. Aforament > 0. Queries sempre amb `entity_id` de la sessió. Disponibilitat v1: finestres 08:00–22:00 tots els dies (sense editor encara). Alembic `0002_spaces`. `POST`/`GET /espais`.

Front: empty state accionable «Defineix el primer espai» → `/espais/nou`; llista a `/espais`. pytest 36, Vitest 8.

La Fase 3 **no** es tanca: falta `UpdateSpace` / desactivar.

## Següent tasca

`UpdateSpace` (TDD): editar nom/aforament/equipament acotat a l’entitat; desactivar ≠ esborrar historial.

Skills: `spaces-definition`, `domain-model`, `backend-fastapi`, `frontend-vue`, `ui-ux-mobile`, `testing-quality`.

Remot GitHub: encara sota demanda.

## Blockers

Cap. Si la SQLite local ja existia: `alembic upgrade head`.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat

Cap ADR nou.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Provar: `alembic upgrade head`; API `http://127.0.0.1:8000`; front `http://127.0.0.1:5173`.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global.
- UI: colors i tipografia ajornats.
- Revisió SOLID: `CreateSpace` / `ListSpaces` separats; router sense unicitat; `entity_id` de la membership. Deute: `UpdateSpace`, editor de finestres, invitacions = Fase 4.
