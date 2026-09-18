---
name: frontend-vue
description: Frontend Vue 3 local a frontend/ (Composition API, provide/inject, Pinia de sessió, mobile-first). Use when working on Vue views, composables, router, Pinia, Vite, or frontend/ package.json. Never install Vue globally.
---

# Frontend Vue 3 — Espais

## Instal·lació

Només `frontend/`. Mai `npm install -g vue` ni Vue CLI global.

## Separació (analogia Angular)

- Vistes primes (template + a11y).
- Lògica a composables.
- Serveis HTTP via `provide`/`inject`.
- Pinia: sessió i estat transversal, no un store per cada llista.

## Checklist

- [ ] Copy en català, glossari respectat
- [ ] Mobile-first (toc ≥ 44px, `min-h-11`)
- [ ] Tailwind + DaisyUI, paleta d’entitat ADR 0011 (defecte `mar-cel`; mode al navegador)
- [ ] PWA instal·lable; l’API no és offline
- [ ] Estats loading / error / empty
- [ ] Sense regles de solapament només al client (el back valida)
- [ ] TypeScript preferit (Fase 1)
- [ ] Tests Vitest dels composables crítics

## Recursos

- [docs/14-ui-ux.md](../../../docs/14-ui-ux.md)
- [docs/11-stack.md](../../../docs/11-stack.md)
