---
name: notifications-cancel
description: Avís in-app, correu i Web Push al coordinador quan el responsable anul·la o modifica una reserva, amb lectura confirmada. Use when implementing CancelReservationByResponsible, reschedule by responsible, Notifier port, push subscriptions, or in-app alerts.
---

# Notifications on cancel — Espais

## Regla

Anul·lació o reprogramació **pel responsable** → persisteix `Notification` a la mateixa transacció + `Notifier.send` (correu i push, cada canal aïllat). Fallada de correu o de push no reverteix el canvi ni l’avís in-app. La reserva passa a `managed_by_responsible`: el coordinador ja no la reprograma ni anul·la (ADR 0026).

## Checklist

- [ ] Port `Notifier`; fake als tests
- [ ] In-app + correu + Web Push (VAPID per entorn; sense clau, push desactivat)
- [ ] `read_at` només per lectura dins d’Espais; el push mai no marca llegit
- [ ] Cap secret, endpoint ni clau als logs
- [ ] Bloqueig al backend (403) i al front; la franja alliberada admet una reserva nova
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
- [docs/adr/0026-avisos-web-push-i-reserva-sota-control.md](../../../docs/adr/0026-avisos-web-push-i-reserva-sota-control.md)
