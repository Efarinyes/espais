# ADR 0001 — Multi-tenant, una sola aplicació

- **Estat:** acceptat
- **Data:** 2026-09-07

## Context

Cal servir clubs esportius, AAVV, biblioteques i altres tipologies amb la mateixa estructura de codi, sense desplegar un producte per vertical.

## Decisió

Una sola aplicació i un sol esquema. Cada fila de negoci porta `entity_id`. L’autorització es basa en la membership (usuari + entitat + rol). La tipologia de l’entitat és un string lliure, no un mòdul de codi.

## Conseqüències

- Tests d’aïllament obligatoris.
- No hi ha catàleg global d’espais.
- Backlog: un usuari en diverses entitats requereix membership N i selector d’entitat.

## Alternatives rebutjades

- Un desplegament per entitat (operació insostenible).
- Multi-schema Postgres per tenant a v1 (complexitat prematura).
