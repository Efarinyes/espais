# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** v1 tancada (fases 0–8). Refactorització del frontend tancada. La dockerització de l’Alpha és una peça a part, a la branca `feat/docker-caddy-sqlite`. No és una fase nova del pla.
- **Fase anterior:** 8 — Poliment (feta: navbar mòbil, skip-link, empty/error, modal suau)

## Darrera feina

2026-11-12: Croses i Manilles eren els dos liles de la llista. Un passa a groc i l’altre a blau. Sala pilars es queda teal. La llista ja no té dos porpres.

2026-11-08: la fase d’UX, D1 i la prova E2E es dona per tancada. Queda pendent només D-PALETA: els hex publicats no es canvien fins que es decideixi. `feat/docker-caddy-sqlite` es puja a `origin` perquè qui opera el servidor pugui fer `git pull` i `docker compose up -d --build`, sense `down -v`. No s’ha tocat el VPS ni `main`. `backup/pre-ux-ui-2026-11-02` segueix a `436d97b`.

2026-11-08: auditoria E2E amb Docker local, projecte `espais-e2e-d1-20261108`, només a `127.0.0.1:80` i `127.0.0.1:8025`. Volums propis. La base de desenvolupament i els volums `espais_*` no s’han tocat. En acabar, `docker compose -p espais-e2e-d1-20261108 down -v` ha esborrat només aquesta pila. Sense canvis de codi: no s’ha trobat cap defecte de D1 ni de permisos dins de l’abast. Sense push ni VPS. `backup/pre-ux-ui-2026-11-02` segueix a `436d97b`.

Entitat `E2E — Entitat de verificació`. Rita Responsable (`e2e.resp@example.com`). Coordinadores Cora Un, Cora Dos i Cora Tres. Sales: Sala 1 dilluns–divendres 17:00–23:00, aforament 10; Sala 2 dilluns–divendres 09:00–14:00; Sala 3 dilluns–dissabte 16:00–22:00. Reserves de les tres a sales i dies diferents, una anul·lada, una amb 12 assistents (per sobre de l’aforament) i una segona entitat buida per a l’aïllament. Contrasenya només de la pila, ja esborrada.

API real, totes superades: 401 amb contrasenya dolenta i sense sessió; aïllament de l’altra entitat; el coordinador rep l’aliena sense nom; el responsable veu el nom i rep 403 en crear; 403 en crear espai, anul·lar, assistència i reprogramar una aliena; 409 en els cinc solapaments; 400 fora d’horari; 201 al límit i en una franja adjacent; l’anul·lada no surt a la llista activa i la franja es pot tornar a ocupar; el 409 de reprogramar no mou la reserva; sortir revoca el token. Estadístiques: 403 el coordinador i 200 el responsable amb `des` i `fins`. Mailpit ha rebut la invitació i «Recupera l’accés a Espais».

Navegador contra `http://localhost`, després d’esborrar un service worker antic de localhost. Superat: títol «Disponibilitat — Sala 1» a 390 px, un sol dia, eix 16:30–23:00, «Teva» i «Ocupat» sense noms, clic a l’ocupada sense diàleg, clic a la pròpia amb l’avís d’aforament, «Nova reserva» amb 409 i el dia i l’hora conservats. Sala 2, setmana del 9 al 15: dues ocupades i una «Teva». Sala 3, divendres ocupada i dissabte ocupada més «Teva». Sense sala: «Les meves reserves» i només les pròpies de les tres sales. Cora Dos a Sala 1 veu la seva com a «Teva» i les altres com a «Ocupat», amb un sol botó Obre. El responsable no veu «Nova reserva», filtra per «Cora Dos», veu els tres noms i dos tramats, Estadístiques (10 reserves, 5 anul·lades), Tria els colors i Convida. Surt deixa la sessió buida. Amplades 360, 390, 430, 768, 1280 i 1440 sense scroll horitzontal. El diumenge 8 no es queda a la vista diària de Sala 1: salta al dilluns 9, el dia obert següent. El canvi de setmana de Schedule-X no ha respost al clic sintètic; la llista sí.

