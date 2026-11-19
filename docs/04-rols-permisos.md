# Rols i permisos

v1 té dos rols dins d’una entitat. No hi ha rol de plataforma.

## Responsable

Pot:

- Completar i editar dades de l’entitat, inclosa la paleta de colors (ADR [0011](adr/0011-paleta-entitat-mode-personal.md)).
- Crear, editar i desactivar espais.
- Convidar coordinadors.
- Veure la llista de coordinadors de l’entitat i filtrar el calendari per una persona (ADR [0021](adr/0021-filtre-coordinador-i-colors-sala.md)).
- Veure **totes** les reserves de l’entitat i canviar-ne el nombre d’assistents.
- Reprogramar i anul·lar qualsevol reserva.
- Veure l’anàlisi d’ús.

No crea reserves. Reprograma i anul·la (suspensió) les que fan els coordinadors, amb avís in-app i correu (ADR [0008](adr/0008-responsable-no-crea-reserves.md)).

## Coordinador

Pot:

- Veure els espais de la seva entitat i la disponibilitat.
- Crear reserves als espais.
- Veure i editar les **seves** reserves (horari mentre no hi hagi conflicte; assistència).
- Cancel·lar les seves reserves (sense avís al responsable per correu a v1; sí visible al llistat del responsable).
- Llegir avisos d’anul·lació/modificació i rebre’ls com a notificació del navegador (Web Push), si ho activa.
- Una reserva que el responsable ha modificat o anul·lat ja no la pot reprogramar ni anul·lar (403); l’assistència sí que la pot registrar (ADR [0026](adr/0026-avisos-web-push-i-reserva-sota-control.md)).

No pot:

- Veure l’anàlisi global.
- Anul·lar reserves d’altres coordinadors.
- Crear o esborrar espais.
- Convidar usuaris.

## Matriu v1

| Acció | Responsable | Coordinador |
|---|---|---|
| Registrar entitat (bootstrap) | sí (ell és el primer) | no |
| Editar entitat | sí | no |
| CRUD espais | sí | no |
| Convidar coordinador | sí | no |
| Crear reserva | no | sí |
| Veure totes les reserves | sí | no |
| Veure les seves reserves | sí | sí |
| Registrar assistència | sí, a qualsevol reserva | sí, a la seva |
| Reprogramar qualsevol reserva | sí | no |
| Reprogramar la seva (si no hi ha conflicte) | sí | sí (v1) |
| Anul·lar com a responsable (amb avís) | sí | no |
| Reprogramar o anul·lar una reserva ja gestionada pel responsable | sí | no |
| Veure l’estat de lectura dels seus avisos (reserves i `/avisos-enviats`) | sí | no |
| Llegir avisos i gestionar subscripcions push | no (403) | sí, només els seus |
| Anul·lar la seva | sí | sí |
| Anàlisi | sí | no |
| Llegir avisos | no | sí |

## Autenticació

Sessió per compte (email + contrasenya a v1). Totes les rutes de negoci exigeixen membership a l’entitat del recurs.

- Un sol login per als dos rols (`POST /sessio` i `POST /sessio/verificacio`). El rol no el tria ningú: surt de la membership a la base, a cada petició (`ResolveSession`). No el porta el token ni el decideix el navegador. La contrasenya correcta encara no obre sessió: el codi arriba només pel Socket.IO de la finestra que ha iniciat el login (ADR [0025](adr/0025-verificacio-login-socket.md)).
- La política d’accions viu a `app/domain/authorization.py`. Cada cas d’ús restringit la consulta i respon 403. El recurs d’una altra entitat, o un avís que no és del coordinador, respon 404.
- La política de pantalles viu a `frontend/src/autoritzacio.ts` i la guarda del router l’aplica. No n’hi ha prou d’amagar el menú. Una ruta privada no es pinta fins que `GET /sessio` confirma el rol. Canviar la ruta o el `localStorage` no dona cap permís: el servidor continua sent l’autoritat.
- El token de sessió és un HMAC amb `sub`, `exp` i `ver`. `require_session` el rebutja si està revocat (ADR [0014](adr/0014-revocar-token-en-sortir.md)) o si `ver` no és el `session_version` de l’usuari.
- Recuperar la contrasenya (responsable o coordinador) puja `session_version`: totes les sessions anteriors cauen i no se n’obre cap de nova (ADR [0018](adr/0018-recuperacio-de-compte.md), [0019](adr/0019-recuperacio-sense-sessio.md)). El rol i els permisos no canvien.
- Si el servidor respon 401 a `GET /sessio`, l’SPA esborra la sessió del navegador i porta a «Inicia sessió».

## Rutes

| Ruta | Accés |
|---|---|
| `/`, `/recuperar`, `/verificar`, `/politica-de-cookies` | pública |
| `/registre`, `/iniciar-sessio`, `/invitar/:token` | només sense sessió confirmada |
| `/espais`, `/calendari` | responsable i coordinador |
| `/espais/nou`, `/espais/:id`, `/analisi`, `/coordinadors/convidar`, `/entitat/colors` | responsable |
| `/avisos` | coordinador |

Qui té sessió i obre `/` va a `/espais`. Una ruta exclusiva denegada també hi torna. `/recuperar` i la política de cookies es queden obertes encara que hi hagi sessió.

## Backlog de rols

- Diversos responsables.
- Transferència del rol de responsable.
- Coordinador en més d’una entitat.
- Rol de només lectura (junta).
