# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 7 — Anàlisi (ocupació, reserves per espai, anul·lades, assistència mitjana)
- **Fase anterior:** 6 — Govern del responsable (feta: `RescheduleReservation`, `CancelReservationByResponsible`, avís in-app + correu)

## Darrera feina

A `fase/3-espais` (el producte ja ha passat d’espais a govern del responsable; la branca no s’ha reanomenat):

- Fase 5 i 6 al disc i marcades fetes al pla. Revisió `architecture-solid` de calendari, rols i avisos: neta a capes de negoci.
- El responsable no crea reserves (ADR 0008). Reprograma i anul·la; el coordinador reserva des de la targeta de l’espai (`?espai=`).
- Calendari: setmana de totes les reserves (responsable: totes; coordinador: les seves, i ocupat de l’espai si ve de la targeta). Graella des de l’obertura real dels espais, arrodonida a `HH:00` per Schedule-X (Sala Tècnica 17:30 pinta des de 17:00).
- Reprogramar pel responsable avisa el coordinador (in-app + `Notifier`); verd al responsable: «S’ha avisat el coordinador.» Badge d’avisos via el disparador de polling (ADR 0007).
- Neteja SRP: tret `vistaGlobal` (computed mort) i branques de dies tancats / «Tria un espai».
- Deute conscient (al pla, sense ADR): no partir `useCalendariReserves` ni extraure el drag de `CalendariView` ara; split = Fase 8 si cal.

Vitest 94 verds; `vue-tsc --noEmit` verd; pytest 134 verds.

## Següent tasca

Arrencar Fase 7: primer test del cas d’ús d’agregació (ocupació / reserves per espai de l’entitat, sempre amb `entity_id`). Skills: `session-start`, `domain-model`, `testing-quality`, `backend-fastapi`.

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
- [0008](docs/adr/0008-responsable-no-crea-reserves.md) — acceptat (el responsable reprograma i anul·la; no crea)

Cap ADR nou pendent. Sockets/SSE de calendari: no ara; el port ja existeix.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` inclou `/avisos`.
- Deute conscient: split de `useCalendariReserves` / drag = Fase 8 si el composable creix. Obertura/tancament del modal una mica bruscs: retoc CSS a Fase 8, no blocker. Ocupació «disponible / parcial» al calendari = millora, no blocker.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
