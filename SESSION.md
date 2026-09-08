# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 3 — Espais (següent)
- **Següent fase:** 3 — Espais (pendent); publicar Fase 2 a `main` (local) abans d’obrir `fase/3-espais`

## Darrera feina

Tros 2 de la Fase 2 a `fase/2-identitat`: autenticació i UI.

- `AuthenticateUser` + `ResolveSession`: la sessió es reconstrueix per `user_id` i membership (no es confia l’`entity_id` del token).
- `POST /sessio` (login), `GET /sessio` (principal), `POST /registre` inicia sessió (token HMAC).
- Front: `/registre`, `/iniciar-sessio`, empty state a `/` amb el nom de l’entitat i CTA «Defineix el primer espai» (desactivada fins a la Fase 3). Pinia de sessió, servei `provide`/`inject`.
- Tests: pytest 26, Vitest 5. Aïllament: cada token només veu la seva entitat. Verificat amb curl (registre A/B, login, 401, proxy Vite 409).

Criteri de Fase 2 (`PLA-TREBALL.md`): un responsable pot entrar i veure només la seva entitat. Complet. El botó d’espais espera `CreateSpace`.

## Següent tasca

1. Merge local `fase/2-identitat` → `main` (sense push) i branca `fase/3-espais`.
2. `CreateSpace` (TDD): nom únic per entitat, aforament, empty state actionable.

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

Cap ADR nou: token HMAC de sessió és detall d’adaptador (secret `ESPAIS_SECRET`, defecte insegur de dev).

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Provar l’app: API `http://127.0.0.1:8000`, front `http://127.0.0.1:5173` (proxy Vite). Esquema: `alembic upgrade head`. `micromamba run -n espais uvicorn app.main:app --app-dir backend`.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global.
- Revisió SOLID (Fase 2): un cas d’ús per acció (`RegisterEntity`, `AuthenticateUser`, `ResolveSession`); routers només HTTP; vistes primes + composables; Pinia només sessió. Deute conscient: CTA d’espais desactivada (Fase 3); invitacions = Fase 4. `GET /sessio` sense `entity_id` a la query perquè l’entitat surt de la membership (correcte).
