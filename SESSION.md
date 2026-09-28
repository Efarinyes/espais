# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada al pla (fases 0–8). Refactorització frontend (fora del pla de fases); cosmètica / landing aparcades.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Refactorització frontend, sessió 5 (poliment). Cap canvi de comportament. Cada pas és un commit local a la seva branca, apilat, sense push ni fusió a `main`.

- `feat/ref-05-analisi-demo` `dd3f0f4`: `mostraExemple`, `resumExemple` i `reservesExemple` viuen a `AnalisiView.vue`. `useAnalisi.ts` no importa `exempleAnalisi.ts` i només carrega dades reals. El test de la mostra és a `AnalisiView.spec.ts`.
- `feat/ref-06-app-shell` `d5f2773` (branca actual): `AppHeader.vue` i `AppFooter.vue`. `App.vue` orquestra el skip-link, el capçal, `RouterView` i el peu, i hi queda `useSincronitzaSessio`. `npm test` (158) i `vue-tsc -b` verds.

`main` segueix a `cc34def`, igual que `origin/main` (`https://github.com/Efarinyes/espais`). La fusió a `main` i el push esperen que tot el pla estigui verificat. Les branques anteriors (`feat/ref-01-http` … `feat/ref-03-accions-reserva`) segueixen apilades a sota.

Pendent de decisió, sense classificar ni tocar: les notes de deute de les fases 5, 6 i 8 del pla, i l’estat `rescheduled` (el codi el declara; la reprogramació v1 deixa la reserva en `confirmed`).

## Següent tasca

**`REF-07-PALETA-SSOT`** (opcional), branca nova des de `feat/ref-06-app-shell`: la paleta de l’entitat només s’emmagatzema a l’store de sessió; `aparenca` la llegeix i deixa d’haver-hi el `watch` que copia `sessio.palette`. Si no es fa, el pla de refactorització queda llest per verificar i fusionar a `main` (sense push fins que es demani).

Aparcats: camp Assistència de `CalendariModal` (`input-bordered`); desplegament Alpha+ i botigues.

Cada pas del pla: commit local a la seva branca. `main` i el remot, només quan el pla sencer estigui verificat.

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
- Pla de refactorització frontend (local, no git; esborrar el fitxer quan s’acabi):

  | Sessió | Objectiu | Tasques | Què fa |
  |---|---|---|---|
  | 1 | Fonaments | REF-01-HTTP, REF-08-DEPS | Feta. Branques `feat/ref-01-http`, `feat/ref-08-deps` |
  | 2 | Cohesió | REF-04-CALENDARI-DOMAIN, REF-02-ESPAIS-FORM | Feta. Branques `feat/ref-04-calendari-domain`, `feat/ref-02-espais-form` |
  | 3 | Calendari A | REF-03 fase A | Feta. Branca `feat/ref-03-creacio-reserva` |
  | 4 | Calendari B | REF-03 fase B | Feta. Branca `feat/ref-03-accions-reserva` |
  | 5 | Poliment | REF-05, REF-06 fets; REF-07 opcional | Següent: paleta SSOT, o verificar i fusionar |

- Deute conscient: el split de `useCalendariReserves` està fet (sessions 3–4). CSV d’anàlisi = backlog. `CalendariModal` encara `input-bordered`.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
