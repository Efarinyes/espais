# ADR 0014 — Revocar el token en sortir

- **Estat:** acceptat
- **Data:** 2026-10-16
- **Relacionat:** [0004](0004-stack-fastapi-vue3-micromamba.md), [0009](0009-purga-avisos-arxivats.md), [0012](0012-docker-caddy-sqlite-alpha.md)

## Context

En prémer Surt, l’SPA esborra `espais.sessio` de `localStorage` i torna a `/`. El token és un HMAC amb `sub` i `exp`, vàlid set dies. El servidor només comprova la signatura i la caducitat. El mateix Bearer continua sent acceptat fins que caduca.

Cal que Surt deixi inservible aquell token concret. No s’obre una fase nova i no es canvia el model de domini (entitat, usuari, membership). Sortir d’un navegador no tanca la sessió oberta en un altre: cada login emet un token propi.

La base de l’Alpha és el fitxer SQLite `/data/espais.sqlite3` del volum Docker `espais_data`. Alembic s’aplica en arrencar. La darrera migració és `0008_entity_palette`. La purga dels avisos arxivats (ADR 0009) corre al lifespan, a l’arrencada i cada 24 hores. Aquella retenció és de 21 dies des d’`archived_at` i no s’aplica aquí.

## Decisió

- Surt envia el Bearer actual a `POST /sessio/tancament`. El client espera la resposta del servidor abans d’eliminar el token de `localStorage` i de donar la sessió per tancada.
- Si la resposta confirma el tancament, aleshores esborra `espais.sessio` i torna a `/`.
- Si la petició falla, la revocació no queda confirmada. El client conserva el token i la sessió oberta, i informa que el tancament no s’ha pogut confirmar.
- El servidor desa el hash del token i la seva data de caducitat (`exp`). No desa el token en clar. No afegeix cap camp a entitat, usuari ni membership.
- La revocació és una taula SQLite d’aquesta mateixa base, al volum `espais_data`. Un reinici del contenidor, un `up` o un `down` sense esborrar volums conserva les files. `down -v` o una restauració d’una còpia anterior les tracten com la resta de la base.
- La migració és la següent d’Alembic, després de `0008_entity_palette`, i s’aplica amb el mecanisme ja existent a l’arrencada. El model SQLAlchemy forma part de `Base.metadata`, de manera que els tests la creen amb `create_all`.
- La comprovació de revocació forma part del mecanisme d’autenticació existent (`require_session`), no d’una ruta concreta. Qualsevol petició autenticada rebutja el Bearer si el seu hash és a la taula i encara no ha caducat. Un token nou del mateix usuari, emès en un altre login, segueix sent vàlid.
- La purga esborra exclusivament files de revocació amb `exp` ja vençuda. S’executa a l’arrencada i cada 24 hores pel bucle de manteniment existent. No usa la retenció de 21 dies dels avisos arxivats. Fins que `exp` no ha passat, la fila s’ha de conservar: esborrar-la abans faria vàlid un altre cop el token.

## Conseqüències

- Un cas d’ús de tancament, amb tests: el token revocat rep 401 a qualsevol ruta que passi per `require_session`; un token nou del mateix usuari continua acceptat; sense sessió, 401. La purga es prova a part i no esborra revocacions encara vigents.
- El client no navega a `/` com si hagués sortit quan el servidor no ha confirmat el tancament.
- La còpia amb `tools/backup-sqlite.sh` inclou la taula, perquè copia el fitxer sencer.
- El token segueix a `localStorage` mentre la sessió és oberta. Aquesta decisió no el passa a una galeta `HttpOnly`.

## Alternatives rebutjades

- Esborrar el token del navegador abans de la resposta, o esborrar-lo quan la petició falla: el servidor pot no haver revocat res i el client perd el Bearer amb què ho podria tornar a provar.
- Comprovar la revocació només a `GET /api/sessio`: la resta de rutes autenticades continuarien acceptant el token.
- Llista només en memòria del procés: es perd en reiniciar el contenidor i el token tornaria a ser vàlid.
- Retenció de 21 dies, com els avisos arxivats: la fila només cal fins a l’`exp` del token.
- Escurçar el TTL sense revocació: el Bearer seguiria sent vàlid fins a la nova caducitat.
- Comptador de sessió a l’usuari: canvia el model de domini i tanca tots els navegadors alhora.
- Galeta `HttpOnly` amb sessió de servidor: canvia el contracte del client. Queda fora d’aquest ADR.