Vitest 237, `vue-tsc -b` i `npm run build` nets. Cap línia ERROR al log del backend. Els 400, 401, 403, 409 i 422 són les proves (el 422 va ser una consulta d’estadístiques amb paràmetres incorrectes, repetida bé després).

2026-11-08: D1 implementada, alternativa C. Amb una sala triada, el coordinador només veu la disponibilitat d’aquella sala. Les alienes diuen «Ocupat», no es poden obrir ni reservar-hi, i no porten nom. Les pròpies diuen «Teva», es poden obrir i porten una vora pròpia. Sense sala, el títol és «Les meves reserves» i només hi ha les seves, de totes les sales. El responsable manté «Totes les reserves» i «Reserves de [espai]». La graella i la llista fan servir la mateixa regla. No s’han canviat hex, tramats del responsable ni el gris de fora d’horari. Sense push ni VPS. `backup/pre-ux-ui-2026-11-02` segueix a `436d97b`.

Vitest 237, `vue-tsc -b` i `npm run build` nets. Al navegador, a 1280 px, la setmana de Sala 3 mostrava «Disponibilitat — Sala 3» i la casella «Teva» amb la classe `reserva-propia`. La llista de Sala 1, el mateix dia, no mostrava aquella reserva. Sense sala, el títol tornava a «Les meves reserves» i la reserva de Sala 3 hi sortia. No hi ha un segon coordinador a l’entitat de prova: la franja aliena s’ha vist a les proves, no al navegador. La reserva de comprovació (Sala 3, 8 de novembre de 2026, 20:30–21:30) s’ha anul·lat.

2026-11-08: actuacions C del pla UX/UI, a `feat/docker-caddy-sqlite`, sense push ni VPS. `backup/pre-ux-ui-2026-11-02` segueix a `436d97b`. No s’ha tocat cap hex ni D-PALETA. D1 no s’ha implementat: amb una sala triada, el coordinador continua veient les seves reserves de totes les sales i les alienes d’aquella sala com a «Ocupat».

Fet, sense canviar permisos ni la creació existent:

- Les caselles mostren un text curt (espai, «Ocupat» o coordinador) amb el·lipsi. Les persones del calendari continuen ocultes.
- El responsable filtra per `?espai=` (la vista inicial segueix sent tota l’entitat) i per `?cerca=` (text, no un id; els homònims surten tots). El coordinador no té cerca.
- Graella i Llista comparteixen rang, filtre i permisos. Una càrrega fallida no es presenta com a «No hi ha reserves».
- «Nova reserva» només per al coordinador. Reutilitza `avaluarFranja` i `CreateReservation`. El clic a la franja lliure es manté. El responsable no la veu.
- El botó petit diu «Menú». L’ordre és Espais, Calendari, Estadístiques (responsable) o Avisos (coordinador). Convida i Tria els colors van sota Administració. Surt queda separat. El calaix no s’ha redissenyat.
- Els tramats es conserven i el patró surt del nom, de manera que no canvia si al rang hi ha altres persones. Sis patrons es poden repetir. Dos noms iguals comparteixen patró: l’API no dona un id de coordinador i no se’n fabrica cap.
- Els títols de pantalla de l’app fan 28 px. El hero de la landing no s’ha tocat.
- La targeta del responsable continua dient «Calendari» i obre el calendari sense `?espai=` (ADR 0008). «Calendari general» no s’ha adoptat.

Vitest 237 i `vue-tsc` nets. `npm run build` net fora del sandbox (el workbox falla a dins). Al navegador, amb l’entitat de prova, el coordinador ha vist el menú, la llista («Teva», sense el nom d’un altre) i el text «Sala 3» a la casella. Per veure-ho s’ha creat una reserva a Sala 3 el 8 de novembre de 2026, 20:30–21:30, i s’ha anul·lat després: queda `cancelled` i el calendari no la llista. El recorregut del responsable al navegador no s’ha completat. No s’ha fet push.

