---
name: domain-model
description: Aplica el model de domini Espais (entitat, espai, reserva, assistència, rols). Use when changing domain entities, glossary, invariants, occupancy, or when naming tables, use cases, or UI copy.
---

# Domain model — Espais

## Termes (no sinònims)

entitat, responsable, coordinador, espai, reserva, assistència, aforament.

UI en català. Classes tècniques en anglès (`Entity`, `Space`, `Reservation`). No `Organization`.

## Invariants

1. Tot accés de negoci porta `entity_id` de la membership.
2. El nom d’espai és únic per entitat, no global.
3. Reserves `confirmed` del mateix espai no solapen.
4. Assistència v1 = `AttendanceRecord` amb `strategy=count`, no usuaris participants.
5. Anul·lació pel responsable genera avís al coordinador.
6. Ús intern i gratuït: cap concepte de preu, passarel·la o pagament per ús al model.
7. Una reserva pot ser per a una activitat oberta al públic; a v1 l’autor és sempre un rol de l’entitat.

## Checklist

- [ ] Glossari respectat a UI i docs
- [ ] Cap catàleg global d’espais
- [ ] Punt d’extensió d’assistència no trencat (port, no `if` a l’API)
- [ ] Casos d’ús amb els noms de [03-model-domini.md](../../../docs/03-model-domini.md)

## Recursos

- [docs/02-glossari.md](../../../docs/02-glossari.md)
- [docs/03-model-domini.md](../../../docs/03-model-domini.md)
