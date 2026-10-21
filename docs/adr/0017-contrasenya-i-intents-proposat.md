# ADR 0017 — Complexitat de contrasenya i límit d’intents

- **Estat:** proposat
- **Data:** 2026-10-21
- **Relacionat:** [0016](0016-registre-no-confirma-email.md)

## Context

La política vigent és la longitud mínima de 8 caràcters, al formulari i a `RegisterEntity`. [docs/05](../05-registre-alta.md) diu «política mínima (longitud)». No hi ha límit d’intents a `POST /sessio`. Cap de les dues coses és al disseny actual: afegir-les és una decisió nova. Aquest ADR no l’accepta i no s’implementa.

## Decisió proposada, no vigent

1. **Contrasenya.** Mantenir el mínim de 8, o exigir regles addicionals (majúscules, xifres, símbols, llista de contrasenyes freqüents). No hi ha mesurador de força.
2. **Intents.** Limitar `POST /sessio` (quants intents, en quina finestra, quina resposta, si el comptador és per email o per adreça) o deixar-ho sense límit, com ara.

## Per què no entra al disseny actual

- La longitud mínima ja és la regla escrita. Una complexitat extra canvia aquesta regla i el missatge de qui es registra.
- No hi ha magatzem ni middleware d’intents. Un límit nou necessita on es compta, quan es buida i què veu la persona. Això no es dedueix de l’ADR 0004 ni de docs/05.

## Conseqüències si s’acceptés

- Caldria esmenar docs/05 i afegir tests del que s’hagués triat.
- Fins que aquest ADR no passi a acceptat, el mínim segueix sent 8 i `POST /sessio` no té límit.

## Alternatives rebutjades en aquest text

- Implementar-ho dins d’aquest canvi, sense la decisió.
- Un mesurador de força o un atac de diccionari per provar el límit.
