# ADR 0006 — Tailwind, DaisyUI i PWA instal·lable

- **Estat:** acceptat
- **Data:** 2026-09-08
- **Relacionat:** [0004](0004-stack-fastapi-vue3-micromamba.md)

## Context

La Fase 1 va triar CSS natiu per no carregar un framework. L’eficiència del pla (mobile-first, coordinador al telèfon, pocs components fets a mà) s’aconsegueix millor amb un kit i amb una web instal·lable, no amb una app nativa.

El backend (FastAPI, identitat, espais) no canvia.

## Decisió

- Estils a `frontend/`: **Tailwind CSS** + **DaisyUI**, tema custom **espais** amb paleta mediterrània única (mar `#1677A8`, crema `#FFF8E8`, carbó `#202A2E`). Una paleta per a totes les tipologies; no temes de catàleg Daisy ni per tipus d’entitat.
- **PWA** via `vite-plugin-pwa`: `display: standalone`, nom «Espais», cache de l’esquelet. No és offline de reserves: l’API cal xarxa.
- Vue 3 + Vite + Pinia + Router es mantenen. Dependències només a `frontend/`.

## Conseqüències

- [`docs/11-stack.md`](../11-stack.md) i [`docs/14-ui-ux.md`](../14-ui-ux.md) deixen de fer servir el CSS natiu com a sistema de components.
- Skills `frontend-vue` i `ui-ux-mobile` usen classes Daisy/Tailwind i toc ≥ 44px (`min-h-11`).
- Producció: HTTPS per instal·lar. iOS: «Afegeix a la pantalla d’inici».
- Tests: comportament, no snapshots de classes.

## Alternatives rebutjades

- CSS natiu a v1 (massa feina repetida a formularis i targetes).
- App Store / codi natiu.
- PWA amb cua offline de reserves (Fase 4+; ara confondria).
