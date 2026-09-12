# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 8 — Poliment (mobile, a11y, empty/error, PWA en mòbil real)
- **Fase anterior:** 7 — Anàlisi (feta: `GetUsageSummary`, ocupació, anul·lades, assistència mitjana)

## Darrera feina

A `fase/3-espais`:

- Fase 7: cas d’ús `GetUsageSummary` (només responsable, sempre `entity_id`). Ocupació = hores `confirmed` / finestres del període (`domain/occupancy`). Anul·lades compten a part; assistència mitjana ignora les reserves sense `AttendanceRecord`.
- API `GET /analisi` i llista `GET /reserves?inclou_anulades=` (el calendari segueix sense anul·lades).
- UI `/analisi`: mes en curs, resum, taula per espai, empty «període sense dades». Navbar Anàlisi només al responsable.
- Revisió `architecture-solid`: neta. El coordinador no depèn d’`AnalysisHttp`. Anul·lades «per qui» fora (no hi ha `cancelled_by`).

pytest 145 verds; Vitest 99 verds; `vue-tsc --noEmit` verd.

## Següent tasca

Arrencar Fase 8: recorregut mobile dels fluxos crítics (registre, espais, reserva, anul·lació, anàlisi) i empty/error. Skills: `session-start`, `ui-ux-mobile`, `architecture-solid`, `testing-quality`.

Remot GitHub: encara sota demanda. Sense `origin`.

## Blockers

Cap. API `http://127.0.0.1:8000`; front `http://127.0.0.1:5173`. El login interactiu al navegador de l’agent va quedar bloquejat; la ruta `/analisi` sense sessió redirigeix a iniciar sessió.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat
- [0006](docs/adr/0006-tailwind-daisy-pwa.md) — acceptat
- [0007](docs/adr/0007-calendari-polling.md) — acceptat (polling v1; sockets = adaptador futur)
- [0008](docs/adr/0008-responsable-no-crea-reserves.md) — acceptat (el responsable reprograma i anul·la; no crea)

Cap ADR nou. Distingir anul·lació responsable vs coordinador a l’anàlisi: no ara.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` inclou `/avisos` i `/analisi`.
- Deute conscient: split de `useCalendariReserves` / drag = Fase 8 si el composable creix. Obertura/tancament del modal una mica bruscs: retoc CSS a Fase 8. CSV d’anàlisi = backlog.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
