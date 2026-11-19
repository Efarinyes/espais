# Testing

Skill: `testing-quality`. Contracte: **cap cas d’ús sense test**.

## Piràmide

1. Unitari de cas d’ús / domini (majoritari): fakes de repositori, clock, notifier.
2. Adaptador: SQLAlchemy amb SQLite en memòria; un cas d’aïllament de tenant.
3. API: TestClient FastAPI pels fluxos d’auth i permisos.
4. Front: composables i components dels fluxos crítics (registre, reserva, anul·lació).
5. E2E complet: només Fase 8 si aporta valor; no bloqueja fases 1–7.

## Fluxos que sempre han de tenir test

- `RegisterEntity` atòmic; email duplicat; no entitat òrfena.
- Tenant: usuari d’A no llegeix espais/reserves de B.
- Unique nom d’espai per entitat; duplicate permès entre entitats.
- Solapament de reserves confirmades.
- `RecordAttendance` amb `count`; estratègia extensible no trenca.
- `CancelReservationByResponsible` persisteix avís i crida `Notifier`.
- Fallada de correu no reverteix l’anul·lació.
- `ArchiveNotification`: només el destinatari; només avisos ja llegits; tenant A no arxiva B.
- `PurgeArchivedNotifications`: elimina només arxivats de fa ≥ 3 setmanes; no toca no llegits ni llegits sense arxivar.
- `GetUsageSummary`: només el responsable; tenant A no veu B; `cancelled` no entra a ocupació; assistència sense zero silenciós.
- Autorització: la política de rols; cada ruta privada del router; `401` sense sessió, `403` sense permís, `404` en un recurs d’una altra entitat; sessió revocada o amb `session_version` antiga; el rol es rellegeix de la membership.
- Recuperació de compte (ADR [0018](adr/0018-recuperacio-de-compte.md), [0019](adr/0019-recuperacio-sense-sessio.md)): resposta idèntica amb compte o sense; només el hash a la base; una hora; un sol ús, també amb dues confirmacions alhora (SQLite); una demanda nova anul·la l’anterior; límits per compte i per IP; correu caigut sense token viu ni dades al log; cap sessió nova; les anteriors cauen per als dos rols i el rol es manté.
- Verificació del responsable (ADR [0024](adr/0024-verificacio-correu-responsable.md)): alta sense sessió; compte i entitat provisionals; només el hash; 24 hores; un sol ús, també amb dues confirmacions alhora; un reenviament anul·la l’anterior; el reenviament respon igual amb compte o sense i té els mateixos límits, comptats a part; correu caigut sense token viu; la confirmació activa els dos i no obre sessió; una contrasenya correcta abans de verificar respon 403 i una d’incorrecta continua sent 401; la recuperació no verifica el correu; el coordinador entra per la invitació.
- Avisos de modificació i anul·lació, push i bloqueig (ADR [0026](adr/0026-avisos-web-push-i-reserva-sota-control.md)): avís al coordinador només si el canvi és del responsable, sense duplicats ni avís si no canvia res; `changes` correcte; lectura només del propi coordinador (404 amb l’avís d’un altre) i que el push no la fa; un correu o un push que fallen no desfan el canvi ni l’avís in-app; el coordinador no reprograma ni anul·la una reserva gestionada (ni reactiva una anul·lada) però sí en registra l’assistència; la franja alliberada admet una reserva nova; subscripcions: només coordinador, `entity_id`, endpoints https del conjunt admès, baixa, caducades esborrades, sense secrets als logs; migració `0012` amb el bloqueig retroactiu.
- Login amb codi per Socket.IO (ADR [0025](adr/0025-verificacio-login-socket.md)): la contrasenya correcta no torna token; el codi no surt a la resposta ni als logs; caduca als 2 minuts; un sol ús; 5 intents; un canal no rep el codi de l’altre; sense connexió no hi ha sessió; el responsable i el coordinador comparteixen el flux; una sessió ja emesa se segueix revocant amb `session_version` i amb `POST /sessio/tancament`.

## Eines

- Backend: pytest, `conftest.py` amb fakes.
- Frontend: Vitest. Noms en anglès als tests de codi; descripcions poden ser catalanes.
- Un test, un comportament. Noms `test_<acció>_<resultat>`.

## E2E de la recuperació

L’alta dels scripts E2E que registren un responsable llegeix el correu de verificació a Mailpit (`tools/verificar-alta.mjs`) i entra després de confirmar-lo. `tools/e2e-recuperacio.mjs` recorre la recuperació del responsable i del coordinador amb un Chrome, Brave o Chromium en mode headless, a mida de mòbil, contra una pila Docker **local** amb Mailpit. Fa l’alta, la invitació i l’acceptació pel correu, la demanda, l’enllaç, el canvi, el login amb la contrasenya nova, el rebuig de la sessió antiga i de l’enllaç usat, i la recàrrega. No imprimeix tokens. Es nega a córrer si l’app o Mailpit no són a `localhost`: crea entitats de prova.

