# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada (fases 0–8). Refactorització del frontend tancada. La dockerització de l’Alpha és una peça a part, a la branca `feat/docker-caddy-sqlite`. No és una fase nova del pla.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

2026-10-27: el gra de DaisyUI deixa de demanar-se (`--fx-noise: none` a `frontend/src/styles.css`). La CSP de l’ADR 0015 no canvia. El test `test_el_gra_de_daisyui_no_es_demana_sota_la_csp` passa, amb els altres quatre de `test_vora_publica.py`. L’editor deixa de marcar `@plugin` (`.vscode/settings.json` i la recomanació de Tailwind CSS IntelliSense). El correctiu és a `feat/docker-caddy-sqlite` (`d044a44`) i a `backup/alpha-funcional` (`8d6bd9a`; la punta, amb aquesta nota, és `9178e98`). Les dues branques es pugen a `origin`. La prova visual és a la versió servida per Caddy, després de `git pull` i `docker compose up -d --build`, sense `down -v`.

2026-10-25: `backup/alpha-funcional` apuntava a `d1a36fa`. Des del 27 d’octubre el punt de retorn és `9178e98`. La feina i el desplegament segueixen a `feat/docker-caddy-sqlite`. La fusió a `main` queda per a la Beta, quan es canviï la configuració del servidor. No s’han esborrat `backup/pre-dockeritzacio` ni `backup/alpha-funcional`.

2026-10-21: l’Alpha de `https://espais.duckdns.org` serveix `feat/docker-caddy-sqlite`. El desplegament l’ha fet qui opera el VPS, amb `git pull` i `docker compose up -d --build`, sense `down -v`. Prova de camp:

- `/api/docs`, `/api/redoc` i `/api/openapi.json` responen 404. `/api/salut` respon 200. La SPA i l’API envien HSTS, `nosniff`, `DENY`, `strict-origin-when-cross-origin` i la CSP de l’ADR 0015.
- Sense SMTP, convidar un coordinador diu «Encara no enviem correu. Copia l’enllaç i envia’l tu. Caduca al cap de 14 dies.» Un email ja registrat continua dient «Aquest email ja està registrat.»
- El registre d’una entitat amb un correu ja en ús diu «No s’ha pogut completar el registre. Revisa les dades o inicia la sessió.»
- Surt en una finestra deixa oberta l’altra sessió del mateix usuari.
- Dues reserves de dos coordinadors de la mateixa entitat han funcionat. El calendari no s’ha canviat en aquesta peça.

2026-10-21: ADR 0014 implementat a `feat/docker-caddy-sqlite` i pujat a `origin` (`8667ff1`). `POST /sessio/tancament` desa el hash SHA-256 i l’`exp` a `revoked_tokens` (migració `0009_revoked_tokens`, després de `0008_entity_palette`). `require_session` rebutja aquell Bearer a qualsevol ruta autenticada. Un altre login del mateix usuari segueix sent vàlid. La purga, al bucle de manteniment existent, esborra només files amb `exp` ja vençuda. El client esborra `espais.sessio` i torna a `/` només si el servidor confirma el tancament; si no, conserva la sessió i ho diu. Pytest 215 i Vitest 188 verds.

2026-10-21: `POST /registre` ja no confirma que un email existeix (ADR 0016). La longitud mínima de 8 es manté. La complexitat extra i el límit d’intents són l’ADR 0017, proposat i sense codi. La invitació continua dient si l’email ja està registrat.

2026-10-21: vora pública de l’auditoria del 16 d’octubre, a `feat/docker-caddy-sqlite`, sense branca nova i sense tocar producció.

- ADR [0015](docs/adr/0015-capcaleres-i-openapi-produccio.md) acceptat. Caddy envia HSTS (180 dies, sense subdominis ni preload), `nosniff`, `DENY`, `strict-origin-when-cross-origin` i una CSP del mateix origen. Els estils en línia es queden; els scripts en línia, no. El tema inicial és `frontend/public/tema-inicial.js`.
- Amb `ESPAIS_ENV=production`, `/docs`, `/redoc` i `/openapi.json` responen 404. `/salut` segueix obert. Fora de producció la documentació es manté.
- `handle_path /api/*` i `reverse_proxy backend:8000` no han canviat. FastAPI continua sense el prefix.
- Tests: `test_vora_publica.py`, `test_health.py` i `test_session_secret.py` (10) verds. No s’ha aixecat Docker ni s’ha cridat el VPS: les capçaleres no s’han vist en un navegador.

