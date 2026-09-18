# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada al pla (fases 0–8). Cosmètica / landing (fora del pla de fases).
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Auditoria visual controlada (sense redesign):

- UI-001: menú d’admin del responsable plegat en `details` tancat sota `lg`; aside d’escriptori intacte.
- UI-002: errors de camp amb `aria-describedby` / `aria-invalid`.
- UI-003: teclat al selector de paleta (fletxes, Enter, Escape, un tab-stop).
- UI-004: Estadístiques al patró `fieldset` + `input`.
- UI-005: `shadow-md` + vora només al dropdown del capçal i al panell de paleta.
- UI-006: no centralitzar `min-h-11` (contracte de toc ≥ 44px).

## Següent tasca

Recórrer a Brave (escriptori i vista estreta) el tauler plegable i el contrast de paletes. `CalendariModal` encara usa `input-bordered` (fora de l’auditoria). Desplegament Alpha+ i botigues: aparcats.

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
- [0010](docs/adr/0010-aparença-paleta-mode.md) — esmenat per 0011 (tokens i contrast)
- [0011](docs/adr/0011-paleta-entitat-mode-personal.md) — acceptat (paleta d’entitat a BBDD; mode clar/fosc al navegador)

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Paleta d’entitat ADR 0011 (defecte Mar i cel; Clar/Fosc al capçal; colors al lateral del tauler); toc ≥ 44px (`min-h-11`). A mòbil el menú d’admin del responsable és un `details` tancat.
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` inclou `/avisos` i `/analisi`.
- Deute conscient: split de `useCalendariReserves` / drag = si el composable torna a créixer. CSV d’anàlisi = backlog.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
