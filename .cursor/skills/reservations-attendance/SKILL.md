---
name: reservations-attendance
description: Reserves d’espais, conflictes d’horari, reprogramació i assistència per compte. Use when building bookings, calendars, overlaps, RecordAttendance, occupancy counts, or rescheduling.
---

# Reservations and attendance — Espais

## Reserva

`CreateReservation` valida disponibilitat i solapament al backend sempre. v1 estat inicial `confirmed`. Reprogramació: mateixa fila + event log.

## Assistència v1

`RecordAttendance` → port `AttendanceStrategy` → `count` ≥ 0. No llista de noms. No usuaris participants.

## Checklist

- [ ] Solapament: `starts_at < other.ends_at AND ends_at > other.starts_at` i `confirmed`
- [ ] Coordinador només les seves; responsable totes
- [ ] `AttendanceRecord.strategy = count`
- [ ] Aforament mínim: visible, no cancel·la auto
- [ ] `count > capacity`: avís, no bloqueig v1
- [ ] Anul·lació pel responsable: cridar també `notifications-cancel`
- [ ] Tests de solapament, assistència i permisos

## Recursos

- [docs/07-reserves-assistencia.md](../../../docs/07-reserves-assistencia.md)
- [docs/adr/0003-assistencia-per-compte.md](../../../docs/adr/0003-assistencia-per-compte.md)
