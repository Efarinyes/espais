---
name: domain-model
description: Aplica el model de domini Espais (entitat, espai, reserva, persones previstes, rols). Use when changing domain entities, glossary, invariants, occupancy, or when naming tables, use cases, or UI copy.
---

# Domain model — Espais

## Termes (no sinònims)

entitat, responsable, coordinador, espai, reserva, persones previstes, aforament.

UI en català. Classes tècniques en anglès (`Entity`, `Space`, `Reservation`). No `Organization`.

## Invariants

1. Tot accés de negoci porta `entity_id` de la membership.
2. El nom d’espai és únic per entitat, no global.
3. Reserves `confirmed` del mateix espai no solapen.
4. Persones previstes (ADR 0027) = `AttendanceRecord` amb `strategy=count` (nom tècnic històric), opcional, no assistència real ni usuaris participants.
5. Anul·lació pel responsable genera avís al coordinador.
6. Ús intern i gratuït: cap concepte de preu, passarel·la o pagament per ús al model.
7. Una reserva pot ser per a una activitat oberta al públic; a v1 l’autor és sempre un rol de l’entitat.

## Límits

ADR del tema i conflictes de skill: [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md). No canviïs un ADR vigent. Si una inconsistència de domini no està decidida, informa-la; no canviïs el model per fer-lo coherent.

## Checklist

- [ ] Glossari respectat a UI i docs
- [ ] Cap catàleg global d’espais
- [ ] Punt d’extensió (`AttendanceStrategy`) no trencat (port, no `if` a l’API)
- [ ] Casos d’ús amb els noms de [03-model-domini.md](../../../docs/03-model-domini.md)

## Recursos

- [docs/02-glossari.md](../../../docs/02-glossari.md)
- [docs/03-model-domini.md](../../../docs/03-model-domini.md)
