# ADR 0007 — Calendari viu per polling HTTP

- **Estat:** acceptat
- **Data:** 2026-09-08
- **Relacionat:** [0004](0004-stack-fastapi-vue3-micromamba.md)

## Context

El calendari del responsable (i el d’un espai obert) només tornava a cridar `GET /reserves` en canviar de setmana o recarregar. Si un coordinador reservava en un altre dispositiu, la pantalla oberta no es movia.

Cal actualització sense F5, sense Redis, i sense tancar la porta a un canal push (SSE/WebSocket) si un cas d’ús futur ho exigeix (p. ex. dos coordinadors reservant el mateix espai a l’hora, o un responsable que ha de veure l’ocupació a l’instant).

## Decisió

- v1: **polling HTTP** (~20 s) de `GET /reserves` mentre el calendari és visible, més un refetch en `visibilitychange` (tornar a la pestanya). Acotat a `entity_id` com la resta de l’API.
- El disparador és un **port de front** (`DisparadorCalendari`): `iniciar(avisar) → aturar`. L’adaptador actual és polling. Un adaptador SSE/WebSocket futur crida el mateix `avisar` (refetch + `eventsService.set`); no es reescriu Schedule-X.
- No WebSocket/SSE a v1: SQLite no notifica canvis; un hub en memòria falla amb més d’un worker; Redis queda fora de l’stack v1.

## Conseqüències

- El calendari es pot desfasar fins a ~20 s (o menys en tornar a la pestanya). El solapament el valida sempre el backend.
- Canviar a push és un adaptador nou + ADR d’infra (Postgres `NOTIFY` o equivalent), no un refactor del cas d’ús `ListReservations`.
- Tests: el disparador s’injecta; el polling es prova amb rellotge fals, no amb Uvicorn.

## Alternatives rebutjades (v1)

- WebSocket/SSE ara (infra i auth de canal sense guany real amb SQLite).
- Només refetch en focus de pestanya (el responsable que deixa la pantalla oberta no veuria res).
- Polling dins la vista, sense port (tancaria la porta als sockets).