2026-11-02: tancament. `feat/docker-caddy-sqlite` local i `origin` coincideixen a `a562a8f`. Qui opera el servidor ho publica amb `git pull` i `docker compose up -d --build`, sense `down -v`. No s’ha tocat el VPS ni `main`. La còpia `backup/pre-ux-ui-2026-11-02` segueix a `436d97b`.

2026-11-02: la fletxa del calendari de Schedule-X ja no és una imatge `data:` (`a562a8f`). La CSP de l’ADR 0015 (`img-src 'self'`) la bloquejava en obrir `/calendari`. Ara és `/fletxa-calendari.svg`, al pedaç existent de Schedule-X. No s’ha obert cap ADR.

2026-11-02: el menú petit és un calaix lateral esquerre, a tota l’alçada (`4c6de89`). Qui l’ha provat al servidor confirma que funciona per al responsable i per al coordinador. A `lg` el lateral no canvia. Les opcions i els rols no s’han reordenat.

2026-11-02: correccions A i millores B del pla UX/UI revisat, a `feat/docker-caddy-sqlite` (`b7b5aeb`, també a `origin`). La còpia de seguretat és `backup/pre-ux-ui-2026-11-02`, al commit `436d97b`, en local i a `origin`. No s’ha tocat `main` ni el VPS. Una pila Docker `espais-e2e` ha comprovat l’alta, el botó al costat del títol, el títol del responsable i el tancament del menú; després s’ha esborrat amb els seus volums.

Fet: el refresc del calendari no confon un error amb una sala lliure; el diàleg és modal i l’error de crear es veu a dins; el resum porta la data; el coordinador tria l’espai amb el `?espai=` que ja hi havia; el color de sala no depèn de l’ordre; la llegenda segueix el que es mostra; el menú mòbil es tanca en navegar; les targetes diuen «Reservar» o «Calendari» també al nom accessible; «Afegeix un espai» és al costat del títol; la landing no promet avís immediat ni bloqueig d’aforament. El contrast dels vuit temes s’ha mesurat i els hex publicats no s’han canviat (D-PALETA). Vitest 226 i `vue-tsc` nets. La landing s’ha vist a `http://127.0.0.1:5173/`. El recorregut amb sessió no s’ha fet al navegador.

No s’ha fet, perquè és categoria C o decisió pendent: text visible a les caselles, «Nova reserva», Graella/Llista, filtre i cerca del responsable, títols nous (D1), tramats nous, etiqueta «Menú» al capçal, reordre del menú, «Calendari general», escala tipogràfica nova, ni captures noves de la landing. D-PALETA continua sense decidir: els hex publicats no s’han canviat.

2026-10-30: tancament. El commit `82730c9` (els logs ja no escriuen paràmetres SQL ni adreces) és a `origin/feat/docker-caddy-sqlite`. El VPS encara no el serveix: el desplegament el fa qui opera el servidor, amb `git pull` i `docker compose up -d --build`, sense `down -v`. La resta de l’auditoria de la recuperació no s’ha començat.

2026-10-30: els logs ja no escriuen paràmetres SQL ni adreces de correu, a `feat/docker-caddy-sqlite`. El motor SQLAlchemy amaga els valors de les consultes a les excepcions. Si falla el correu d’una invitació, d’una anul·lació o d’una reprogramació, el log guarda el tipus d’excepció i, si n’hi ha, el codi SMTP, sense el traceback, l’adreça ni el missatge del servidor. La recuperació ja registrava només el tipus. Pytest 269 verds. No s’ha tocat el VPS ni s’ha desplegat. Qui opera el servidor ho publica amb `git pull` i `docker compose up -d --build`, sense `down -v`.

2026-10-30: la nota de sessió que faltava a `origin` s’ha pujat. `feat/docker-caddy-sqlite` local i `origin` coincideixen. El canvi és només `SESSION.md`; les imatges no el copien, així que l’app desplegada no canvia. No s’ha demanat un desplegament nou ni moure `backup/alpha-funcional` ni fusionar a `main`.

2026-10-30: qui opera l’app confirma que la recuperació funciona. No s’ha demanat moure `backup/alpha-funcional` ni fusionar a `main`. La punta de l’app, abans d’aquesta nota, era `5c44a88`.

