# Notificacions

Skill: `notifications-cancel`. ADR: [0005](adr/0005-avis-anulacio-coordinador.md) (esmenat) i [0026](adr/0026-avisos-web-push-i-reserva-sota-control.md).

## Objectiu v1

Quan el **responsable** anul·la o modifica una reserva, el **coordinador** n’ha de quedar assabentat per poder avisar els participants (que no són usuaris de l’app).

Canals: **in-app** (sempre, persistit), **correu** (si hi ha SMTP) i **Web Push** (si el servidor té VAPID i el coordinador ha activat les notificacions al navegador). No WhatsApp. Un canal que falla no desfà el canvi ni impedeix els altres; l’avís in-app queda sempre.

## Esdeveniments que disparen avís

| Esdeveniment | Destinataris | Obligatori |
|---|---|---|
| Anul·lació pel responsable | Coordinador de la reserva | sí |
| Reprogramació pel responsable | Coordinador | sí |
| Anul·lació pel mateix coordinador | — | no |
| Reprogramació pel mateix coordinador | — | no |
| Reprogramació que no canvia res | — | no (cap avís) |
| Invitació de coordinador | Email convidat | sí, si hi ha SMTP. Sense SMTP o si l’enviament falla, l’enllaç queda per al responsable (14 dies) i la invitació no es desfa |
| Recuperació de compte | El correu demanat | sí, si el compte existeix i l’SMTP respon. Si no existeix, hi ha límit o l’enviament falla, la resposta és la mateixa i no queda cap token viu (ADR [0018](adr/0018-recuperacio-de-compte.md)) |
| Alta / benvinguda | Responsable | opcional al dev |

## Model

`Notification`: `entity_id`, `user_id` (coordinador), `reservation_id`, `type` (`reservation_cancelled` \| `reservation_rescheduled`), `payload` (espai i `space_id`, interval antic/nou, motiu opcional, `changes`: què ha canviat entre `date`, `start_time` i `end_time`), `read_at`, `archived_at`, `created_at`.

Estats d’un avís: *generat* (la fila existeix), *enviat per push* (el servei de push l’ha acceptat; no es persisteix), *rebut pel dispositiu* (no es pot saber) i *llegit* (`read_at`). **Només** llegir l’avís dins d’Espais, amb el coordinador destinatari autenticat, omple `read_at`; rebre o tocar la notificació del navegador no ho fa.

Enviar correu és un **port** (`Notifier`). Implementació v1: un transport SMTP compartit (host, port, remitent, STARTTLS i credencials opcionals); en tests, fake in-memory. El cas d’ús no parla d’SMTP ni de Mailpit.

La invitació de coordinador no passa per aquest `Notifier`: el convidat encara no és usuari. Té un port propi i el mateix transport. Si `ESPAIS_SMTP_HOST` està definit, l’enllaç surt per correu. Si no hi ha SMTP o l’enviament falla, la invitació ja desada es conserva i el responsable copia l’enllaç. Caducitat: 14 dies.

La recuperació de compte té un tercer port. L’enllaç usa `ESPAIS_DOMAIN` i el token va al fragment (`/recuperar#…`). Si l’enviament falla, el token es consumeix: a diferència de la invitació, no es mostra cap enllaç.

## Contingut mínim del correu / avís

- Nom de l’entitat i de l’espai.
- Interval original (i el nou si modificació, amb els aspectes que han canviat: data, hora d’inici, hora de fi).
- Si és modificació («ha estat modificada») o anul·lació («ha estat cancel·lada»).
- Motiu si n’ha escrit. La UI no destaca qui ho ha fet.
- CTA: obrir la reserva a l’app (només si no és anul·lada: una anul·lada ja no surt al calendari).

El coordinador és qui avisa els participants; l’app no té la llista.

## Fallades

- Si el correu o el push fallen, l’avís in-app **igualment es persisteix**. Reintent de correu (cua simple o flag `email_sent_at`). No revertir l’anul·lació perquè hagi fallat SMTP.
- Sense SMTP al desenvolupament: log + in-app, tests amb fake.

## UI

- Indicador de no llegits a la navegació del coordinador. La ruta `/avisos` i `GET /avisos` són només del coordinador: el responsable rep 403.
- Llista d’avisos; marcar com a llegit en obrir.
- El coordinador pot **arxivar** un avís ja llegit: surt de la safata. No es poden arxivar els no llegits. No hi ha restaurar.
- Els avisos arxivats s’**eliminen automàticament al cap de 3 setmanes** (`PurgeArchivedNotifications`, ADR [0009](adr/0009-purga-avisos-arxivats.md)). Els no arxivats no es toquen.
- Confirmació d’anul·lació al responsable: avís explícit que es notificarà el coordinador.
- Cada avís mostra «Modificada» o «Anul·lada» i, si no s’ha llegit, «No llegit». En obrir-lo es marca com a llegit. Hi ha un enllaç «Veure la reserva» (al calendari, al dia i l’espai) si la reserva continua existint.
- Al menú hi ha l’indicador de pendents i, mentre n’hi ha, un bàner a les pantalles del tauler (no a `/avisos`).
- El responsable veu l’estat de lectura (no llegit / llegit i quan) a la reserva, dins el detall del calendari, i a `/avisos-enviats` (necessari per a les anul·lades, que ja no surten al calendari). No es carrega el calendari amb aquesta informació.

## Web Push

- `GET /push/configuracio` diu si el servidor té VAPID i dona la clau pública; `PUT /push/subscripcio` desa la subscripció del navegador; `POST /push/subscripcio/cancelacio` l’esborra. Totes tres són només del coordinador (el responsable rep 403). Cada usuari en té com a màxim 10 (s’esborren les més antigues). Una subscripció és d’un usuari i una entitat; el mateix endpoint no es pot compartir entre usuaris (es reassigna a qui s’hi subscriu).
- El navegador demana permís només després d’un clic. Si l’usuari el denega, l’app ho diu i no insisteix. Es pot desactivar des de la mateixa pantalla.
- En tancar sessió, el navegador cancel·la la subscripció (millor esforç); en entrar de nou es torna a registrar si no s’ha desactivat expressament.
- Les subscripcions caducades (404/410 del servei de push) s’esborren soles.
- El contingut del push és el mateix títol i resum que l’avís; no porta dades de contacte. En tocar-lo s’obre Espais a `/avisos?avis=<id>`.
- Els logs només registren el tipus d’error: mai endpoint, claus ni contingut.
- Requisits i límits: vegeu [17-desplegament-docker.md](17-desplegament-docker.md#web-push-vapid).
