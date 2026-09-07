# ADR 0003 — Assistència per compte (extensible)

- **Estat:** acceptat
- **Data:** 2026-09-07

## Context

Cal controlar assistència (p. ex. aforament mínim) sense convertir els participants en usuaris a v1. Cal deixar porta oberta a llista nominativa o comptes.

## Decisió

v1: `AttendanceRecord` amb `strategy = count` i un enter `count`. El cas d’ús `RecordAttendance` depèn d’un port d’estratègia. No s’incrusten llistes a `Reservation`. No es creen taules nominatives “per si de cas”.

## Conseqüències

- Anàlisi sobre nombres, no sobre persones.
- El coordinador avisa participants fora de l’app.
- Afegir `named_list` / `accounts` serà un ADR nou + adaptador, sense reescriure reserves ni permisos.

## Alternatives rebutjades

- Participants amb compte des del dia u.
- Columna JSON “llista de noms” a la reserva (deute i sense port).
