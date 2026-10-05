# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada (fases 0–8). Refactorització del frontend tancada. La dockerització de l’Alpha és una peça a part, a la branca `feat/docker-caddy-sqlite`. No és una fase nova del pla.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

Graella del calendari refeta a `feat/docker-caddy-sqlite`, commitejada i pujada a `origin`. La causa era que els límits s’arrodonien a hores senceres (Schedule-X 4.8.0 només n’accepta) i el sobrant es retallava amb CSS: la graella visible no era la de Schedule-X.

- `configGraella`: inici més d’hora − 30 min i fi més tardana + 30 min, una vegada, sense arrodonir. Tall al dia (00:00–24:00). 18:00–21:00 + 19:00–22:30 → 17:30–23:00; tancament 23:59 → 24:00.
- `graellaDeLaVista`: a la setmana, totes les finestres de les sales de la vista; en un dia, només les d’aquell dia, per als dos rols. Les sales de cada rol no canvien (`finestresPerRol`).
- Pedaç de Schedule-X amb `patch-package` (ADR [0013](docs/adr/0013-pedac-schedule-x-limits-minuts.md)): `HH:mm` a la validació i eix al minut exacte. Versió fixada a 4.8.0. `docker/frontend.Dockerfile` copia `frontend/patches` abans de `npm ci`.
- Fora el CSS de retall (`--retall-*`, `translateY`, alçada calculada). Es manté el gris dels marges i el `max-height` de la caixa.
- `docs/14-ui-ux.md` actualitzat. FastAPI sense canvis.

Vitest 184, `vue-tsc` i `vite build` nets (el build cal fora del sandbox per workbox). `npm ci` en net aplica el pedaç. Docker no estava en marxa: la imatge no s’ha construït.

Navegador local, entitat de prova «Entitat Graella» (`graella.resp@example.com` / `graella.coord@example.com`, contrasenya `graella123`): responsable 17:30–23:00, 17:30–23:30 amb tres sales i 17:30–24:00 amb un tancament a 23:59; coordinador Sala 1 17:30–21:30 i Sala 2 18:30–23:00; dia del dimarts 18:30–23:00. Crear, canviar l’horari i anul·lar funcionen. L’arrossegament real no s’ha pogut provar al navegador (cobert per test de la conversió). Còpia de la base local d’abans: `backups/espais-abans-graella-2026-10-05.sqlite3`.

De la llista del desplegament anterior, en local el dijous 8 surt i la línia entre dies hi és. L’eix des de les 07:30 de Capgrossos apunta a una altra sala activa amb horari 08:00–22:00 a les dades del VPS (no comprovat).

## Següent tasca

Desplegar `feat/docker-caddy-sqlite` al VPS (`git pull` i `docker compose up -d --build`) i validar-hi la graella amb les sales reals. No es fusiona a `main`. No s’esborra `backup/pre-dockeritzacio`.

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
- [0013](docs/adr/0013-pedac-schedule-x-limits-minuts.md) — acceptat (pedaç local de Schedule-X 4.8.0 per a límits amb minuts)

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
- Deute d’aquesta sessió: el pedaç de Schedule-X és deute arquitectònic conscient, a l’ADR 0013. Deute d’implementació: amb una finestra de 900 px d’alt, la caixa del calendari (`max-height: calc(100dvh - 16rem)`) encara deixa uns píxels de desplaçament intern (7 px amb 17:30–23:00, 51 px amb 17:30–23:30); no s’ha tocat. La decisió d’infraestructura continua sent l’ADR 0012. Caddy corre com a root dins la imatge oficial per poder escoltar 80/443; el backend no.
