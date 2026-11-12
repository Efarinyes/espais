# ADR 0020 — Paletes aprovades

- **Estat:** acceptat
- **Data:** 2026-11-12
- **Esmena:** la taula de hex de [0010](0010-aparença-paleta-mode.md). No esmena la separació de [0011](0011-paleta-entitat-mode-personal.md).

## Context

L’ADR 0010 fixava els hex de les quatre famílies. L’ADR 0011 va deixar la paleta a l’entitat i el mode clar/fosc al navegador, i va mantenir aquells hex. La decisió D-PALETA els havia deixat quiets fins a una aprovació.

Les quatre famílies s’han aprovat. La font dels valors és [`docs/ux/colors/PROPOSTA-PALETES.md`](../ux/colors/PROPOSTA-PALETES.md) i la previsualització [`docs/ux/colors/proposta-paletes.html`](../ux/colors/proposta-paletes.html).

## Decisió

- S’implementen els hex aprovats, sense reinterpretar-los. Vuit temes, els mateixos identificadors: `mar-cel`, `mar-cel-dark`, `camps`, `camps-dark`, `citrics`, `citrics-dark`, `vinyes`, `vinyes-dark`.
- El nom visible de `vinyes` és **Vinyes vora al mar**. L’identificador, la clau de la base i la clau del tema no canvien.
- La paleta continua sent de l’entitat i el mode, personal. El `theme-color` del document segueix el primari del tema actiu. El manifest i la icona, abans de triar, són el primari de Mar i cel `#1B4F86` i el fons `#F3F6F6`.
- Correspondència amb DaisyUI, sense una segona arquitectura de color:
  - `base-200` és el fons de pàgina. `base-100` és la targeta, el capçal i el calaix. `base-300` és la vora.
  - `--color-raised` és el diàleg, el desplegable i el camp. `--color-muted` és el text secundari, sòlid. `--color-heading` és el títol i el focus.
  - Primari, secundari i accent són els botons i els tocs. Si el farcit no es separa sol del fons, la vora aprovada (`--color-primary-border`, `--color-secondary-border`, `--color-accent-border`) fa de límit.
  - Èxit, avís i informació: el color Daisy és el text i el farcit del botó; `*-content` és el text del botó; `*-soft` és el fons de l’avís. Són els mateixos a les quatre famílies.
  - L’error en té dos: `error` és el text i la vora de l’avís; `error-solid` amb `error-content` és el botó; `error-soft` és el fons de l’avís.
- Els vuit colors de sala de `colorsCalendari.ts` no formen part d’aquestes famílies i no es canvien. El crom del calendari Schedule-X segueix els tokens del tema actiu. La lògica del calendari no canvia.

## Conseqüències

- Els hex publicats deixen de ser els de l’ADR 0010.
- Un farcit clar (blat, llimona, fulla, pedra) porta la vora aprovada perquè el límit arribi a 3:1. El text del botó es mesura a 4,5:1 sobre el farcit.
- Les barres curtes de gràfic porten la vora del tema, perquè un farcit clar sobre la pàgina no faria de límit ell sol.
- Els enllaços de text (`.link-primary`) usen el color de títol, no el primari. El primari aprovat de Camps i el de Cítrics són farcits clars: com a text sobre la pàgina no arriben a 4,5:1. El color de títol sí.

## Alternatives rebutjades

- Tornar a triar hex perquè un component de DaisyUI només té dos papers: s’adapta el component al valor aprovat.
- Canviar `vinyes` o `vinyes-dark`: trencaria la paleta desada a les entitats.
- Repintar els vuit colors de sala: no és la decisió d’aquesta paleta.
