# ADR 0022 — Sales i tramats sense xoc dins l’entitat

- **Estat:** acceptat
- **Data:** 2026-11-12
- **Relacionat:** [0021](0021-filtre-coordinador-i-colors-sala.md)
- **Esmena:** [0021](0021-filtre-coordinador-i-colors-sala.md), només el xoc de to i el xoc de patró

## Context

Sala Croses i Sala Manilles es veien iguals. No eren dos blaus propers: les dues eren `#1D4ED8`, perquè l’id de cada sala dona el mateix residu entre vuit. Canviar els hex de la llista no les separa.

Josep Oriol i Oriol Ferrer portaven el mateix tramat, unes ratlles verticals que ocupaven mitja casella. El mateix residu entre sis. El dibuix, a més, tapava el color de la sala.

## Decisió

- El to preferit d’una sala continua sent el residu de l’id. Entre les sales actives de l’entitat, si dues el voldrien i encara queda un to lliure, la de l’id més gran en ordre de text passa al següent to lliure. Amb més de vuit sales, el to es pot repetir. L’ordre en què arriba la llista no reparteix colors.
- El patró preferit d’un coordinador continua sent el residu de l’id. Entre els coordinadors de l’entitat, si dos el voldrien i encara queda un patró lliure, el de l’id més gran passa al següent patró lliure. Amb més de sis, el patró es pot repetir. El filtre de la vista no el canvia.
- Els sis dibuixos són figures diferents: punts, escacat, anells, creus, una diagonal i ratlles horitzontals fines. El color de la sala es continua veient. El tramat de «Ocupat» no és cap d’aquests sis.

## Conseqüències

- Una sala pot canviar de color quan se n’afegeix una altra amb un id més petit que vol el mateix to. No canvia si el to preferit de la nova és lliure.
- El mateix val per al patró d’un coordinador nou.
- El farcit de la casella segueix sent el to de la llegenda, amb text a 4,5:1.

## Alternatives rebutjades

- Tornar a canviar els hex sense resoldre el residu compartit.
- Repartir colors segons l’ordre de la llista. Ja rebutjat a l’ADR 0021.
- Desar el to o el patró a la base.
