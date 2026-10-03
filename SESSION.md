# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada (fases 0–8). Refactorització del frontend tancada. La dockerització de l’Alpha és una peça a part, a la branca `feat/docker-caddy-sqlite`. No és una fase nova del pla.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Sessió de criteri, sense canvi de codi. El calendari que es veu a les captures no s’ha tocat. La branca segueix a `15171d5` (local i `origin`). El que hi ha desplegat encara resta una hora i arrodoneix l’obertura; això no és la regla acordada.

La regla, per implementar a la propera sessió, és aquesta. El coordinador, al telèfon i a l’ordinador, només veu els dies oberts i l’horari en què es pot reservar la sala que té seleccionada. El responsable, als dos, veu totes les sales: l’eix va de l’obertura més d’hora al tancament més tard. Exemple: sala 1 de 20:00 a 23:59 i sala 2 de 18:30 a 23:00 donen 18:30–23:59. Mitja hora abans i mitja hora després es pinten com a no reservables. Un dia es mostra si hi ha almenys una sala oberta. El dia seleccionat no es pinta sencer. El detall és al pla `calendari_pantalla_real` (marge de 30 minuts sobre l’hora real; Schedule-X només accepta vora `HH:00`; un tancament a les 23:59 es talla a les 24:00 i no salta de dia).

Passada d’UX de camp, a la mateixa branca, sense desplegar. A la pàgina pública el títol és «Qui té la sala, a quina hora, qui vindrà?»; en pantalles petites Clar / Fosc no hi és, i els dos enllaços d’accés van a sota del logo. Amb sessió, Clar / Fosc segueix al capçal, també al telèfon.

El calendari mostra una hora abans d’obrir i una després de tancar, esmorteïdes, sense saltar de dia. Al telèfon s’obre en un dia; a l’ordinador, en la setmana. Arrossegar la reserva es manté. En clicar-la, coordinador i responsable canvien el dia (només dies reservables), l’hora i el nombre d’assistents; la durada no canvia. El camp «Nombre d’assistents» té vora visible. El coordinador anul·la la seva sense avís (`CancelOwnReservation`). El responsable anul·la qualsevol i el coordinador rep l’avís. El responsable també pot desar el nombre a qualsevol reserva de l’entitat.

PWA: icones PNG 192 i 512, i el botó «Instal·la» només si el navegador ho permet. A l’iPhone, el text explica Comparteix i Afegeix a la pantalla d’inici.

Vitest 165, pytest 199, `vue-tsc` net. La pàgina pública s’ha vist a `http://127.0.0.1:5173` a 390 px (sense Clar / Fosc) i a 1280 px (amb Clar / Fosc).

El calendari ja no pinta el dia sencer. La graella és l’horari de l’espai més una hora abans i una després, només els dies oberts. Al telèfon, un dia usa el seu horari i saltar de dia va al dia obert següent o anterior. La caixa es desplaça per dins. La casella no porta text: el color és la sala i, per al responsable, el tramat és el coordinador. El coordinador veu la franja ocupada sense el nom. La sessió local de prova no tenia espais (i el token no valia contra l’API de desenvolupament), així que la graella no s’ha vist a pantalla; les hores, els dies i el tramat els cobreixen els tests.

Dockerització de l’Alpha+ per a proves de camp (ADR 0012). Caddy serveix la SPA i fa de proxy de `/api` cap a FastAPI sense aquest prefix. Les rutes internes de l’API no canvien. SQLite persistent al volum `espais_data` (`/data/espais.sqlite3`). Alembic segueix a l’arrencada. Un sol worker. El port 8000 no es publica. `ESPAIS_SECRET` és obligatori amb `ESPAIS_ENV=production`.

Abans de tocar res, `main` es va copiar a `backup/pre-dockeritzacio` (local i `origin`), commit `7d3f474`. Aquesta branca no s’esborra.

Verificat: pytest 195, Vitest 158, build del front, `docker compose` config/build/up, `GET /api/salut` amb 200 i `{"estat":"ok"}`, ruta Vue `/iniciar-sessio` amb l’HTML de la SPA, dada que sobreviu a un `stop`/`up`, restauració SQLite, reinici del backend sense tornar a aplicar migracions, usuari del backend `espais` (uid 10001), service worker amb denylist `/api` i `fetch('/api/salut')` que torna JSON.

