# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada (fases 0–8). Refactorització del frontend tancada.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Pas 1 del pla temporal del backend, fet. `normalize_space_name` viu a `backend/app/domain/space.py` amb el mateix cos (`name.strip().casefold()`). L’importen `create_space`, `update_space` i els adaptadors d’espais (SQLAlchemy i memòria) i el d’espais de reserves en memòria. Cap fitxer de `app/adapters/` importa `app.usecases`, excepte `adapters/maintenance.py`, que continua cridant `PurgeArchivedNotifications`. Suite: 165 tests verds. Sense port, classe ni ADR nous. D-1 queda tancat.

El pla d’execució continua sent [pla-implementacio-auditoria-backend.md](pla-implementacio-auditoria-backend.md), a l’arrel. No és de la bíblia, no obre fase i no entra a Git. S’esborra en acabar l’últim pas, i llavors aquesta nota ha de dir que no es rellegeix.

Deute d’aquesta sessió: d’implementació, al pla i a les notes d’aquí. Cap ADR nou. Revisió `architecture-solid`: la direcció `adapters` → `domain` es recupera; el comportament no canvia.

Entre feines només queda `main`. La refactorització del backend obre una branca per pas, es fusiona a `main` quan la suite passa, i la branca s’esborra.

## Següent tasca

Pas 2 de [pla-implementacio-auditoria-backend.md](pla-implementacio-auditoria-backend.md): DT-2, una validació de nom, aforament i equipament a `domain/space.py`. Mateixos missatges d’error. El rol i la cerca de duplicat es queden a cada cas d’ús. Sense `*Service` ni ADR.

En acabar aquest pas, `session-close`: escriure aquí que el pas 2 està fet i deixar com a següent el pas 3. L’ordre sencer és a Notes. No executar-lo tot en una sola sessió.

No la reobren: la vora del camp d’assistència del calendari, publicar l’app, ni el backlog de producte. No és una fase nova.

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
- Pla temporal del backend: `pla-implementacio-auditoria-backend.md`. Es llegeix mentre «Següent tasca» l’apunti. No commitejar-lo. En acabar l’últim pas, esborrar-lo i deixar escrit aquí que no es rellegeix. Ordre, un pas per sessió:
  1. D-1: `normalize_space_name` a `domain/space.py`. Fet (pas 1).
  2. DT-2: una validació de nom, aforament i equipament a `domain/space.py`. És la següent tasca.
  3. DT-1: una comprovació d’interval reservable a `domain/reservation.py`. Pot anar abans o després del pas 2.
  4. L-1: el `save` in-memory de reserva i d’avís insereix si no hi ha fila, com SQLAlchemy.
  5. D-2: l’email de `lookup_email` surt de `UserRepository.get_by_id`. Pot anar abans o després del pas 4.
  6. Pas 8 del pla: test API d’intervals adjacents (201). Amb el pas 3, o quan es toquin reserves.
  7. DT-3: una sola classe de repositori d’espais in-memory. Només tests.
  8. DT-4: escriure `min_attendance` opcional. Únic pas que canvia el JSON. El defecte es queda `None`.
  Fora del pla: frontend, anul·lació pel coordinador, `pending` / `rescheduled`, ports nous, un servei que agrupi casos d’ús.
- L’estat `rescheduled` no és una decisió oberta: en canviar l’horari, la reserva continua `confirmed` i l’avís porta l’interval antic i el nou. Un historial de canvis és backlog. L’assistència per nombre i l’avís suau d’aforament són el comportament volgut.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
