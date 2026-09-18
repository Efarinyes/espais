# ADR 0011 — Paleta de l’entitat, mode clar/fosc personal

- **Estat:** acceptat
- **Data:** 2026-09-18
- **Esmena:** [0010](0010-aparença-paleta-mode.md)

## Context

L’ADR 0010 desava paleta i mode al navegador, com a gust personal. Això no encaixa si el **responsable** tria els colors de l’entitat i els **coordinadors** han de veure els mateixos. Un valor compartit no és historial de gustos: és **un camp per entitat**.

El mode clar/fosc continua sent una preferència de lectura al dispositiu; no cal compartir-lo.

## Decisió

- **Paleta** (Mar i cel, Camps i cereals, Cítrics i sol, Vinyes): columna `entities.palette`. La canvia només el responsable (`UpdateEntityPalette`). Tothom de l’entitat la llegeix via la sessió (`palette` a login i `GET /sessio`).
- **Mode clar/fosc:** només al navegador (`localStorage`, clau `espais.mode`). No va a la base de dades. Cada persona al seu dispositiu.
- Sense sessió (landing): paleta Mar i cel + el mode del navegador, si n’hi ha.
- El coordinador amb l’app oberta recull un canvi de paleta en recarregar o en tornar a la pestanya (`GET /sessio`). Sense websockets a v1.
- UI: el capçal només té Clar / Fosc. El tauler del responsable té el selector de paleta amb tocs de color; es tanca en triar. El coordinador no el veu. La landing no ofereix paleta.

Les quatre paletes, els tokens Daisy (`data-theme`) i el contrast (text fosc sobre daurats, grocs, cel i pedra) resten els de l’ADR 0010.

## Conseqüències

- Un sol valor per entitat, no una fila per canvi de gust.
- Independència de paleta entre responsable i coordinador: rebutjada; tots veuen la paleta de l’entitat.
- Tests: cas d’ús (responsable desa, coordinador 403, valor tancat, tenant A no pinta B) i UI (capçal sense paleta; tauler del responsable amb swatches).

## Alternatives rebutjades

- Tot al navegador (ADR 0010 sense esmena): el coordinador no veu els colors de l’entitat.
- Desar el mode clar/fosc al servidor: soroll per una opció de dispositiu.
- Selector RGB lliure: trenca el contrast (igual que a l’ADR 0010).
