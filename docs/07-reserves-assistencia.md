# Reserves i assistència

Skills: `reservations-attendance`, `notifications-cancel`. ADR assistència: [0003](adr/0003-assistencia-per-compte.md).

## Reserva

Una reserva lliga un **espai**, un **coordinador**, un interval `[starts_at, ends_at)` i un estat. No té preu ni pagament.

Pot correspondre a una activitat interna (entrenament, junta) o oberta a la ciutadania (presentació de llibre, fòrum de pel·lícula). A v1 qui crea la reserva té rol a l’entitat; el públic assistent no cal que sigui usuari de l’app. L’autoservei de reserva per a ciutadania sense rol és backlog, no un camp de la reserva.

### Creació (`CreateReservation`)

1. Actor **coordinador** amb membership a l’entitat de l’espai. El responsable no crea reserves (ADR [0008](adr/0008-responsable-no-crea-reserves.md)).
2. Interval dins la disponibilitat de l’espai.
3. Sense solapament amb una altra reserva `confirmed` del mateix espai.
4. Aforament de l’espai no es valida contra assistència (encara no hi ha compte).
5. Estat inicial v1: `confirmed`.

### Reprogramació

- Coordinador: la seva reserva, si el nou interval és lliure. Sense avís.
- Responsable: qualsevol reserva; genera **avís** al coordinador (mateix canal que l’anul·lació).

v1: mutar l’interval de la mateixa fila i deixar l’estat en `confirmed`. L’interval antic i el nou van al payload de l’avís. L’event log és backlog del pla; no l’afegeixis si la tasca no ho demana.

### Anul·lació

- Coordinador: la seva; estat `cancelled`; sense correu al responsable a v1.
- Responsable: `CancelReservationByResponsible`; estat `cancelled`; **avís in-app + correu** al coordinador. Vegeu [08-notificacions.md](08-notificacions.md).

### Llistats

- Coordinador: les seves (passades i futures) + assistència.
- Responsable: totes les de l’entitat, amb coordinador, espai, interval, estat, compte d’assistents.

## Assistència v1

El coordinador registra un **nombre d’assistents** (`count` ≥ 0) a `AttendanceRecord` amb `strategy = count`.

- Es pot actualitzar mentre la reserva no estigui `cancelled`.
- Si hi ha aforament màxim, v1 **adverteix** si `count > capacity`, no bloqueja (decisió suau; es pot endurir amb ADR).
- Aforament mínim: si `count < min_attendance`, marca a l’anàlisi; no cancel·la automàticament.

### Extensió (no implementar)

```
AttendanceRecord.strategy: count | named_list | accounts
```

`named_list` i `accounts` requeriran taules noves i UI nova. El cas d’ús `RecordAttendance` ha d’anar contra un port (`AttendanceStrategy`), no contra un enter incrustat a `Reservation`.

## Conflictes

Solapament: `existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at` i `status = confirmed`.

Missatge d’error clar a la UI: espai, interval conflictiu, coordinador (visible al responsable; al coordinador n’hi ha prou amb “ocupat”).

## Zona horària

Emmagatzemar UTC; mostrar Europe/Madrid a v1. L’interval de disponibilitat es interpreta al TZ de l’entitat.