2026-10-16: alineament de l’Alpha, sense codi d’aplicació i sense branca nova. Tot a `feat/docker-caddy-sqlite`.

- Assistència: no és un defecte del commit desplegable. Des de `90b8462` el responsable registra assistència a qualsevol reserva de l’entitat; el coordinador, només a la seva. `6b455b9` ja ho conté. Els 17 tests de `test_record_attendance.py` i `test_attendance_api.py` van passar. La regla del 9 de setembre (`3874a6e`) ja no és la vigent. No s’ha tocat el codi ni la reserva real.
- Docs desfasats respecte d’aquesta regla, sense corregir: `docs/02-glossari.md`, `docs/01-visio-producte.md` i el criteri de la fase 5 a `docs/PLA-TREBALL.md`. No hi ha ADR que la decideixi, a part del comportament ja escrit a `docs/04` i `docs/07`.
- README: la v1 està tancada (fases 0–8) i l’Alpha Docker és independent del pla. Commit `e695b18`, a `origin`.
- ADR [0014](docs/adr/0014-revocar-token-en-sortir.md) acceptat el 16 d’octubre i implementat el 21: Surt revoca el Bearer d’aquell navegador després de la resposta del servidor; la comprovació és a `require_session`. La llista és la taula `revoked_tokens` a la SQLite del volum `espais_data`.

Abans, 2026-10-06: auditoria SOLID i de deute de la graella (`6a05c0e`, `a1f01b4`, `6b455b9`), només de lectura. Veredicte: aprovat amb observacions. L’informe és a `AUDITORIA-CALENDARI.md`, a la rel, sense seguiment a Git (exclòs a `.git/info/exclude`). S’esborra quan s’hagin aplicat les recomanacions.

Abans d’aquesta auditoria: graella del calendari refeta a `feat/docker-caddy-sqlite`, commitejada i pujada a `origin`. La causa era que els límits s’arrodonien a hores senceres (Schedule-X 4.8.0 només n’accepta) i el sobrant es retallava amb CSS: la graella visible no era la de Schedule-X.

- `configGraella`: inici més d’hora − 30 min i fi més tardana + 30 min, una vegada, sense arrodonir. Tall al dia (00:00–24:00). 18:00–21:00 + 19:00–22:30 → 17:30–23:00; tancament 23:59 → 24:00.
- `graellaDeLaVista`: a la setmana, totes les finestres de les sales de la vista; en un dia, només les d’aquell dia, per als dos rols. Les sales de cada rol no canvien (`finestresPerRol`).
- Pedaç de Schedule-X amb `patch-package` (ADR [0013](docs/adr/0013-pedac-schedule-x-limits-minuts.md)): `HH:mm` a la validació i eix al minut exacte. Versió fixada a 4.8.0. `docker/frontend.Dockerfile` copia `frontend/patches` abans de `npm ci`.
- Fora el CSS de retall (`--retall-*`, `translateY`, alçada calculada). Es manté el gris dels marges i el `max-height` de la caixa.
- `docs/14-ui-ux.md` actualitzat. FastAPI sense canvis.

Vitest 184, `vue-tsc` i `vite build` nets (el build cal fora del sandbox per workbox). `npm ci` en net aplica el pedaç. Docker no estava en marxa: la imatge no s’ha construït.

Navegador local, entitat de prova «Entitat Graella» (`graella.resp@example.com` / `graella.coord@example.com`, contrasenya `graella123`): responsable 17:30–23:00, 17:30–23:30 amb tres sales i 17:30–24:00 amb un tancament a 23:59; coordinador Sala 1 17:30–21:30 i Sala 2 18:30–23:00; dia del dimarts 18:30–23:00. Crear, canviar l’horari i anul·lar funcionen. L’arrossegament real no s’ha pogut provar al navegador (cobert per test de la conversió). Còpia de la base local d’abans: `backups/espais-abans-graella-2026-10-05.sqlite3`.