## Següent tasca

Implementar la graella acordada, a `feat/docker-caddy-sqlite`, sense fusionar a `main`. Primer els tests de `frontend/src/disponibilitat.spec.ts`: marge de 30 minuts sobre l’hora real, no 60 després d’arrodonir. Després [configGraella](frontend/src/disponibilitat.ts) i [CalendariView.vue](frontend/src/views/CalendariView.vue): el coordinador usa la sala seleccionada (al telèfon, l’horari d’aquell dia; a l’ordinador, l’obertura més d’hora i el tancament més tard d’aquesta sala); el responsable, telèfon i ordinador, usa l’envolupant de totes les sales actives. El gris és només el que queda fora de la franja reservable. No es toca el formulari de la sala ni el solapament.

Després, si es demana, pujar la branca i al VPS `docker compose up -d --build` a la carpeta del projecte. Fusionar a `main` només quan es demani. No esborrar `backup/pre-dockeritzacio`.

No es reobre: el formulari d’aforament mínim, ni el backlog de producte (llista d’espais, estadístiques, invitacions, altres formularis). No és una fase nova.

## Blockers

Cap. API de desenvolupament `http://127.0.0.1:8000`; front de desenvolupament `http://127.0.0.1:5173`. La pila Docker, si segueix en marxa, ocupa els ports 80 i 443 (`http://localhost`).

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
- [0012](docs/adr/0012-docker-caddy-sqlite-alpha.md) — acceptat (Compose, Caddy, SQLite, prefix `/api`, un VPS)

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Paleta d’entitat ADR 0011 (defecte Mar i cel; Clar/Fosc al capçal; Tria els colors al lateral del responsable, a sobre de Surt); toc ≥ 44px (`min-h-11`). Amb sessió el capçal és compartit (logo i mode). El lateral és per rol. A mòbil és un `details` tancat, amb el nom de l’entitat i una fletxa. Lletra Montserrat local.
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` és `/api`. Les rutes Vue ja no es deneguen pel nom.
- Refactorització del frontend tancada (2026-09-28). El pla temporal del frontend s’esborra i no es rellegeix. El `.docx` `docs/auditoria_SOLID_pla_refactoritzacio_frontend.docx` tampoc es rellegeix ni es commiteja. La còpia doble dels colors no es fa. El calendari ja està partit. CSV d’anàlisi = backlog.
- Branques: `main` segueix a `7d3f474`, igual que `backup/pre-dockeritzacio` i `origin/backup/pre-dockeritzacio`. `feat/docker-caddy-sqlite` és a `origin`. Política a `docs/16-repositori.md`.
- Pla temporal del backend esborrat (2026-09-29) i no es rellegeix. Fets, en ordre: normalitzar el nom al domini; una validació de nom, aforament i equipament; una comprovació d’interval reservable; el `save` en memòria de reserva i d’avís insereix si no hi ha fila; l’email del correu surt de `UserRepository.get_by_id`; test API d’intervals adjacents (201); una sola classe de repositori d’espais en memòria; `min_attendance` opcional al JSON, amb defecte `None`.
- Fora d’aquell pla, i sense començar: formulari d’aforament mínim, `pending` / `rescheduled`, ports nous, un servei que agrupi casos d’ús. L’anul·lació de la pròpia reserva pel coordinador ja hi és, sense correu.
- L’estat `rescheduled` no és una decisió oberta: en canviar l’horari, la reserva continua `confirmed` i l’avís porta l’interval antic i el nou. Un historial de canvis és backlog. L’assistència per nombre i l’avís suau d’aforament són el comportament volgut.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
- Docker local: `.env` (no versionat) amb `ESPAIS_DOMAIN=http://localhost`. Al VPS, el domini real sense esquema. Operació a `docs/17-desplegament-docker.md`. `environment.yml` continua sent l’entorn local; `backend/requirements.txt` és només el runtime de la imatge.
- Deute d’aquesta sessió: cap de nou, i cap ADR. La regla de la graella (mitja hora, coordinador per sala, responsable per envolupant) és la següent implementació, no un canvi de model. La decisió d’infraestructura continua sent l’ADR 0012. Caddy corre com a root dins la imatge oficial per poder escoltar 80/443; el backend no.
