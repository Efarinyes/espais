# ADR 0002 — Espais definits per l’entitat

- **Estat:** acceptat
- **Data:** 2026-09-07

## Context

Les entitats anomenen els espais de maneres incompatibles (Sala 1 vs Sala Pau Casals). Unificar-los per nom o per “tipus” genera coincidències falses.

## Decisió

L’espai és un agregat de l’entitat: nom local únic per `(entity_id, nom)`, aforament, equipament opcional, disponibilitat. Identificador intern opaque. Les plantilles de UI (placeholders) no són identitat de dades.

## Conseqüències

- No hi ha `space_type` global com a clau.
- Informes entre entitats no agreguen “totes les Sala 1”.
- L’alta d’espais és responsabilitat del responsable, no del registre mínim.

## Alternatives rebutjades

- Taxonomia global d’espais (pista, sala, aula) com a identitat.
- Matching fuzzy de noms entre entitats.
