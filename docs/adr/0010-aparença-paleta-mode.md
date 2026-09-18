# ADR 0010 — Paleta i mode clar/fosc per persona

- **Estat:** esmenat per [0011](0011-paleta-entitat-mode-personal.md)
- **Data:** 2026-09-18
- **Relacionat:** [0006](0006-tailwind-daisy-pwa.md)

## Context

L’ADR 0006 fixava una sola paleta mediterrània (tema Daisy `espais`) per a totes les entitats i persones. Això evita «futbol vs teatre» al producte, però impedeix que cada usuari llegeixi l’app com vulgui (clar/fosc, to de color).

La paleta de marca de l’entitat «en desempaquetar» l’app queda per més endavant: no és aquest ADR.

## Decisió

Esmenat per l’ADR [0011](0011-paleta-entitat-mode-personal.md): la paleta passa a ser de l’entitat (BBDD) i només el mode resta al navegador. El que segueix descriu paletes, tokens i contrast, que continuen vigents.

- Independència de tria de paleta entre responsable i coordinador: rebutjada a l’ADR 0011 (tothom veu la paleta de l’entitat).
- Controls: **mode clar o fosc** al capçal; **paleta** al tauler del responsable.
- Quatre paletes tancades (hex de la proposta; no selector lliure RGB):

  | Paleta | Primari | Secundari | Terciari | Fons clar |
  |---|---|---|---|---|
  | Mar i cel (defecte) | `#0B5ED7` | `#14B8A6` | `#BFDBFE` | `#F1F5F9` |
  | Camps i cereals | `#F7B955` | `#6B8E5A` | `#C96F4A` | `#EAD9C6` |
  | Cítrics i sol | `#F97316` | `#FACC15` | `#4CAF50` | `#FFF7E6` |
  | Vinyes i muntanya al mar | `#9B2C3D` | `#8B5CF6` | `#D6C8B6` | pedra clara; `#0F4C75` a títols i mode fosc |

- Cada paleta té variant clara i fosca (`data-theme`: `mar-cel`, `mar-cel-dark`, …).
- Daurats, grocs, cel clar i pedra porten **text fosc**, no blanc (contrast AA).
- No són temes de catàleg Daisy ni per tipologia d’entitat (això continua al backlog).

## Conseqüències

- [`docs/14-ui-ux.md`](../14-ui-ux.md): tokens per paleta; el tema únic `espais` deixa de ser el defecte.
- Colors clauats al calendari i skip-link passen a variables del tema.
- PWA `theme_color` / `background_color` del manifest resten els de Mar i cel; el `theme-color` del document es pot actualitzar en canviar paleta.
- Tests: persistència i `data-theme`, no snapshots de classes.

## Alternatives rebutjades

- Desar el **mode** clar/fosc al servidor / a la fila d’usuari: ompliria la base de dades de soroll per una opció de dispositiu.
- Selector RGB lliure: trenca el contrast.
- Seguir només l’ADR 0006 (un sol blau `#1677A8`): no cobreix clar/fosc ni l’elecció de to.

La paleta compartida per entitat i el rebuig de «res al servidor» per a la paleta queden esmenats a l’ADR [0011](0011-paleta-entitat-mode-personal.md). El mode resta al navegador.