2026-10-30: la recuperació de compte ja no obre sessió (ADR [0019](docs/adr/0019-recuperacio-sense-sessio.md), que esmena l’0018), a `feat/docker-caddy-sqlite`. La confirmació respon «La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió.», l’SPA esborra la sessió del navegador i ofereix «Inicia sessió». Correccions trobades en revisar el flux sencer:

- El token es consumeix amb un `UPDATE` condicional dins la transacció del canvi: de dues confirmacions alhora, només en guanya una. Enllaç inventat, caducat o usat: 410 amb el mateix text i «Demana un enllaç nou». Contrasenya rebutjada: 400 sense gastar el token.
- `POST /recuperacio` respon abans de fer la feina (tasca posterior a la resposta): el temps no delata si el compte existeix. Els límits es compten després d’inserir l’intent.
- Un 401 a `GET /sessio` esborra la sessió local i porta a «Inicia sessió»; abans el token mort es quedava al navegador.
- La pantalla també llegeix el fragment quan canvia sense recarregar, i el treu de la barra i de l’estat del router.
- Regla comuna de contrasenya a alta, invitació i recuperació: de 8 caràcters a 72 bytes. bcrypt 5 donava un 500 a partir de 72 bytes.
- `alembic/env.py` apagava tots els loggers de l’app en arrencar: els errors d’SMTP no sortien al log. Ara sí, només amb el tipus d’error. El log d’accés d’uvicorn escrivia el token d’invitació del camí: ara `/invitacions/<token>`.

El login continua sent únic: el rol surt de la membership a la base i cada cas d’ús respon 403 fora del seu rol (docs/04). Pytest 262 i Vitest 208 verds, `vue-tsc` net. Migració `0010` provada sobre una base nova i sobre una còpia de la base local (a `0008`, 6 usuaris): files intactes, `session_version` 0. E2E nou, `tools/e2e-recuperacio.mjs` ([docs/13](docs/13-testing.md)), contra una pila Docker local separada (`espais-e2e`, volums propis, ja esborrada) amb Mailpit i Brave headless a mida de mòbil: 70 comprovacions correctes per al responsable i el coordinador, límits inclosos; cap token, sessió ni contrasenya als logs dels contenidors. No s’ha tocat el VPS, `main` ni `backup/alpha-funcional`. Commits `462f7c8` (logs) i `d0e8bf8` (recuperació sense sessió), pujats a `origin/feat/docker-caddy-sqlite`.

2026-10-29: recuperació de compte per correu (ADR 0018), a `feat/docker-caddy-sqlite`. El mateix flux per al responsable i el coordinador. `POST /recuperacio` respon sempre el mateix text. El token va al fragment `/recuperar#…`, a la base només el SHA-256, caduca al cap d’una hora i és d’un sol ús. Una demanda nova invalida les anteriors no usades. Límit silenciós: 3 per compte i hora, 10 per IP i hora, també si el compte no existeix. Caddy reescriu `X-Forwarded-For` i el backend només el llegeix si el company TCP és privat o de loopback. Un canvi correcte puja `session_version` i el HMAC porta `ver`: les sessions anteriors cauen i se n’obre una de nova. Un token sense `ver` compta com a 0. Si el correu no surt, el token es consumeix. Invitacions i avisos comparteixen el transport SMTP. Mailpit és a la xarxa interna, la interfície només a `127.0.0.1:8025`, el port 1025 no es publica. La contrasenya continua amb mínim de 8 caràcters; l’ADR 0017 no s’implementa. El registre no ofereix l’enllaç (ADR 0016). Pytest 234 i Vitest 190 verds; `vue-tsc` net. No s’ha tocat el VPS, `main` ni `backup/alpha-funcional` (`9178e98`). La prova a `https://espais.duckdns.org` i a Mailpit la fa qui opera el servidor.

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

