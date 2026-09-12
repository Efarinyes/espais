# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada al pla (fases 0–8). Backlog explícit.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

A `fase/3-espais`:

- Fase 8: menú compacte a mòbil (`details` + `Menú`); enllaços complets des de `lg`. Skip-link «Ves al contingut». Empty del calendari amb CTA si ets responsable. Anàlisi: targetes per espai a mòbil, taula a `md+`; `label` del mes. Modal del calendari amb animació curta. Login: copy sense «del responsable».
- `mesEnCursTimeZone` + `FUS_HORARI_PER_DEFECTE` (Europe/Madrid a v1).
- No s’ha partit `useCalendariReserves`.

Vitest 99 verds; `vue-tsc --noEmit` verd.

## Següent tasca

Backlog o publicar GitHub, només sota demanda. PWA: instal·lar des d’un mòbil real (ADR 0006 ja a l’esquelet).

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

Cap ADR nou.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` inclou `/avisos` i `/analisi`.
- Deute conscient: split de `useCalendariReserves` / drag = si el composable torna a créixer. CSV d’anàlisi = backlog.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
