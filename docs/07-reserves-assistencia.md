# Reserves i persones previstes

Skills: `reservations-attendance`, `notifications-cancel`. ADR: [0003](adr/0003-assistencia-per-compte.md) (esmenat) i [0027](adr/0027-persones-previstes-no-assistencia-real.md) (persones previstes, no assistència real). El nom del fitxer és històric.

## Reserva

Una reserva lliga un **espai**, un **coordinador**, un interval `[starts_at, ends_at)` i un estat. No té preu ni pagament.

Pot correspondre a una activitat interna (entrenament, junta) o oberta a la ciutadania (presentació de llibre, fòrum de pel·lícula). A v1 qui crea la reserva té rol a l’entitat; el públic assistent no cal que sigui usuari de l’app. L’autoservei de reserva per a ciutadania sense rol és backlog, no un camp de la reserva.

### Creació (`CreateReservation`)

1. Actor **coordinador** amb membership a l’entitat de l’espai. El responsable no crea reserves (ADR [0008](adr/0008-responsable-no-crea-reserves.md)).
2. Interval dins la disponibilitat de l’espai.
3. Sense solapament amb una altra reserva `confirmed` del mateix espai.
4. Les **persones previstes** són opcionals: es poden indicar en crear la reserva, però mai no són obligatòries. L’aforament de l’espai no bloqueja la reserva; només avisa (vegeu «Persones previstes»).
5. Estat inicial v1: `confirmed`.

### Reprogramació

- Coordinador: la seva reserva, si el nou interval és lliure. Sense avís.
- Responsable: qualsevol reserva; genera **avís** al coordinador (mateix canal que l’anul·lació) i la reserva queda **sota control del responsable** (`managed_by_responsible`): el coordinador ja no la pot reprogramar ni anul·lar (403). El bloqueig és del registre, no de l’espai ni de la franja (ADR [0026](adr/0026-avisos-web-push-i-reserva-sota-control.md)).

v1: mutar l’interval de la mateixa fila i deixar l’estat en `confirmed`. L’interval antic i el nou van al payload de l’avís. L’event log és backlog del pla; no l’afegeixis si la tasca no ho demana.

### Anul·lació

- Coordinador: la seva; estat `cancelled`; sense correu al responsable a v1.
- Responsable: `CancelReservationByResponsible`; estat `cancelled`; **avís in-app + correu + push** al coordinador. Vegeu [08-notificacions.md](08-notificacions.md). El registre anul·lat es conserva com a històric: no es pot reprogramar, reactivar ni reutilitzar. La franja queda lliure per a una reserva nova i independent. El coordinador no hi pot desar persones previstes.

### Llistats

- Coordinador: les seves (passades i futures), amb les persones previstes.
- Responsable: totes les de l’entitat, amb coordinador, espai, interval, estat i persones previstes.

## Persones previstes

Espais **no registra ni verifica assistència real**. El camp de la reserva és **«Persones previstes»**: el nombre de persones que el coordinador o el responsable estima que participaran, indicat en el moment de reservar (o després, des de la fitxa). És dada de planificació i de control suau d’aforament (ADR [0027](adr/0027-persones-previstes-no-assistencia-real.md)).

- **Opcional.** Crear, modificar o reprogramar una reserva no el demana mai. El zero és un valor vàlid.
- El coordinador l’indica a la seva reserva; el responsable el pot indicar a qualsevol reserva de l’entitat. Es pot actualitzar mentre la reserva no estigui `cancelled`.
- **Avís d’aforament suau**: si el valor supera l’aforament de l’espai l’app avisa («Les persones previstes superen l’aforament de l’espai. Pots continuar igualment.»), i el mateix si no arriba a l’aforament mínim (l’espai en pot tenir; no hi ha formulari a v1). No bloqueja ni canvia cap regla de reserva.
- **No hi ha** confirmacions individuals, registre de participants, rol d’assistent, formulari posterior a l’activitat, notificacions d’assistència ni seguiment de participació.
- Reprogramar una reserva **conserva** el valor, i la resposta de l’API el retorna.
- **Estadístiques no el fa servir** per mesurar assistència: cap indicador, mitjana, columna ni avís, tingui o no valor. Vegeu [09-analisi.md](09-analisi.md).
- Les reserves anteriors a aquest canvi conserven el valor ja desat, que ara es llegeix com a previsió.

### Nom tècnic (històric)

El valor es desa com a `AttendanceRecord` (`strategy = count`, `count` ≥ 0) i s’exposa com `attendance_count` i `PUT /reserves/{id}/assistencia`. No es renomenen: és el mateix camp, amb una altra lectura de domini.

### Extensió (no implementar)

```
AttendanceRecord.strategy: count | named_list | accounts
```

`named_list` i `accounts` requeriran un ADR nou, taules noves, UI nova i, probablement, un rol nou. El cas d’ús `RecordAttendance` va contra un port (`AttendanceStrategy`), no contra un enter incrustat a `Reservation`.

## Conflictes

Solapament: `existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at` i `status = confirmed`.

Missatge d’error clar a la UI: espai, interval conflictiu, coordinador (visible al responsable; al coordinador n’hi ha prou amb “ocupat”).

## Zona horària

Emmagatzemar UTC; mostrar Europe/Madrid a v1. L’interval de disponibilitat es interpreta al TZ de l’entitat.
