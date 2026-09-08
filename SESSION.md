# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 3 — Espais (en curs)
- **Següent fase:** 3 — Espais (pendent de criteri: CRUD acotat a l’entitat)

## Darrera feina

Fase 2 publicada a `main` (fast-forward `62de9c2`, sense push). Branques `fase/1-esquelet` i `fase/2-identitat` esborrades (ja són a `main`). Treball a `fase/3-espais`.

Identitat: `RegisterEntity` atòmic, `AuthenticateUser`, `ResolveSession` (membership, no `entity_id` del token). `POST /registre` inicia sessió; `POST`/`GET /sessio`. Front: `/registre`, `/iniciar-sessio`, inici amb CTA «Defineix el primer espai» (desactivada fins a `CreateSpace`).

Disseny visual (colors, tipografia, paleta): **ajornat** a sessions posteriors; no bloqueja la Fase 3. Sense ADR: no canvia el producte, només el poliment de UI (Fase 8 / `ui-ux-mobile`).

## Següent tasca

`CreateSpace` (TDD): nom únic per entitat, aforament, empty state actionable («Defineix el primer espai»).

Skills: `spaces-definition`, `domain-model`, `backend-fastapi`, `frontend-vue`, `ui-ux-mobile`, `testing-quality`.

Remot GitHub: encara sota demanda.

## Blockers

Cap.

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
- Provar l’app: API `http://127.0.0.1:8000`, front `http://127.0.0.1:5173` (proxy Vite). Esquema: `alembic upgrade head`. `micromamba run -n espais uvicorn app.main:app --app-dir backend`.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global.
- UI: tokens CSS actuals són provisionals; colors i tipografia es decideixen més endavant.
- Revisió SOLID (Fase 2): un cas d’ús per acció; routers només HTTP; vistes primes + composables; Pinia només sessió. Deute conscient: CTA d’espais desactivada (Fase 3); invitacions = Fase 4; poliment visual ajornat.
