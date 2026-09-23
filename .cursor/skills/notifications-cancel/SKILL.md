---
name: notifications-cancel
description: Avís in-app i correu al coordinador quan el responsable anul·la o reprograma una reserva. Use when implementing CancelReservationByResponsible, reschedule by responsible, Notifier port, or in-app alerts.
---

# Notifications on cancel — Espais

## Regla

Anul·lació o reprogramació **pel responsable** → persisteix `Notification` a la mateixa transacció + `Notifier.send`. Fallada de correu no reverteix el canvi.

## Checklist

- [ ] Port `Notifier`; fake als tests
- [ ] In-app + correu (no push)
- [ ] Payload: entitat, espai, interval, motiu opcional
- [ ] UI coordinador: no llegits + detall + arxivar llegits
- [ ] Purga automàtica dels arxivats als 21 dies
- [ ] Confirmació al responsable: “s’avisarà el coordinador”
- [ ] Test: cas d’ús crida notifier; test: SMTP down no desfa cancel
- [ ] Auto-cancel del coordinador: sense aquest correu a v1
- [ ] Reprogramació pel coordinador: sense aquest avís

## Recursos

- [docs/08-notificacions.md](../../../docs/08-notificacions.md)
- [docs/adr/0005-avis-anulacio-coordinador.md](../../../docs/adr/0005-avis-anulacio-coordinador.md)