Les paletes (ADR [0020](docs/adr/0020-paletes-aprovades.md)) i el desplegable de coordinador amb els colors de sala (ADR [0021](docs/adr/0021-filtre-coordinador-i-colors-sala.md)) són a `feat/docker-caddy-sqlite`. Qui opera el servidor publica amb `git pull` i `docker compose up -d --build`, sense `down -v`. No es fusiona a `main`.

La feina de desplegament continua a `feat/docker-caddy-sqlite`: és la branca que el servidor desplega després del `git pull` i de regenerar els contenidors. `backup/alpha-funcional` (`9178e98`, també a `origin`) és el punt de retorn. `backup/pre-ux-ui-2026-11-02` (`436d97b`) no es mou. No es fusiona a `main` fins a la Beta, quan es canviï la configuració del servidor. No s’esborren `backup/alpha-funcional` ni `backup/pre-dockeritzacio`.

L’assistència amb `mine: false`, el README, les capçaleres/OpenAPI, el registre (ADR 0016), la invitació per correu i la revocació en sortir (ADR 0014) ja són a `origin` i s’han vist a l’Alpha. No es refan. La verificació de correu segueix al backlog. L’ADR 0017 continua proposat, sense codi.

Les paletes aprovades ja són el codi de l’app (ADR 0020). No es comencen soles les troballes que l’auditoria de la recuperació va deixar fora d’aquesta correcció (F-01, F-02, F-03, D-01, D-02). No es comença sola la decisió D1 del calendari, ni l’alineació de glossari, visió i fase 5, ni l’ADR 0017, ni les recomanacions «Després» de l’auditoria. `backup/alpha-funcional` no es mou fins que es demani.

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
- [0018](docs/adr/0018-recuperacio-de-compte.md) — acceptat, esmenat per 0019 (recuperació per correu; token al fragment; `session_version`; Mailpit a l’Alpha)
- [0019](docs/adr/0019-recuperacio-sense-sessio.md) — acceptat (la recuperació no obre sessió; consum atòmic; 410; resposta abans de la feina; 401 esborra la sessió local; 72 bytes)
- [0020](docs/adr/0020-paletes-aprovades.md) — acceptat (hex aprovats als vuit temes; nom visible «Vinyes vora al mar»; els identificadors `vinyes` i `vinyes-dark` no canvien)
- [0021](docs/adr/0021-filtre-coordinador-i-colors-sala.md) — acceptat (desplegable de coordinador; colors de sala separats)

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Paleta d’entitat ADR 0011 (defecte Mar i cel; Clar/Fosc al capçal; Tria els colors al lateral del responsable, a sobre de Surt); toc ≥ 44px (`min-h-11`). Amb sessió el capçal és compartit (logo i mode). El lateral és per rol. Per sota de `lg` el menú és un calaix fix ancorat a l’esquerra, a tota l’alçada. A `lg` el lateral continua visible. Lletra Montserrat local.
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` és `/api`. Les rutes Vue ja no es deneguen pel nom.
- Refactorització del frontend tancada (2026-09-28). El pla temporal del frontend s’esborra i no es rellegeix. El `.docx` `docs/auditoria_SOLID_pla_refactoritzacio_frontend.docx` tampoc es rellegeix ni es commiteja. La còpia doble dels colors no es fa. El calendari ja està partit. CSV d’anàlisi = backlog.
- Branques: `main` segueix a `7d3f474`, igual que `backup/pre-dockeritzacio`. `feat/docker-caddy-sqlite` és la branca de treball i de desplegament. `backup/alpha-funcional` és el punt de retorn, a `9178e98`, i no es mou amb la recuperació de compte. Política a `docs/16-repositori.md`.
- Pla temporal del backend esborrat (2026-09-29) i no es rellegeix. Fets, en ordre: normalitzar el nom al domini; una validació de nom, aforament i equipament; una comprovació d’interval reservable; el `save` en memòria de reserva i d’avís insereix si no hi ha fila; l’email del correu surt de `UserRepository.get_by_id`; test API d’intervals adjacents (201); una sola classe de repositori d’espais en memòria; `min_attendance` opcional al JSON, amb defecte `None`.
- Fora d’aquell pla, i sense començar: formulari d’aforament mínim, `pending` / `rescheduled`, ports nous, un servei que agrupi casos d’ús. L’anul·lació de la pròpia reserva pel coordinador ja hi és, sense correu.
- L’estat `rescheduled` no és una decisió oberta: en canviar l’horari, la reserva continua `confirmed` i l’avís porta l’interval antic i el nou. Un historial de canvis és backlog. L’assistència per nombre i l’avís suau d’aforament són el comportament volgut.
- El coordinador reprograma la seva reserva sense avís; l’avís només el dispara el responsable.
- Landing: sense CTAs al cos; sense «gratuït» ni «cobrament»; fotos a `frontend/public/landing/` (hero + opcions + captures).
- Docker local: `.env` (no versionat) amb `ESPAIS_DOMAIN=http://localhost`. Al VPS, el domini real sense esquema. Operació a `docs/17-desplegament-docker.md`. `environment.yml` continua sent l’entorn local; `backend/requirements.txt` és només el runtime de la imatge.
- Deute d’aquesta sessió: el pedaç de Schedule-X és deute arquitectònic conscient, a l’ADR 0013. Deute d’implementació: amb una finestra de 900 px d’alt, la caixa del calendari (`max-height: calc(100dvh - 16rem)`) encara deixa uns píxels de desplaçament intern (7 px amb 17:30–23:00, 51 px amb 17:30–23:30); no s’ha tocat. La decisió d’infraestructura continua sent l’ADR 0012. Caddy corre com a root dins la imatge oficial per poder escoltar 80/443; el backend no.
- Deute d’aquesta sessió (2026-10-16): el desfasament de glossari, visió i criteri de la fase 5 queda pendent de confirmar la regla, sense ADR nou. L’ADR 0014 ja està implementat.
- Deute d’aquesta sessió (2026-10-21): l’ADR 0015 és la decisió de capçaleres i d’OpenAPI. `style-src 'unsafe-inline'` és la decisió, perquè el calendari i la paleta posen atributs `style`. Ja és al VPS.
- Deute d’aquesta sessió (2026-10-29): l’ADR 0018 és la recuperació. El correu de l’Alpha el captura Mailpit; un relay real (STARTTLS, usuari i contrasenya) no s’ha provat.
- Deute d’implementació (2026-11-02), sense ADR: el pedaç de Schedule-X de l’ADR 0013 també substitueix la fletxa `data:` per `/fletxa-calendari.svg`, perquè la CSP no admet imatges incrustades. Actualitzar Schedule-X obliga a refer les dues parts del pedaç.
- Deute d’implementació (2026-11-08), sense ADR: el refresc dels filtres comprova `eventsFacade` de Schedule-X, perquè `set` falla si el plugin encara no està lligat al calendari. Els homònims comparteixen tramat perquè la llista de reserves no porta id de coordinador. El dia visible de la Llista no és a la URL: en recarregar torna a avui, com la graella.
- Risc anotat (2026-10-30), sense decisió: `POST /sessio` només fa bcrypt si el compte existeix, i el temps de resposta pot delatar un correu registrat. Va amb el límit d’intents de l’ADR 0017, que continua proposat. No s’ha tocat. El navegador escriu en vermell els 401 i 410 que respon el servidor (contrasenya antiga, sessió morta, enllaç usat): no són errors de l’app. Els avisos de `ruff` que ja hi havia (ordre d’imports en fitxers no tocats) es queden.
- Deute d’implementació de l’auditoria del 2026-10-06 (sense ADR, cap no és urgent): `patch-package` sense `--error-on-fail`, i per això un pedaç que no s’aplica no atura el `docker build`; selectors `data-slots` 2–4 morts a `styles.css` i camps `margeInici` / `margeFi` sense ús a `Graella`; el divisor 30 de `slotsInici` / `slotsFi` repeteix el `gridStep`; falten tests de renderitzat per a 19:30–24:00 i per a un rang no múltiple de 30 (l’última fila queda mig retallada); comprovacions amb decimals exactes a `CalendariView.spec.ts`. No fer: abstraure Schedule-X, un composable de graella, estratègies per rol, marge configurable.
