# Rols i permisos

v1 té dos rols dins d’una entitat. No hi ha rol de plataforma.

## Responsable

Pot:

- Completar i editar dades de l’entitat, inclosa la paleta de colors (ADR [0011](adr/0011-paleta-entitat-mode-personal.md)).
- Crear, editar i desactivar espais.
- Convidar coordinadors.
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
- Llegir avisos d’anul·lació/reprogramació.

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
| Anul·lar la seva | sí | sí |
| Anàlisi | sí | no |

## Autenticació

Sessió per compte (email + contrasenya a v1). Totes les rutes de negoci exigeixen membership a l’entitat del recurs.

## Backlog de rols

- Diversos responsables.
- Transferència del rol de responsable.
- Coordinador en més d’una entitat.
- Rol de només lectura (junta).
