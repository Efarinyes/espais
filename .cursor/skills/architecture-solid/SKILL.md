---
name: architecture-solid
description: Revisa capes, SRP i deute tècnic del projecte Espais. Use before closing a phase, after adding a use case, or when the user asks for an architecture or SOLID review.
---

# Architecture and SOLID — Espais

## Preguntes

- Aquest canvi té **una** raó de canviar?
- El router/component Vue calcula negoci?
- Hi ha query sense `entity_id`?
- L’assistència o el mail van per un port?
- S’ha creat un `*Service` calaix de sastre?

## Checklist

- [ ] Un cas d’ús = una acció
- [ ] Ports i adaptadors, no detalls d’infra al domini
- [ ] Front: vistes primes
- [ ] Deute conscient → ADR o tasca al pla
- [ ] Sense `.venv`, sense Vue global
- [ ] Noms de casos d’ús estables (`CreateReservation`, …)

## Recursos

- [docs/10-arquitectura.md](../../../docs/10-arquitectura.md)
- [docs/12-solid-estandards.md](../../../docs/12-solid-estandards.md)