```bash
# .env local: ESPAIS_DOMAIN=http://localhost, un ESPAIS_SECRET propi,
# ESPAIS_SMTP_HOST=mailpit i ESPAIS_SMTP_PORT=1025 (amb 587 el correu no arriba a Mailpit)
docker compose -p espais-e2e up -d --build
node tools/e2e-recuperacio.mjs
node tools/e2e-recuperacio.mjs --limits   # només amb una base nova: gasta el límit per IP d’una hora
docker compose -p espais-e2e down         # els volums espais-e2e_* queden fins que els esborris
```

El projecte `espais-e2e` té volums propis i no toca els de la pila habitual. Necessita lliures els ports 80, 443 i 8025. Si el 8025 és ocupat (per exemple, pel túnel cap al Mailpit del VPS), cal un fitxer de Compose addicional que el canviï i `ESPAIS_E2E_MAILPIT=http://127.0.0.1:<port>`. `ESPAIS_E2E_CAPTURES=<directori>` desa captures.

## E2E d’autorització

`tools/e2e-autoritzacio.mjs` comprova, contra una pila local pròpia, que una URL privada sense sessió va a iniciar sessió, que cada rol entra a les seves rutes i a les compartides, que el rol desat al navegador no guanya al del servidor, i que un token tancat rep 401. El coordinador rep 403 a l’anàlisi i el responsable a la safata d’avisos. El port és `127.0.0.1:8090` per no ocupar el 80 de la pila habitual. Els volums són els del projecte `espais-e2e-autoritzacio`.

```bash
docker compose -p espais-e2e-autoritzacio -f compose.yaml -f tools/compose.e2e-autoritzacio.yaml up -d --build --wait
ESPAIS_E2E_APP=http://127.0.0.1:8090 node tools/e2e-autoritzacio.mjs
docker compose -p espais-e2e-autoritzacio -f compose.yaml -f tools/compose.e2e-autoritzacio.yaml down -v
```

## E2E d’avisos i push

`tools/e2e-notificacions.mjs` recorre per HTTP els escenaris A (el responsable modifica: avís, lectura, bloqueig del coordinador), B (anul·lació: avís, històric, bloqueig), C (reserva nova a la franja alliberada) i la part de servidor de D (configuració pública, alta i baixa de subscripcions, endpoint intern rebutjat, i que un endpoint de push inaccessible no trenca el canvi). Necessita VAPID al backend i el Mailpit per llegir el correu de verificació.

```bash
export ESPAIS_VAPID_PRIVATE_KEY=$(python tools/generar-claus-vapid.py | sed -n 's/^ESPAIS_VAPID_PRIVATE_KEY=//p')
docker compose -p espais-e2e-notificacions -f compose.yaml -f tools/compose.e2e-notificacions.yaml up -d --build --wait
ESPAIS_E2E_APP=http://127.0.0.1:8091 ESPAIS_E2E_MAILPIT=http://127.0.0.1:18026 node tools/e2e-notificacions.mjs
docker compose -p espais-e2e-notificacions -f compose.yaml -f tools/compose.e2e-notificacions.yaml down -v
```

Només accepta `localhost` o `127.0.0.1`. **No** prova que una notificació arribi a un dispositiu ni que el Service Worker la mostri en un navegador real: el Service Worker té proves unitàries de l’script (`pushServiceWorker.spec.ts`) i la resta es verifica a mà (vegeu «Verificació manual del push» a [17-desplegament-docker.md](17-desplegament-docker.md)).

## E2E de l’avís de cookies

`tools/e2e-cookies.mjs` obre la landing contra una pila local, sense Mailpit ni alta d’entitat. Comprova l’avís, l’enllaç a la política, el tancament, la persistència en recarregar i que no hi ha galetes HTTP. Ho fa a 390 px i a 1280 px. Es nega a córrer si l’app no és a `localhost`.

```bash
docker compose -p espais-e2e up -d --build
node tools/e2e-cookies.mjs
docker compose -p espais-e2e down
```

## TDD

A cada fase de negoci: primer el test del cas d’ús, després implementació, després API i UI.

## Què no testar

- Framework (FastAPI routing bàsic sense regla).
- Snapshot massius de CSS.
- SMTP real.

## CI (Fase 1)

Un job: tests backend + tests frontend. Branca principal protegida quan hi hagi remote.
