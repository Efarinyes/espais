# Desplegament Docker (Alpha+)

Decisió: [ADR 0012](adr/0012-docker-caddy-sqlite-alpha.md).

Caddy és l’únic servei exposat. Serveix la SPA i envia `/api/*` a FastAPI sense el prefix. La base és SQLite al volum `espais_data` (`/data/espais.sqlite3`). Alembic s’aplica sol en arrencar el backend.

## Arquitectura

```text
Internet → Caddy :80/:443 → fitxers de la SPA
                          → /api/* sense prefix → FastAPI :8000 (xarxa interna)
                                              → /data/espais.sqlite3
```

El port 8000 no es publica. Un procés i un worker: la base és SQLite i el lifespan fa el manteniment.

## Requisits locals

- Docker Engine amb Compose v2.
- Els ports 80 i 443 lliures a la màquina on aixeques Compose.
- El desenvolupament sense Docker no canvia: micromamba `espais` i `cd frontend && npm run dev`. No facis `source .env` per als tests: `DATABASE_URL` del `.env` és la ruta de dins del contenidor.

## Arrencada Docker local

```bash
cp .env.example .env
# ESPAIS_DOMAIN=http://localhost
# ESPAIS_SECRET= un valor generat, no CHANGE_ME
docker compose up -d --build
```

Amb `ESPAIS_DOMAIN=http://localhost`, Caddy respon per HTTP al port 80. El nom `localhost` sense esquema fa que Caddy redirigeixi a HTTPS amb el seu certificat intern; per a `curl http://localhost` cal l’esquema `http://`. Obre `http://localhost`.

## Variables `.env`

