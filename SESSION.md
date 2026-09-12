# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada al pla (fases 0–8). Cosmètica / landing (fora del pla de fases).
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

A `fase/3-espais`:

- Landing merament informativa: accés al capçal (Registra / Inicia sessió); hero a ple ample amb foto lliure, overlay i copy de problema/solució; «Com funciona» amb captures reals; peu `© any Eduard Farinyes · Codi obert`.
- Fons del hero en carrusel (4 fotos, fos 7 s, «Atura el fons»; sense rotació si `prefers-reduced-motion`). Alternatives a `frontend/public/landing/opcions/`.
- Cosmètica prèvia: marca `text-2xl`, «Els espais», títol `Espais de {{ entityName }}`, Avisos només coordinador, resum de finestres per dies, peu sticky, formulari de disponibilitat `max-w-5xl`.
- Avisos: arxivar (només llegits; llista sense arxivats). Purga als 21 dies (`archived_at`); ADR [0009](docs/adr/0009-purga-avisos-arxivats.md). Lifespan arrencada + 24 h; tests amb `enable_maintenance=False`.

Vitest 104+ verds (landing/carrusel); `vue-tsc --noEmit` verd.

## Següent tasca

Continuar cosmètica (jornada nova): polir UI restant (contrastos, calendaris, empty states, mòbil) un cop validat el carrusel de la landing.

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
- [0009](docs/adr/0009-purga-avisos-arxivats.md) — acceptat (purga 21 dies des de `archived_at`)

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` inclou `/avisos` i `/analisi`.
- Deute conscient: split de `useCalendariReserves` / drag = si el composable torna a créixer. CSV d’anàlisi = backlog.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; fotos a `frontend/public/landing/` (hero + opcions + captures).
