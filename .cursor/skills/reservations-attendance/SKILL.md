---
name: reservations-attendance
description: Reserves d’espais, conflictes d’horari, reprogramació i persones previstes (nom tècnic: assistència per compte). Use when building bookings, calendars, overlaps, RecordAttendance, occupancy counts, or rescheduling.
---

# Reservations and expected people — Espais

## Reserva

`CreateReservation` valida disponibilitat i solapament al backend sempre. v1 estat inicial `confirmed`. Reprogramació v1: mateixa fila, estat `confirmed`; l’interval antic/nou va al payload de l’avís. El coordinador reprograma la seva sense avís. No afegeixis event log ni estat viu `rescheduled` si la tasca no ho demana (backlog del pla).

## Persones previstes (ADR 0027)

Espais no registra ni verifica assistència real. El camp és «Persones previstes»: opcional, planificació i avís suau d’aforament. Es pot indicar en crear la reserva i al detall; es conserva en reprogramar. Tècnicament: `RecordAttendance` → port `AttendanceStrategy` → `count` ≥ 0 (noms històrics: `attendance_count`, `/assistencia`). No llista de noms, no confirmacions, no usuaris participants, no rol nou. Estadístiques no el mostra com a assistència.

## Checklist

- [ ] Solapament: `starts_at < other.ends_at AND ends_at > other.starts_at` i `confirmed`
- [ ] Coordinador només les seves; responsable totes
- [ ] `AttendanceRecord.strategy = count`
- [ ] Aforament mínim: visible, no cancel·la auto
- [ ] Persones previstes > aforament: avís suau, no bloqueig; mai obligatori per crear o modificar
- [ ] Cap UI ni text que presenti la previsió com a assistència real
- [ ] Anul·lació pel responsable: cridar també `notifications-cancel`
- [ ] Tests de solapament, persones previstes i permisos

## Recursos

- [docs/07-reserves-assistencia.md](../../../docs/07-reserves-assistencia.md)
- [docs/adr/0003-assistencia-per-compte.md](../../../docs/adr/0003-assistencia-per-compte.md)
