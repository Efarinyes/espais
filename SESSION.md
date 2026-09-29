# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada (fases 0–8). Refactorització del frontend tancada.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Pas 8 del pla temporal del backend, fet (DT-4). Es pot desar `min_attendance` en crear i en editar. Qui no l’envia obté el comportament d’abans: `None` en crear, i el valor anterior en editar. `PATCH` amb `null` l’esborra. Un enter ≥ 0 es desa, també el 0. Un negatiu o un booleà és `InvalidSpaceError`. El frontend no s’ha tocat: el formulari segueix sense enviar el camp. Tests: 190 verds. Sense ADR nou.

El pla temporal `pla-implementacio-auditoria-backend.md` s’ha esborrat i no es rellegeix.

Deute d’aquesta sessió: d’implementació, tancat amb el pla. Cap ADR nou. Revisió `architecture-solid`: la validació viu al domini, al costat de la de nom i aforament. Cap capa nova. `min_attendance_set` és intern del command d’edició i no surt al JSON.

Entre feines només queda `main`. La refactorització del backend obre una branca per pas, es fusiona a `main` quan la suite passa, i la branca s’esborra.

## Següent tasca

No hi ha pas obert. La v1 i la refactorització del frontend segueixen tancades. El pla temporal del backend s’ha esborrat i no es rellegeix.

No la reobren: la vora del camp d’assistència del calendari, publicar l’app, ni el backlog de producte. El formulari d’aforament mínim no és aquest pla i no s’ha començat. No és una fase nova.

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
- Refactorització del frontend tancada (2026-09-28). El pla temporal del frontend s’esborra i no es rellegeix. La còpia doble dels colors no es fa. El calendari ja està partit. CSV d’anàlisi = backlog. La vora del camp d’assistència no és aquesta feina.
- Branques: entre feines només `main`. Una branca per pas del backend; fusió a `main` quan la suite passa; després s’esborra. Política a `docs/16-repositori.md`.
- Pla temporal del backend esborrat (2026-09-29) i no es rellegeix. Fets, en ordre: normalitzar el nom al domini; una validació de nom, aforament i equipament; una comprovació d’interval reservable; el `save` en memòria de reserva i d’avís insereix si no hi ha fila; l’email del correu surt de `UserRepository.get_by_id`; test API d’intervals adjacents (201); una sola classe de repositori d’espais en memòria; `min_attendance` opcional al JSON, amb defecte `None`.
- Fora d’aquell pla, i sense començar: formulari d’aforament mínim, anul·lació pel coordinador, `pending` / `rescheduled`, ports nous, un servei que agrupi casos d’ús.
- L’estat `rescheduled` no és una decisió oberta: en canviar l’horari, la reserva continua `confirmed` i l’avís porta l’interval antic i el nou. Un historial de canvis és backlog. L’assistència per nombre i l’avís suau d’aforament són el comportament volgut.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
