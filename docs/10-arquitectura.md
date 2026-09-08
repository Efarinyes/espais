# Arquitectura

Skill: `architecture-solid`. Estàndards: [12-solid-estandards.md](12-solid-estandards.md). Stack: [11-stack.md](11-stack.md).

## Forma

Una aplicació web: SPA Vue 3 (mobile-first) + API FastAPI. Multi-tenant lògic: una sola desplegada, aïllament per `entity_id`.

```
Vue (vistes primes)
  → composables / serveis injectats (provide/inject)
  → HTTP API
FastAPI (routers prims)
  → casos d’ús (un per acció de negoci)
  → ports (repositoris, notifier, clock)
  → adaptadors (SQLAlchemy, SMTP, fake a tests)
```

## Capes backend

| Capa | Responsabilitat | No hi va |
|---|---|---|
| API | HTTP, auth, status codes, DTOs Pydantic | Regles de solapament, emails |
| Casos d’ús | Orquestració d’una acció | Detalls SQL, Vue, FastAPI |
| Domini | Invariants, valors, estats | I/O |
| Repositoris (port + adaptador) | Persistència | Regles d’anul·lació |
| Infra | DB, correu, config | Lògica de reserva |

Un cas d’ús = un mòdul/classe (`RegisterEntity`, `CreateSpace`, `CreateReservation`, `RecordAttendance`, `CancelReservationByResponsible`, `RescheduleReservation`).

## Multi-tenant

ADR [0001](adr/0001-multi-tenant-una-app.md).

- `entity_id` a totes les taules de negoci.
- El context d’auth aporta `user_id` + `entity_id` + `role`.
- Repositoris exigeixen `entity_id`; prohibides queries “globals” d’espais o reserves.
- Tests d’aïllament: entitat B no llegeix files d’A.

## Front

- Vistes: layout, binding, accessibilitat.
- Composables: estat de pantalla, crides als serveis.
- Serveis HTTP injectats (`provide`/`inject`), no singletons ocults.
- Pinia només per sessió d’auth i estat realment transversal. No un store per cada entitat de negoci si un composable n’hi ha prou.

Analogia Angular: Composition API ≈ lògica; `provide`/`inject` ≈ DI; reactivitat Vue 3 ≈ signals.

## Directori (Fase 1)

```
backend/
  app/api/
  app/usecases/
  app/domain/
  app/ports/
  app/adapters/
  tests/
frontend/
  src/views/
  src/composables/
  src/services/
  src/components/
environment.yml
```

```
backend/
  app/api/
  app/usecases/
  app/domain/
  app/ports/
  app/adapters/
  tests/
frontend/
  src/views/
  src/composables/
  src/services/
  src/components/
environment.yml
```

## Transaccions i efectes

`CancelReservationByResponsible`: transacció (estat + Notification persistida); després `Notifier.send`. Fallada de correu no desfa l’anul·lació.

## Relllotge i ID

Ports `Clock` i generador d’UUID per tests deterministes.
