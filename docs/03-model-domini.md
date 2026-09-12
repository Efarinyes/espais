# Model de domini

Skill a cridar: `domain-model`. Glossari: [02-glossari.md](02-glossari.md).

## Relacions

```
Entitat 1 ── * Espai
Entitat 1 ── * Membership (usuari + rol)
Entitat 1 ── * Reserva          (via Espai; sempre amb entity_id)
Espai     1 ── * Reserva
Usuari    1 ── * Membership
Reserva   1 ── 1 AttendanceRecord   (v1: estratègia count)
Reserva   * ── * Avís               (al coordinador)
```

Tota agregació de tenant porta `entity_id`. Un espai no existeix fora d’una entitat.

## Entitat

- `id`, `name`, `typology` (string lliure), `created_at`.
- El primer responsable es crea al mateix cas d’ús de registre ([05-registre-alta.md](05-registre-alta.md)).
- No hi ha jerarquia d’entitats a v1.

## Usuari i membership

- Usuari: identitat (email, nom, credencials).
- Membership: `user_id` + `entity_id` + `role` (`responsible` | `coordinator`).
- v1: un usuari, una membership (una entitat). Multi-entitat és backlog.

## Espai

Vegeu [06-espais.md](06-espais.md).

- `entity_id`, `name` (únic dins l’entitat), `capacity` (aforament), `equipment` opcional, finestres de disponibilitat, `min_attendance` opcional.
- Identificador intern opaque (UUID). El nom no és clau global.

## Reserva

Vegeu [07-reserves-assistencia.md](07-reserves-assistencia.md).

- `entity_id`, `space_id`, `coordinator_id`, `starts_at`, `ends_at`, `status`, motiu/notes opcionals.
- Estats: `pending`, `confirmed`, `cancelled`, `rescheduled`.
- v1 recomanada: crear com a `confirmed` si passa disponibilitat i conflictes. `pending` queda al model per si s’afegeix aprovació.
- `rescheduled`: o bé estat + punter a la reserva nova, o bé la mateixa reserva amb interval actualitzat i historial d’esdeveniments. Preferir **la mateixa reserva + event log** (menys duplicats). Decisió tancada a implementació amb test d’historial.

## Assistència

- `AttendanceRecord`: `reservation_id`, `strategy` (`count` | futur `named_list` | `accounts`), `count` (enter ≥ 0).
- v1 implementa només `count`. No posar columnes de llista nominativa “per si de cas”; el punt d’extensió és `strategy` + taula/estratègia nova.
- ADR: [0003](adr/0003-assistencia-per-compte.md).

## Invariants

1. Cap consulta de negoci sense filtre d’`entity_id` coherent amb la membership de l’actor.
2. Una reserva confirmada no solapa una altra confirmada del mateix espai.
3. L’interval ha de caure dins la disponibilitat de l’espai.
4. El coordinador de la reserva pertany a la mateixa entitat que l’espai.
5. Només el responsable (v1) pot anul·lar o reprogramar en nom de l’entitat; el coordinador pot cancel·lar la seva reserva (sense el mateix avís intern; opcional a v1: sí que pot cancel·lar-la).
6. Anul·lació pel responsable genera avís al coordinador ([08-notificacions.md](08-notificacions.md)).

## Casos d’ús (noms estables)

| Cas d’ús | Fase |
|---|---|
| `RegisterEntity` | 2 |
| `InviteCoordinator` | 4 |
| `CreateSpace` / `UpdateSpace` / `ListSpaces` | 3 |
| `CreateReservation` | 4 |
| `RecordAttendance` | 5 |
| `RescheduleReservation` | 6 |
| `CancelReservationByResponsible` | 6 |
| `GetUsageSummary` | 7 |
| `ListNotifications` / `MarkNotificationRead` | 6 |
| `ArchiveNotification` | post-v1 |
| `PurgeArchivedNotifications` | post-v1 |
