# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada al pla (fases 0–8). Cosmètica / landing (fora del pla de fases).
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Tauler del responsable i identitat visual:

- Lateral: sense tipologia ni etiqueta de rol; salutació «Hola,» + nom; **Tria els colors** separat, just a sobre de Surt.
- Capçal: **Espais** + «Administració de {nom de l’entitat}» (sense article; el coordinador conserva l’insígnia).
- Lletra **Montserrat** restaurada (local, `@fontsource/montserrat`, pesos 400–700). ADR 0006 i docs d’UI actualitzats.

## Següent tasca

Alinear el camp Assistència de `CalendariModal` (`input-bordered` → `input w-full min-h-11`, com la resta de formularis). Desplegament Alpha+ i botigues: aparcats.

Remot GitHub: encara sota demanda. Sense `origin`.

## Blockers

Cap. API `http://127.0.0.1:8000`; front `http://127.0.0.1:5173`.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat
- [0006](docs/adr/0006-tailwind-daisy-pwa.md) — acceptat (esmenat: Montserrat local)
- [0007](docs/adr/0007-calendari-polling.md) — acceptat (polling v1; sockets = adaptador futur)
- [0008](docs/adr/0008-responsable-no-crea-reserves.md) — acceptat (el responsable reprograma i anul·la; no crea)
- [0009](docs/adr/0009-purga-avisos-arxivats.md) — acceptat (purga 21 dies des de `archived_at`)
- [0010](docs/adr/0010-aparença-paleta-mode.md) — esmenat per 0011 (tokens i contrast)
- [0011](docs/adr/0011-paleta-entitat-mode-personal.md) — acceptat (paleta d’entitat a BBDD; mode clar/fosc al navegador)

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Paleta d’entitat ADR 0011 (defecte Mar i cel; Clar/Fosc al capçal; Tria els colors al lateral, a sobre de Surt); toc ≥ 44px (`min-h-11`). A mòbil el menú d’admin del responsable és un `details` tancat. Lletra Montserrat local.
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` inclou `/avisos` i `/analisi`.
- Deute conscient: split de `useCalendariReserves` / drag = si el composable torna a créixer. CSV d’anàlisi = backlog. `CalendariModal` encara `input-bordered`.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
