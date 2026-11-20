# Anàlisi d’ús

Només el **responsable**. Dades exclusives de la seva `entity_id`.

## Preguntes v1

- Quantes reserves hi ha hagut per espai en un període.
- Quina ocupació horària (hores reservades / hores disponibles).
- Quantes s’han anul·lat. Distingir responsable vs coordinador queda fora de v1 (no hi ha event log ni `cancelled_by`).

## Vistes

1. Resum de l’entitat (període per defecte: mes en curs).
2. Detall per espai.
3. Llista de reserves del període (reutilitza el llistat de govern, amb filtres).

Sense cub OLAP, CSV export opcional backlog. A la UI el responsable veu **Estadístiques** (ruta `/analisi`). Sense llibreria de gràfics: els donuts són SVG propis.

Composició de la pàgina (dashboard, sense targetes per espai ni per reserva):

1. Capçalera amb el selector de mes i «Mostra d’exemple».
2. Indicadors: ocupació global, reserves (i anul·lades) i espai amb més activitat (més reserves confirmades; a igualtat, més hores reservades).
3. Donut d’ocupació global (hores ocupades, lliures i horari disponible) i donut de reserves confirmades per espai. Cada espai porta sempre el mateix color (el del calendari). Un període sense reserves no dibuixa el donut.
4. Comparativa d’ocupació per espai, del més al menys ocupat (`/analisi#espai-<id>` ressalta la fila).
5. Reserves del període, per ordre cronològic (dia, horari, espai, coordinador i estat).

Un espai sense horari de disponibilitat no té ocupació: es mostra «—», no un 0 %. No hi ha gràfica d’evolució temporal: el backend només dona el resum d’un període i la llista de reserves, sense sèrie històrica, i no se’n fabrica una.

## Regles

- No filtrar “fora” del tenant.
- Reserves `cancelled` compten a anul·lades, no a ocupació efectiva.
- **Cap dada d’assistència.** Espais no registra ni verifica assistència real; les «persones previstes» d’una reserva són planificació i Estadístiques no les fa servir (ni indicador, ni mitjana, ni columna, ni avís de «sense registrar»). Tenir-ne o no, no canvia res a la pàgina (ADR [0027](adr/0027-persones-previstes-no-assistencia-real.md)).
- Deute d’implementació: `GET /analisi` encara retorna `average_attendance`, `unregistered_count` i `below_min_attendance`; el frontend els ignora i s’han de retirar del backend en una neteja posterior.

## Privacitat

v1 no mostra persones assistents ni participants (no n’hi ha). El nom del coordinador sí és visible al responsable.
