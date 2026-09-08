# Espais

Skill: `spaces-definition`. ADR: [0002](adr/0002-espais-definits-per-entitat.md).

## Idea força

Cada entitat nomena i configura els espais. No existeix un espai “Sala 1” global. L’AAVV A i l’AAVV B poden tenir totes dues una “Sala 1”: són files diferents, `entity_id` diferent.

## Atributs v1

| Camp | Obligatori | Notes |
|---|---|---|
| Nom local | sí | Únic per `entity_id` (case-insensitive recomanat) |
| Aforament | sí | Enter > 0 |
| Equipament | no | Llista de strings o text curt |
| Disponibilitat | sí | Finestres recurrents (p. ex. dilluns–divendres 08:00–22:00) o “sempre en horari d’obertura” definible |
| Aforament mínim | no | Enter ≥ 0; no bloqueja reserves a v1 |
| Actiu | sí | Desactivar evita noves reserves; no esborra historial |

## Disponibilitat

Model mínim: una o més finestres `weekday` + `start_time` + `end_time` (fus horari de l’entitat, v1: Europe/Madrid).

Excepcions (festius, tancaments) són backlog; a v1 el responsable reprograma o anul·la.

## Operacions

- Crear / editar: només responsable.
- Llistar: responsable i coordinadors de l’entitat.
- Desactivar: responsable. Les reserves futures es poden deixar o forçar reassignació; v1: desactivar **impedeix noves** reserves; les existents segueixen fins que el responsable les anul·li si cal.

## UI

- Llista d’espais amb aforament i properes reserves.
- Empty state: “Encara no heu definit cap espai. El nom el trieu vosaltres (Sala 1 o Sala Pau Casals).”
- Formulari curt, mobile-first. Equipament com a xips o línies, no inventari.
- Disponibilitat v1 a la UI: un interval per dia de la setmana (es poden desmarcar dies). El model admet més d’una finestra el mateix dia; l’editor no ho exposa encara.

## Invariants

- Cap unique index global sobre `name`.
- Unique `(entity_id, lower(name))`.
- Totes les queries filtren `entity_id`.

## Plantilles de UI (opcional, no model)

Es pot suggerir noms d’exemple segons tipologia («Pista 1», «Sala d’assaig») només com a placeholder del camp nom. En desar, és un string de l’entitat, no un `space_type_id` global.
