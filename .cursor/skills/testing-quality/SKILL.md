---
name: testing-quality
description: TDD i contracte de tests Espais (pytest, Vitest, aïllament de tenant, casos d’ús). Use when adding features, writing tests, fixing bugs, or before closing a phase. No use case without tests.
---

# Testing quality — Espais

## Contracte

Cap cas d’ús sense test. Primer el test del cas d’ús (fakes), després adaptadors i UI.

## Sempre cobrir

- Registre atòmic i email duplicat
- Tenant A no veu B
- Noms d’espai unique per entitat
- Solapament de reserves
- Assistència `count`
- Anul·lació + notifier
- Correu caigut no desfa cancel

## Checklist

- [ ] Un comportament per test
- [ ] Fakes de ports al unitari; SQLite als tests d’adaptador
- [ ] Sense SMTP real
- [ ] Front: composables dels fluxos registre / reserva / anul·lació
- [ ] Verds abans de tancar la fase

## Recursos

- [docs/13-testing.md](../../../docs/13-testing.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
