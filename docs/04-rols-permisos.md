# Rols i permisos

v1 té dos rols dins d’una entitat. No hi ha rol de plataforma.

## Responsable

Pot:

- Completar i editar dades de l’entitat.
- Crear, editar i desactivar espais.
- Convidar coordinadors.
- Veure **totes** les reserves de l’entitat i la seva assistència.
- Reprogramar i anul·lar qualsevol reserva.
- Veure l’anàlisi d’ús.

No cal que creï reserves, però no està prohibit (pot actuar com a coordinador si també té el rol, o se li permet crear-ne: v1 **permet** al responsable crear reserva, per no bloquejar entitats petites).

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
| Crear reserva | sí | sí |
| Veure totes les reserves | sí | no |
| Veure les seves reserves | sí | sí |
| Registrar assistència (pròpia reserva) | sí si n’és l’autor | sí |
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
