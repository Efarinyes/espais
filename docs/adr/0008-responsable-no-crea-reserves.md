# ADR 0008 — El responsable no crea reserves

- **Estat:** acceptat
- **Data:** 2026-09-10
- **Relacionat:** [0005](0005-avis-anulacio-coordinador.md)

## Context

v1 permetia al responsable `POST /reserves` «per no bloquejar entitats petites». A la pràctica el responsable ha de governar (horari, anul·lació amb avís) i els coordinadors són qui reserven. Permetre-li crear barrejava els rols i la UI del calendari.

## Decisió

Només el **coordinador** crea reserves. El **responsable** reprograma i anul·la (suspensió) les dels coordinadors. La reprogramació pel responsable continua generant avís in-app + correu (ADR 0005). Push = després.

## Conseqüències

- `CreateReservation` rebutja `MembershipRole.RESPONSIBLE` (`ForbiddenError`, HTTP 403).
- Al calendari, `potReservar` només és cert per al coordinador.
- Les targetes d’espai diuen «Reservar» al coordinador i «Calendari» al responsable.

## Alternatives rebutjades

- Mantenir l’alta del responsable per entitats d’una sola persona (es pot convidar un coordinador, o el responsable actua amb un segon compte coordinador si cal).
