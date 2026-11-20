# ADR 0027 — Persones previstes: Espais no registra assistència real

- **Estat:** acceptat
- **Data:** 2026-11-20
- **Relacionat:** [0003](0003-assistencia-per-compte.md) (esmenat), [0008](0008-responsable-no-crea-reserves.md), [0026](0026-avisos-web-push-i-reserva-sota-control.md)

## Context

L’ADR 0003 va introduir un «nombre d’assistents» per reserva, amb la intenció de controlar l’assistència (per exemple, l’aforament mínim) sense convertir els participants en usuaris. A la pràctica:

- Qui indica el nombre és el coordinador (o el responsable), **abans** de l’activitat. L’app no té cap manera de saber quanta gent ha vingut realment: els participants no tenen compte i no hi ha un rol que ho confirmi (ADR 0003 i 0008).
- Que no vingui ningú a una activitat reservada (una lectura compartida, per exemple) no ha d’afectar l’app: és un problema que no es resol amb codi.
- La pàgina d’Estadístiques mostrava una «assistència mitjana» i «sense registrar» com si fos una dada real i incompleta, cosa que convertia una estimació en un indicador d’assistència i en una mena de deute de registre.

## Decisió

**Espais no registra ni verifica assistència real.** El camp de la reserva és **«Persones previstes»**: el nombre de persones que el coordinador o el responsable estima que participaran. Té una funció de **planificació** i de **control suau d’aforament**.

- És **opcional**: mai no és obligatori per crear, modificar o reprogramar una reserva. Es pot indicar en crear la reserva i canviar després des de la fitxa.
- L’**avís d’aforament** és suau i no bloqueja: si les persones previstes superen l’aforament de l’espai (o no arriben a l’aforament mínim, si l’espai en té), l’app avisa i es pot continuar igualment. No canvia cap regla de reserva.
- **No hi ha** confirmació individual, registre de participants, nou rol, formulari posterior a l’activitat, notificacions d’assistència ni seguiment de participació. El coordinador continua avisant els participants fora de l’app (ADR 0003).
- **Estadístiques no tracta aquesta dada com a assistència.** No hi ha indicador, gràfic, mitjana, columna ni avís (ni «sense registrar» ni cobertura de registre). L’absència de dada no genera cap missatge ni estat visual. Les estadístiques es limiten a ocupació, reserves, repartiment entre espais i els indicadors d’ús ja calculats.

**Model i API: es reutilitza el que hi ha.** El valor continua desant-se com a `AttendanceRecord` (`strategy = count`, `count` ≥ 0) darrere del port `AttendanceStrategy`, i s’exposa com `attendance_count` i `PUT /reserves/{id}/assistencia`. Cap migració, cap columna ni ruta renomenada: les reserves existents conserven el valor, que ara es llegeix com a previsió. Els noms tècnics (`attendance`, `AttendanceRecord`, `RecordAttendance`, `/assistencia`, `count`) són **històrics**; el nom de domini i de UI és «persones previstes». El punt d’extensió de l’ADR 0003 (`named_list`, `accounts`) no s’implementa i continua exigint un ADR nou.

L’única correcció de comportament al backend és que la resposta de `POST /reserves/{id}/reprogramacio` ara retorna les persones previstes (abans retornava `null` encara que el valor es conservés a la base de dades, i la fitxa en semblava perdre el valor fins al següent refresc).

## Conseqüències

- Substitueix la part de l’ADR 0003 que presenta el compte com a **assistència** («Cal controlar assistència»). Continua vigent d’aquest ADR: estratègia `count` darrere d’un port, sense llistes incrustades a `Reservation` i sense taules nominatives «per si de cas».
- Deute d’implementació (no ADR): `GET /analisi` encara calcula i retorna `average_attendance`, `unregistered_count` i `below_min_attendance`. Cap consumidor no els fa servir. S’han de retirar en una neteja posterior del backend; mentrestant no es poden presentar com a assistència.
- L’aforament mínim (`min_attendance`) no té formulari a v1 i ja no es veu a Estadístiques. Si s’hi torna, cal tractar-lo com un llindar de previsió, no d’assistència.
- Un control d’assistència real (llista nominativa, comptes, check-in) és backlog i demanaria un ADR nou i un rol nou.

## Alternatives rebutjades

- Mantenir «assistència» a Estadístiques com a «informació estadística»: presenta una estimació com una dada real i fa que la falta de registre sembli un incompliment.
- Fer obligatori el camp: obstaculitza reservar per una dada que només és orientativa.
- Renomenar la columna, la ruta o el DTO: migració i trencament de compatibilitat sense benefici per a l’usuari.
- Un sistema de confirmació o de registre posterior a l’activitat: exigiria un rol que ja es va decidir no tenir.