| Variable | Ús |
|---|---|
| `ESPAIS_DOMAIN` | `http://localhost` en local. Al VPS, el domini públic sense esquema. |
| `ESPAIS_SECRET` | Secret HMAC de sessió. Obligatori: Compose posa `ESPAIS_ENV=production`. |
| `DATABASE_URL` | Dins el contenidor: `sqlite:////data/espais.sqlite3`. Compose ja el fixa. |
| `ESPAIS_SMTP_HOST` | Buit: els avisos queden al log i la invitació es mostra com a enllaç. La verificació del registre no mostra l’enllaç: sense SMTP el compte queda provisional (ADR [0024](adr/0024-verificacio-correu-responsable.md)). A l’Alpha amb Mailpit: `mailpit`. Un valor ja escrit no es canvia sol. |
| `ESPAIS_SMTP_PORT` | Mailpit: `1025`. Un relay futur: el port del proveïdor, sovint `587`. Un `587` ja escrit al `.env` no passa a `1025` sol. |
| `ESPAIS_SMTP_FROM` | Remitent. El domini de l’app i el del remitent poden ser diferents. |
| `ESPAIS_SMTP_STARTTLS` | Buit amb Mailpit. `1` quan el relay ho demani. |
| `ESPAIS_SMTP_USER` / `ESPAIS_SMTP_PASSWORD` | Buits amb Mailpit. Credencials del relay, quan n’hi hagi. |
| `ESPAIS_VAPID_PRIVATE_KEY` | **Secret.** Clau privada VAPID del Web Push (vegeu [Web Push](#web-push-vapid)). Buida: el push queda desactivat i la resta de l’app funciona igual. |
| `ESPAIS_VAPID_SUBJECT` | Contacte del servidor per als serveis de push: `mailto:…` o `https://…`. Obligatori si hi ha clau privada. |
| `ESPAIS_PUSH_EXTRA_HOSTS` | Opcional. Sufixos de host de push admesos a més de `googleapis.com`, `push.services.mozilla.com`, `push.apple.com` i `notify.windows.com`, separats per comes. Normalment buit. |

`.env` no entra a Git ni a la imatge. `.env.example` sí.

## Generar `ESPAIS_SECRET`

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

No reutilitzis `CHANGE_ME` ni `espais-dev-insegur`. El backend no arrenca en producció amb aquests valors.

## Web Push (VAPID)

Les notificacions del navegador al coordinador (ADR [0026](adr/0026-avisos-web-push-i-reserva-sota-control.md)) necessiten un parell de claus VAPID, generat una sola vegada per servidor:

```bash
micromamba run -n espais python tools/generar-claus-vapid.py
```

L’eina imprimeix `ESPAIS_VAPID_PRIVATE_KEY=…` i `ESPAIS_VAPID_SUBJECT=mailto:…` per copiar al `.env` del servidor, i la clau pública (informativa: el backend la deriva de la privada i la serveix a `GET /push/configuracio`). Edita el subjecte amb un correu de contacte real. La clau privada és un secret: no entra a Git, ni a la imatge, ni a un xat ni a un log. Les dependències són `pywebpush` i `py-vapid` (a `backend/requirements.txt` i `environment.yml`); la imatge es reconstrueix amb `docker compose up -d --build`.

Requisits del navegador:

- **HTTPS** (o `localhost`). Al VPS ja el posa Caddy.
- Chrome, Edge, Firefox i Safari recents. Cal permís de notificacions, que es demana només quan el coordinador prem «Activa les notificacions» a la safata d’avisos.
- **iPhone i iPad:** el push només funciona amb l’app instal·lada a la pantalla d’inici (Comparteix → «Afegeix a la pantalla d’inici») i iOS 16.4 o superior. Des de Safari normal, la pantalla ho indica i no demana permís.
- El permís és del navegador i del dispositiu: un coordinador amb dos dispositius n’ha d’activar dos.

Gestió de subscripcions: es registren i s’esborren des de la mateixa pantalla; en tancar sessió s’esborra la del navegador; el servidor esborra les que el servei de push declara caducades (404/410); cada usuari en té com a màxim 10. **Canviar `ESPAIS_VAPID_PRIVATE_KEY` invalida totes les subscripcions**: el servidor les descartarà quan el servei de push les rebutgi i cada coordinador haurà de tornar a activar les notificacions.

Limitacions conegudes:

- El push no confirma que s’hagi rebut ni llegit: només la lectura dins d’Espais ho marca.
- Si el navegador o el sistema bloquegen les notificacions (mode no molestar, estalvi d’energia, permís denegat), l’avís continua a la safata d’Espais.
- Dins l’app oberta, l’avís arriba pel refresc periòdic (uns 20 segons) i, si hi ha push, immediatament.
- Sense `ESPAIS_VAPID_PRIVATE_KEY`, `GET /push/configuracio` respon `enabled: false` i la UI no ofereix el push.

### Verificació manual del push

El push no s’ha provat en un dispositiu real des del desenvolupament. Abans de donar-lo per bo, amb HTTPS i una entitat de prova:

1. Entra com a coordinador (Android/Chrome i, si cal, iPhone amb l’app instal·lada) i prem «Activa les notificacions» a `/avisos`; accepta el permís.
2. Crea una reserva amb aquest coordinador. Tanca l’app o la pestanya.
3. Entra com a responsable, en un altre navegador, i modifica l’horari de la reserva. El dispositiu del coordinador mostra «Reserva modificada: …» amb l’horari d’abans i d’ara. Toca la notificació: obre `/avisos`, l’avís surt com a «No llegit» fins que s’obre. Mira que al calendari del responsable l’avís encara apareix com a pendent de lectura i que després de l’obertura passa a llegit.
4. Repeteix amb una anul·lació («Reserva anul·lada: …»). Comprova que el coordinador no pot tornar a modificar-la ni a anul·lar-la, i que pot crear una reserva nova a la mateixa franja.
5. Tanca la sessió del coordinador i fes un canvi: no ha d’arribar cap push a aquell navegador.

## Salut

```bash
curl -i http://localhost/api/salut
```

Ha de respondre `200` i `{"estat":"ok"}`. `http://localhost/iniciar-sessio` ha de tornar l’HTML de la SPA, no JSON.

Caddy afegeix les capçaleres de la vora (ADR [0015](adr/0015-capcaleres-i-openapi-produccio.md)) tant a l’HTML com a l’API. Amb `ESPAIS_ENV=production`, que Compose ja fixa al backend, `/api/docs`, `/api/redoc` i `/api/openapi.json` responen 404. `/api/salut` no es tanca. El bloc `handle_path /api/*` continua enviant la petició a FastAPI sense el prefix.

## Logs, aturar, reiniciar

```bash
docker compose ps
docker compose logs -f
docker compose logs backend
docker compose restart backend
docker compose stop
docker compose up -d
```

`docker compose down` atura i esborra contenidors. No esborra els volums. `down -v` esborra també la base: no ho facis en un servidor amb dades reals.

Si un correu no surt (recuperació, invitació o avís), `docker compose logs backend` en mostra una línia `ERROR` amb el tipus d’error, sense l’adreça, el token ni la contrasenya. El log d’accés del backend escriu `/invitacions/<token>` en lloc del token d’invitació. Caddy no escriu log d’accés.

## Persistència

El volum `espais_data` es munta a `/data`. El primer arrencada, amb el volum buit, Alembic crea l’esquema. Un reinici no recrea la base.

## Còpia de seguretat

Amb el backend en marxa:

```bash
tools/backup-sqlite.sh
```

Escriu `backups/espais-AAAAMMDD-HHMMSS.sqlite3` amb l’API de backup de SQLite (no una còpia a cegues del fitxer). El directori `backups/` no es versiona. Pots passar un altre directori com a argument. La taula `revoked_tokens` ([ADR 0014](adr/0014-revocar-token-en-sortir.md)) és dins el mateix fitxer: la còpia i la restauració la tracten com la resta de la base.

## Restauració

```bash
tools/restore-sqlite.sh --confirmo backups/espais-AAAAMMDD-HHMMSS.sqlite3
```

Sense `--confirmo` no toca res. El script atura els serveis, restaura dins el volum i els torna a engegar. Comprova després `GET /api/salut` i un inici de sessió.

Fes una còpia del servidor abans de substituir dades.

## Importar la base local (opcional)

L’arrel pot tenir `espais.sqlite3` de desenvolupament. No entra a la imatge i Compose no l’importa sol.

Tria una de les dues:

- **A. Volum nou.** No copiïs cap fitxer. El primer `up` crea una base buida ja migrada.
- **B. Importar la base local.** Pot contenir dades de prova. Abans, còpia del servidor amb `tools/backup-sqlite.sh`. Després:

```bash
tools/restore-sqlite.sh --confirmo ./espais.sqlite3
```

## VPS

1. Un Linux amb Docker Engine i el plugin Compose.
2. DNS: un registre A (o AAAA) del domini cap a la IP del VPS.
3. Obre només **80** i **443**. No obris **8000** ni el SMTP de Mailpit (**1025**).
4. Clona el repositori, crea `.env` amb el domini real i un `ESPAIS_SECRET` nou. Per capturar el correu a l’Alpha: `ESPAIS_SMTP_HOST=mailpit` i `ESPAIS_SMTP_PORT=1025`. Per al Web Push, `ESPAIS_VAPID_PRIVATE_KEY` i `ESPAIS_VAPID_SUBJECT` (vegeu [Web Push](#web-push-vapid)).
5. Còpia de la base abans d’actualitzar un servidor que ja té dades: **al servidor, amb els contenidors actuals encara en marxa** (l’script fa servir `docker compose exec`, així que el backend ha d’estar corrent) i **abans** del `docker compose up -d --build`. Des de l’arrel del repositori: `tools/backup-sqlite.sh` (escriu a `backups/espais-<data>.sqlite3`, que no es versiona) i, si vols, copia el fitxer fora del servidor amb `scp`. Una còpia feta al teu ordinador és de la base local, no de la del servidor.
6. `git pull` a `feat/docker-caddy-sqlite` i `docker compose up -d --build`. No facis `down -v`.

Mailpit és a la xarxa interna. La interfície només escolta a `127.0.0.1:8025` del VPS. Per veure els missatges, un túnel SSH cap a aquest port i el navegador a `http://127.0.0.1:8025`. No es publica a Caddy. No té volum: recrear el contenidor buida la bústia.

Els enllaços de recuperació i d’invitació surten de `ESPAIS_DOMAIN`. No hi van `localhost`, `mailpit` ni noms de contenidor.

Les migracions s’apliquen soles en arrencar el backend. La darrera és `0012_notification_center_push`: afegeix `reservations.managed_by_responsible` (a cert per a les reserves que ja tenen un avís de reprogramació: **bloqueig retroactiu**, el coordinador ja no les podrà tornar a canviar) i la taula `push_subscriptions`. Abans d’actualitzar, fes la còpia de la base. (La de la recuperació, més antiga, és `0010_password_resets`: afegeix `users.session_version` amb valor 0 i dues taules, sense tocar dades). Després d’actualitzar:

1. `curl -i https://<domini>/api/salut` respon 200, i `docker compose logs backend` mostra la migració fins a `0010_password_resets`.
2. La PWA pot servir el paquet anterior la primera vegada. Recarrega la pàgina fins que «Inicia sessió» mostri «Has oblidat la contrasenya?».
3. Una demanda de recuperació apareix a Mailpit (túnel a `127.0.0.1:8025`) amb l’enllaç `https://<domini>/recuperar#…`.
4. Després de canviar la contrasenya, la pantalla diu «La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió.» i no entra sola. El login amb la contrasenya nova porta a Espais amb el rol de sempre. Un altre navegador amb la sessió d’abans torna a «Inicia sessió».

Caddy obté i renova el certificat. Els certificats queden als volums `caddy_data` i `caddy_config`, no al disc efímer del contenidor.

Fins que el DNS apunti al servidor, no posis el domini real: el certificat fallaria. En local segueix amb `http://localhost`.

## El que no es fa en aquesta Alpha

PostgreSQL, Redis, Celery, Kubernetes, Swarm, més d’un VPS, un registry d’imatges, ni un WebSocket de calendari. El login usa Socket.IO al mateix worker, sense Redis (ADR [0025](adr/0025-verificacio-login-socket.md)). Un worker. Quan calgui escriptura concurrent de veritat, la migració a PostgreSQL es decideix a part (ADR 0012).
