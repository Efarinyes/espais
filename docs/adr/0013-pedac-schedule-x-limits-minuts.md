# ADR 0013 — Pedaç local de Schedule-X per a límits de graella amb minuts

- **Estat:** acceptat
- **Data:** 2026-10-05
- **Relacionat:** [0004](0004-stack-fastapi-vue3-micromamba.md), [0007](0007-calendari-polling.md), [0012](0012-docker-caddy-sqlite-alpha.md)

## Context

La graella del calendari va de mitja hora abans de la disponibilitat més d’hora a mitja hora després de la més tardana dels espais de la vista. Amb una sala de 18:00 a 21:00 i una altra de 19:00 a 22:30, la graella és de 17:30 a 23:00. Els límits tenen minuts.

`@schedule-x/calendar` 4.8.0 (i també la 4.9.1, la darrera publicada) no ho permet:

- `validateConfig` rebutja qualsevol `dayBoundaries` que no sigui `HH:00`.
- `computeGridSteps` construeix l’eix des de `floor(start)` fins a `ceil(end)`. Amb 17:30–23:00 dibuixa 12 files de mitja hora per a 11 mitges hores reals. Les etiquetes i les línies no coincideixen amb les reserves.

La resta del motor ja treballa amb minuts: la posició i l’alçada de les reserves, el clic a la graella i el rang de dates.

La solució anterior arrodonia els límits a hores senceres i en retallava la diferència amb CSS. La graella que es veia no era la que Schedule-X usava.

## Decisió

- Es manté Schedule-X 4.8.0, amb la versió fixada exacta a `frontend/package.json`.
- `patch-package` aplica `frontend/patches/@schedule-x+calendar+4.8.0.patch` a `postinstall`, tant a `core.js` (Vite) com a `core.cjs.js` (Vitest):
  - la validació accepta `HH:mm`;
  - si algun límit té minuts, l’eix comença al minut exacte, avança de `gridStep` en `gridStep` fins al final, i l’alçada de cada fila surt dels minuts del dia visible.
- Amb límits a hores senceres, Schedule-X es comporta exactament com sense el pedaç.
- El càlcul dels límits és al front (`configGraella`), sense arrodoniment. L’únic tall és el dia: de 00:00 a 24:00.
- La imatge del front copia `frontend/patches/` abans de `npm ci`.

## Conseqüències

- Graella funcional i graella visible són el mateix rang. Desapareix el CSS de retall.
- Actualitzar Schedule-X obliga a refer el pedaç. `patch-package` avisa si el pedaç no s’aplica.
- Un test de `disponibilitat.spec.ts` renderitza Schedule-X i comprova l’eix i la posició d’una reserva. Si el pedaç no s’aplica, falla.
- Schedule-X amaga sempre l’etiqueta de la primera fila. Amb 17:30–23:00, la primera hora escrita a l’eix és 18:00.
- Amb límits que no són múltiples de 30 minuts (per exemple 17:45), les etiquetes de l’eix cauen a :15 i :45.

## Alternatives rebutjades

- Arrodonir els límits a hores senceres: amplia el rang i contradiu el requisit.
- Retallar o amagar files amb CSS: la graella visible no seria la funcional.
- `skipValidation` sense pedaç de l’eix: les etiquetes queden desplaçades respecte de les reserves.
- Substituir Schedule-X o afegir una altra llibreria de calendari.
