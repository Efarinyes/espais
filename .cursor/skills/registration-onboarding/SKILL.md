---
name: registration-onboarding
description: Implementa o revisa l’alta d’entitat, responsable i invitació de coordinadors. Use when working on register, signup, onboarding, InviteCoordinator, memberships, or entity bootstrap.
---

# Registration and onboarding — Espais

## v1

Un sol formulari atòmic: entitat (nom + tipologia lliure) + primer responsable. Espais i coordinadors **després**, amb empty state guiat. Transacció única: cap entitat òrfena.

## Checklist

- [ ] `RegisterEntity` és un sol cas d’ús, no barrejat amb `CreateSpace`
- [ ] Email duplicat → error clar
- [ ] Doble submit no crea dues entitats
- [ ] Tipologia = string, no enum tancat
- [ ] Empty state: CTA “defineix el primer espai”
- [ ] Invitació de coordinadors per token; no bloqueja el registre
- [ ] v1: un usuari, una entitat (error si l’email ja té membership)
- [ ] Tests dels casos de [05-registre-alta.md](../../../docs/05-registre-alta.md)

## No fer a v1

Transferència de responsable, multi-responsable, fusió, coordinador multi-entitat.

## Recursos

- [docs/05-registre-alta.md](../../../docs/05-registre-alta.md)
- [docs/04-rols-permisos.md](../../../docs/04-rols-permisos.md)
