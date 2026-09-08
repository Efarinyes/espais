# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 4 — Coordinadors i reserves (al disc: invitació, CreateReservation, calendari; no tancada: manca `architecture-solid`)
- **Següent fase:** 5 — Assistència (`RecordAttendance`), després de tancar 3+4 amb la revisió SOLID

## Darrera feina

A `fase/3-espais` (el producte ja ha passat d’espais a reserves; la branca no s’ha reanomenat):

- Espais: CRUD per entitat, finestres d’horari a l’alta/edició (`FinestresDisponibilitat`), el coordinador no crea ni edita (403 + UI).
- Coordinadors: `InviteCoordinator` / `AcceptInvitation` (Alembic 0003), UI convidar i `/invitar/:token`.
- Reserves: `CreateReservation` / `ListReservations` (Alembic 0004), solapament i finestres al back. UTC; TZ Europe/Madrid.
- Calendari Schedule-X: el coordinador entra per la targeta de l’espai (`?espai=`); el responsable veu totes les reserves (capçalera Calendari), color per espai i nom de qui ha reservat. Durada al modal (1 h per defecte, no només 30 min). Títols curts (Tu / Ocupat / nom).
- Calendari viu (ADR 0007): port `DisparadorCalendari`; adaptador polling ~20 s + refetch en tornar a la pestanya. Porta oberta a SSE/WebSocket (mateix `avisar()`, no reescriure Schedule-X).

Vitest 61 verds en tancar. pytest no s’ha reexecutat en aquest tancament.

Fase 3 i 4 **no** es tanquen al pla: falta `architecture-solid`.

## Següent tasca

Revisió `architecture-solid` (capes, SRP, deute) sobre espais + invitacions + reserves + calendari. Si surt neta: marcar Fase 3 i 4 fetes a `docs/PLA-TREBALL.md` i començar Fase 5 (`RecordAttendance`, compte d’assistents). Si hi ha deute: ADR o tasca al pla, no tancar.

Skills: `architecture-solid`, `testing-quality`; després `reservations-attendance`, `domain-model`.

Remot GitHub: encara sota demanda. Sense `origin`.

## Blockers

Cap. API `http://127.0.0.1:8000`; front `http://127.0.0.1:5173`.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat
- [0006](docs/adr/0006-tailwind-daisy-pwa.md) — acceptat
- [0007](docs/adr/0007-calendari-polling.md) — acceptat (polling v1; sockets = adaptador futur)

Cap ADR nou pendent. Sockets/SSE de calendari: no ara; el port ja existeix.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` per `/salut`, `/registre`, `/sessio`, `/espais`.
- Deute conscient: tancar Fase 3+4 amb SOLID; assistència i anul·lació/reprogramació (fases 5–6) encara no; ocupació «disponible / parcial» al calendari = millora, no blocker.
