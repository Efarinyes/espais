# ADR 0026 — Avisos amb Web Push, lectura confirmada i reserva sota control del responsable

- **Estat:** acceptat
- **Data:** 2026-11-19
- **Relacionat:** [0005](0005-avis-anulacio-coordinador.md) (esmenat), [0008](0008-responsable-no-crea-reserves.md), [0009](0009-purga-avisos-arxivats.md), [0007](0007-calendari-polling.md), [0025](0025-verificacio-login-socket.md)

## Context

L’ADR 0005 deixava fora el push i només garantia l’avís in-app i el correu. Cal que el **coordinador** s’assabenti de seguida que el **responsable** ha modificat o anul·lat una reserva seva, i que el responsable pugui saber si l’ha llegit. A més, si el coordinador pogués tornar a canviar la reserva, desfaria la decisió del responsable.

## Decisió

**Avís.** Es reutilitza `Notification` (tipus `reservation_rescheduled` i `reservation_cancelled`) i el `Notifier` existents. S’hi afegeix al payload `changes` (`date`, `start_time`, `end_time`) i `space_id`. L’avís es persisteix a la mateixa transacció que el canvi; el correu i el push van després i no la desfan. Cap avís quan el canvi el fa el mateix coordinador.

**Lectura.** `read_at` només s’omple quan el coordinador autenticat llegeix l’avís dins d’Espais (`POST /avisos/{id}/llegit`). Un avís d’un altre usuari respon 404. El push no marca res com a llegit. El responsable veu l’estat de lectura a la reserva (`notice` a `GET /reserves`) i, per a les anul·lades, a `GET /avisos/enviats`.

Es distingeix: *generat* (fila a `notifications`), *enviat* (el servei de push l’ha acceptat; només es registra el recompte, no es persisteix), *rebut pel dispositiu* (no es pot saber: el servei de push no ho confirma) i *llegit* (`read_at`).

**Reserva sota control.** Nova columna `reservations.managed_by_responsible` (booleà). Es posa a cert quan el responsable modifica o anul·la la reserva. El coordinador no pot reprogramar-la ni anul·lar-la (403); una reserva anul·lada tampoc no es pot reactivar. És una propietat del **registre**, no de l’espai ni de la franja: la franja alliberada admet una reserva nova i independent, amb un altre identificador. El coordinador conserva el registre d’assistència d’una reserva modificada. No s’usa l’estat `rescheduled` perquè ja es descartava a l’ADR 0005 (la reserva continua `confirmed`).

La migració `0012_notification_center_push` marca `managed_by_responsible` a les reserves que ja tenen un avís `reservation_rescheduled`. És un **bloqueig retroactiu**: les reserves ja modificades pel responsable abans d’aquesta versió deixen de ser editables pel coordinador.

**Web Push.**
- Subscripcions a `push_subscriptions`, amb `entity_id` i `user_id`, endpoint únic per hash. Només el coordinador s’hi pot subscriure (403 al responsable). Rutes: `GET /push/configuracio`, `PUT /push/subscripcio`, `POST /push/subscripcio/cancelacio`.
- VAPID per variables d’entorn: `ESPAIS_VAPID_PRIVATE_KEY`, `ESPAIS_VAPID_SUBJECT`, i opcionalment `ESPAIS_PUSH_EXTRA_HOSTS`. Sense clau, el push queda desactivat (`enabled: false`) i la resta funciona igual. La clau pública es deriva de la privada.
- Biblioteca `pywebpush` (amb `py-vapid`). Un endpoint ha de ser `https` i d’un host admès (`googleapis.com`, `push.services.mozilla.com`, `push.apple.com`, `notify.windows.com` i els extres): evita que el servidor faci peticions a adreces internes (SSRF).
- Una subscripció que el servei de push dona per caducada (404 o 410) s’esborra. Qualsevol altre error només es registra pel tipus d’excepció, sense endpoint, claus ni contingut.
- Un `ChannelNotifier` aïlla cada canal: si un falla, els altres continuen. L’enviament de push s’executa fora de la petició (`BackgroundNotifier`).
- El permís del navegador només es demana per un clic de l’usuari. En tancar sessió es cancel·la la subscripció del navegador (millor esforç); en entrar al tauler es torna a sincronitzar si l’usuari no l’ha desactivat.

**Centre d’avisos in-app.** Un indicador al menú i un bàner a les pantalles del tauler mentre hi ha avisos sense llegir; `/avisos` mostra Modificada o Anul·lada, «No llegit», el detall i l’enllaç a la reserva (només si encara existeix al calendari). El responsable té `/avisos-enviats`.

**Temps real.** No es fa servir Socket.IO: l’ADR 0025 el limita al login i el calendari continua en polling (ADR 0007). L’avís arriba pel polling existent (20 s). Quan arriba un push amb una pestanya oberta, el Service Worker envia un `postMessage` (`espais-push`) i l’app torna a llegir la llista al backend; això no marca res com a llegit.

**Service Worker.** `vite-plugin-pwa` continua en `generateSW`; el codi de push és a `public/push-sw.js` i s’hi importa amb `workbox.importScripts`, amb un sufix de versió (hash del fitxer) perquè canviar-lo renovi el Service Worker. El SW sempre mostra la notificació (iOS ho exigeix).

## Conseqüències

- Nova migració i nova columna; la retroactivitat del bloqueig s’ha de comunicar a qui desplega.
- Cal HTTPS (o `localhost`) per al push. A iOS només funciona amb la PWA instal·lada a la pantalla d’inici (16.4 o superior).
- Canviar `ESPAIS_VAPID_PRIVATE_KEY` invalida totes les subscripcions: els coordinadors han de tornar-les a activar.
- No hi ha confirmació de recepció al dispositiu.
- El push no s’ha provat en un dispositiu real des del desenvolupament: vegeu [17-desplegament-docker.md](../17-desplegament-docker.md), «Verificació manual del push».

## Alternatives rebutjades

- Estat `rescheduled` com a bloqueig: ja descartat; hauria obligat a tocar el model d’estats.
- Bloquejar l’espai o la franja: impedeix reservar de nou el que s’ha alliberat.
- Reutilitzar Socket.IO per als avisos: contradiu l’ADR 0025 i exigiria un segon canal a l’únic worker.
- Un servei extern de push (FCM propi, OneSignal): dependència i dades fora; el protocol estàndard Web Push ja cobreix els navegadors.
- Marcar com a llegit en rebre el push: un push rebut no demostra que s’hagi llegit.