Desplegat al VPS (`6b455b9`) i provat amb Capgrossos, «Sala pilars». La vista dia del divendres ja anava de 19:30 a 24:00. La setmana començava a les 07:30 perquè dissabte i diumenge tenien mal posada l’hora d’inici (les 08:00): era un error de dades, no de codi. Amb l’horari de la sala corregit, el calendari funciona com s’esperava, per al coordinador i per al responsable. La graella de la setmana fa servir l’obertura més d’hora de tots els dies: és el comportament volgut.

## Següent tasca

La feina continua a `feat/docker-caddy-sqlite`: és la branca que el servidor desplega després del `git pull` i de regenerar els contenidors. `backup/alpha-funcional` (`9178e98`, també a `origin`) és el punt de retorn. No es fusiona a `main` fins a la Beta, quan es canviï la configuració del servidor. No s’esborren `backup/alpha-funcional` ni `backup/pre-dockeritzacio`.

L’assistència amb `mine: false`, el README, les capçaleres/OpenAPI, el registre (ADR 0016), la invitació per correu i la revocació en sortir (ADR 0014) ja són a `origin` i s’han vist a l’Alpha. No es refan. La verificació de correu segueix al backlog. L’ADR 0017 continua proposat, sense codi. El correu d’invitació amb SMTP real no s’ha provat: al VPS no n’hi ha, i la prova ha estat el camí sense correu.

2026-10-21, decisions del prompt 6 aplicades, sense fase nova: el registre continua obert i la verificació de correu segueix al backlog (`docs/05`), també a l’Alpha i sense SMTP. La invitació s’envia si hi ha `ESPAIS_SMTP_HOST`; si no n’hi ha o l’enviament falla, es conserva i el responsable veu l’enllaç (`docs/05`, `docs/08`). Port propi, no el `Notifier` d’anul·lació. Caducitat 14 dies. La resta del backlog d’invitacions (llista, revocació) no es reobre.

Més endavant, no ara: la decisió de producte D1 del calendari (sala seleccionada pel coordinador i reserves pròpies fora d’aquell rang). No es canvia el codi fins que es decideixi. Tampoc no s’alineen glossari, visió i criteri de la fase 5 fins que es confirmi que la regla d’assistència del 3 d’octubre es manté.

Després, només quan es demani: les recomanacions «Després» de l’informe (vegeu Notes). En acabar-les, esborrar `AUDITORIA-CALENDARI.md` i les dues línies de `.git/info/exclude`.

Possibles millores, només si es demanen: que el formulari de disponibilitat no ompli 08:00–22:00 en activar un dia (l’origen probable de l’error de dades), i enfosquir a la setmana les hores tancades de cada dia quan els horaris varien segons el dia.

No es reobre: el formulari d’aforament mínim, ni el backlog de producte (llista d’espais, estadístiques, invitacions, altres formularis). No és una fase nova.

## Blockers

