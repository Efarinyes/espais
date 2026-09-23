# Anàlisi d’ús

Només el **responsable**. Dades exclusives de la seva `entity_id`.

## Preguntes v1

- Quantes reserves hi ha hagut per espai en un període.
- Quina ocupació horària (hores reservades / hores disponibles).
- Assistència mitjana i comparació amb aforament i aforament mínim.
- Quantes s’han anul·lat. Distingir responsable vs coordinador queda fora de v1 (no hi ha event log ni `cancelled_by`).

## Vistes

1. Resum de l’entitat (període per defecte: mes en curs).
2. Detall per espai.
3. Llista de reserves del període (reutilitza el llistat de govern, amb filtres).

Sense cub OLAP, CSV export opcional backlog. A la UI el responsable veu **Estadístiques** (ruta `/analisi`). Gràfics simples (barres per espai) sense llibreria pesada; taules o targetes.

## Regles

- No filtrar “fora” del tenant.
- Reserves `cancelled` compten a anul·lades, no a ocupació efectiva.
- Assistència: només on hi ha `AttendanceRecord`; si no n’hi ha, “sense registrar”, no zero silencios.

## Privacitat

v1 no mostra persones assistents (no n’hi ha). El nom del coordinador sí és visible al responsable.
