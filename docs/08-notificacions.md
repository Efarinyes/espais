# Notificacions

Skill: `notifications-cancel`. ADR: [0005](adr/0005-avis-anulacio-coordinador.md).

## Objectiu v1

Quan el **responsable** anul·la o reprograma una reserva, el **coordinador** n’ha de quedar assabentat per poder avisar els participants (que no són usuaris de l’app).

Canals v1: **in-app + correu**. No push, no WhatsApp. Una notificació clara al dispositiu (Web Push / OS, mòbil o escriptori) quan el responsable anul·la o reprograma queda per **properes sessions**; no cal per a les proves bàsiques.

## Esdeveniments que disparen avís

| Esdeveniment | Destinataris | Obligatori |
|---|---|---|
| Anul·lació pel responsable | Coordinador de la reserva | sí |
| Reprogramació pel responsable | Coordinador | sí |
| Anul·lació pel mateix coordinador | — | no |
| Reprogramació pel mateix coordinador | — | no |
| Invitació de coordinador | Email convidat | sí, si hi ha SMTP. Sense SMTP o si l’enviament falla, l’enllaç queda per al responsable (14 dies) i la invitació no es desfa |
| Alta / benvinguda | Responsable | opcional al dev |

## Model

`Notification`: `entity_id`, `user_id` (coordinador), `reservation_id`, `type` (`reservation_cancelled` \| `reservation_rescheduled`), `payload` (espai, interval antic/nou, motiu opcional), `read_at`, `archived_at`, `created_at`.

Enviar correu és un **port** (`Notifier`). Implementació v1: SMTP configurable; en tests, fake in-memory. El cas d’ús no parla d’SMTP.

La invitació de coordinador no passa per aquest `Notifier`: el convidat encara no és usuari. Té un port propi. Si `ESPAIS_SMTP_HOST` està definit, l’enllaç surt per correu. Si no hi ha SMTP o l’enviament falla, la invitació ja desada es conserva i el responsable copia l’enllaç. Caducitat: 14 dies.

## Contingut mínim del correu / avís

- Nom de l’entitat i de l’espai.
- Interval original (i el nou si reprogramació).
- Qui ho ha fet (responsable) i motiu si n’ha escrit.
- CTA: obrir la reserva a l’app.

El coordinador és qui avisa els participants; l’app no té la llista.

## Fallades

- Si el correu falla, l’avís in-app **igualment es persisteix**. Reintent de correu (cua simple o flag `email_sent_at`). No revertir l’anul·lació perquè hagi fallat SMTP.
- Sense SMTP al desenvolupament: log + in-app, tests amb fake.

## UI

- Indicador de no llegits a la navegació del coordinador.
- Llista d’avisos; marcar com a llegit en obrir.
- El coordinador pot **arxivar** un avís ja llegit: surt de la safata. No es poden arxivar els no llegits. No hi ha restaurar.
- Els avisos arxivats s’**eliminen automàticament al cap de 3 setmanes** (`PurgeArchivedNotifications`, ADR [0009](adr/0009-purga-avisos-arxivats.md)). Els no arxivats no es toquen.
- Confirmació d’anul·lació al responsable: avís explícit que es notificarà el coordinador.