Cap. API de desenvolupament `http://127.0.0.1:8000`; front de desenvolupament `http://127.0.0.1:5173`. La base local conserva l’entitat de prova «Entitat Graella». La pila Docker, si segueix en marxa, ocupa els ports 80 i 443 (`http://localhost`).

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
- [0014](docs/adr/0014-revocar-token-en-sortir.md) — acceptat (Surt revoca el Bearer; la comprovació és a `require_session`)
- [0015](docs/adr/0015-capcaleres-i-openapi-produccio.md) — acceptat (capçaleres a Caddy; OpenAPI tancat en producció)
- [0016](docs/adr/0016-registre-no-confirma-email.md) — acceptat (`POST /registre` no diu que l’email existeix)
- [0017](docs/adr/0017-contrasenya-i-intents-proposat.md) — proposat, no vigent (complexitat de contrasenya i límit d’intents; no implementat)

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Paleta d’entitat ADR 0011 (defecte Mar i cel; Clar/Fosc al capçal; Tria els colors al lateral del responsable, a sobre de Surt); toc ≥ 44px (`min-h-11`). Amb sessió el capçal és compartit (logo i mode). El lateral és per rol. A mòbil és un `details` tancat, amb el nom de l’entitat i una fletxa. Lletra Montserrat local.
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` és `/api`. Les rutes Vue ja no es deneguen pel nom.
- Refactorització del frontend tancada (2026-09-28). El pla temporal del frontend s’esborra i no es rellegeix. El `.docx` `docs/auditoria_SOLID_pla_refactoritzacio_frontend.docx` tampoc es rellegeix ni es commiteja. La còpia doble dels colors no es fa. El calendari ja està partit. CSV d’anàlisi = backlog.
- Branques: `main` segueix a `7d3f474`, igual que `backup/pre-dockeritzacio` i `origin/backup/pre-dockeritzacio`. `feat/docker-caddy-sqlite` és la branca de treball i de desplegament. `backup/alpha-funcional` és el punt de retorn, a `d1a36fa` en local i a `origin`. A `origin/feat/docker-caddy-sqlite` el codi de l’ADR 0014 és `8667ff1` i la nota prèvia al desplegament és `10fcbec`. Política a `docs/16-repositori.md`.
- Pla temporal del backend esborrat (2026-09-29) i no es rellegeix. Fets, en ordre: normalitzar el nom al domini; una validació de nom, aforament i equipament; una comprovació d’interval reservable; el `save` en memòria de reserva i d’avís insereix si no hi ha fila; l’email del correu surt de `UserRepository.get_by_id`; test API d’intervals adjacents (201); una sola classe de repositori d’espais en memòria; `min_attendance` opcional al JSON, amb defecte `None`.
- Fora d’aquell pla, i sense començar: formulari d’aforament mínim, `pending` / `rescheduled`, ports nous, un servei que agrupi casos d’ús. L’anul·lació de la pròpia reserva pel coordinador ja hi és, sense correu.
- L’estat `rescheduled` no és una decisió oberta: en canviar l’horari, la reserva continua `confirmed` i l’avís porta l’interval antic i el nou. Un historial de canvis és backlog. L’assistència per nombre i l’avís suau d’aforament són el comportament volgut.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
- Docker local: `.env` (no versionat) amb `ESPAIS_DOMAIN=http://localhost`. Al VPS, el domini real sense esquema. Operació a `docs/17-desplegament-docker.md`. `environment.yml` continua sent l’entorn local; `backend/requirements.txt` és només el runtime de la imatge.
- Deute d’aquesta sessió: el pedaç de Schedule-X és deute arquitectònic conscient, a l’ADR 0013. Deute d’implementació: amb una finestra de 900 px d’alt, la caixa del calendari (`max-height: calc(100dvh - 16rem)`) encara deixa uns píxels de desplaçament intern (7 px amb 17:30–23:00, 51 px amb 17:30–23:30); no s’ha tocat. La decisió d’infraestructura continua sent l’ADR 0012. Caddy corre com a root dins la imatge oficial per poder escoltar 80/443; el backend no.
- Deute d’aquesta sessió (2026-10-16): el desfasament de glossari, visió i criteri de la fase 5 queda pendent de confirmar la regla, sense ADR nou. L’ADR 0014 ja està implementat.
- Deute d’aquesta sessió (2026-10-21): l’ADR 0015 és la decisió de capçaleres i d’OpenAPI. `style-src 'unsafe-inline'` és la decisió, perquè el calendari i la paleta posen atributs `style`. Ja és al VPS. El correu d’invitació amb SMTP real no s’ha provat: al servidor no hi ha `ESPAIS_SMTP_HOST`, i la prova de camp ha estat el camí sense correu.
- Deute d’implementació de l’auditoria del 2026-10-06 (sense ADR, cap no és urgent): `patch-package` sense `--error-on-fail`, i per això un pedaç que no s’aplica no atura el `docker build`; selectors `data-slots` 2–4 morts a `styles.css` i camps `margeInici` / `margeFi` sense ús a `Graella`; el divisor 30 de `slotsInici` / `slotsFi` repeteix el `gridStep`; falten tests de renderitzat per a 19:30–24:00 i per a un rang no múltiple de 30 (l’última fila queda mig retallada); comprovacions amb decimals exactes a `CalendariView.spec.ts`. No fer: abstraure Schedule-X, un composable de graella, estratègies per rol, marge configurable.
