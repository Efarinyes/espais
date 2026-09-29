# Desplegament Docker (Alpha+)

Decisió: [ADR 0012](adr/0012-docker-caddy-sqlite-alpha.md).

Caddy és l’únic servei exposat. Serveix la SPA i envia `/api/*` a FastAPI sense el prefix. La base és SQLite al volum `espais_data` (`/data/espais.sqlite3`). Alembic s’aplica sol en arrencar el backend.

## Arquitectura

```text
Internet → Caddy :80/:443 → fitxers de la SPA
                          → /api/* sense prefix → FastAPI :8000 (xarxa interna)
                                              → /data/espais.sqlite3
```

El port 8000 no es publica. Un procés i un worker: la base és SQLite i el lifespan fa el manteniment.

## Requisits locals

- Docker Engine amb Compose v2.
- Els ports 80 i 443 lliures a la màquina on aixeques Compose.
- El desenvolupament sense Docker no canvia: micromamba `espais` i `cd frontend && npm run dev`. No facis `source .env` per als tests: `DATABASE_URL` del `.env` és la ruta de dins del contenidor.

## Arrencada Docker local

```bash
cp .env.example .env
# ESPAIS_DOMAIN=http://localhost
# ESPAIS_SECRET= un valor generat, no CHANGE_ME
docker compose up -d --build
```

Amb `ESPAIS_DOMAIN=http://localhost`, Caddy respon per HTTP al port 80. El nom `localhost` sense esquema fa que Caddy redirigeixi a HTTPS amb el seu certificat intern; per a `curl http://localhost` cal l’esquema `http://`. Obre `http://localhost`.

## Variables `.env`

| Variable | Ús |
|---|---|
| `ESPAIS_DOMAIN` | `http://localhost` en local. Al VPS, el domini públic sense esquema. |
| `ESPAIS_SECRET` | Secret HMAC de sessió. Obligatori: Compose posa `ESPAIS_ENV=production`. |
| `DATABASE_URL` | Dins el contenidor: `sqlite:////data/espais.sqlite3`. Compose ja el fixa. |
| `ESPAIS_SMTP_HOST` | Buit: els avisos queden al log. Si hi ha host, s’envia correu. |
| `ESPAIS_SMTP_PORT` | Per defecte `587`. |
| `ESPAIS_SMTP_FROM` | Remitent. |

`.env` no entra a Git ni a la imatge. `.env.example` sí.

## Generar `ESPAIS_SECRET`

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

No reutilitzis `CHANGE_ME` ni `espais-dev-insegur`. El backend no arrenca en producció amb aquests valors.

## Salut

```bash
curl -i http://localhost/api/salut
```

Ha de respondre `200` i `{"estat":"ok"}`. `http://localhost/iniciar-sessio` ha de tornar l’HTML de la SPA, no JSON.

## Logs, aturar, reiniciar

```bash
docker compose ps
docker compose logs -f
docker compose logs backend
docker compose restart backend
docker compose stop
docker compose up -d
```

`docker compose down` atura i esborra contenidors. No esborra els volums. `down -v` esborra també la base: no ho facis en un servidor amb dades reals.

## Persistència

El volum `espais_data` es munta a `/data`. El primer arrencada, amb el volum buit, Alembic crea l’esquema. Un reinici no recrea la base.

## Còpia de seguretat

Amb el backend en marxa:

```bash
tools/backup-sqlite.sh
```

Escriu `backups/espais-AAAAMMDD-HHMMSS.sqlite3` amb l’API de backup de SQLite (no una còpia a cegues del fitxer). El directori `backups/` no es versiona. Pots passar un altre directori com a argument.

## Restauració

```bash
tools/restore-sqlite.sh --confirmo backups/espais-AAAAMMDD-HHMMSS.sqlite3
```

Sense `--confirmo` no toca res. El script atura els serveis, restaura dins el volum i els torna a engegar. Comprova després `GET /api/salut` i un inici de sessió.

Fes una còpia del servidor abans de substituir dades.

## Importar la base local (opcional)

L’arrel pot tenir `espais.sqlite3` de desenvolupament. No entra a la imatge i Compose no l’importa sol.

Tria una de les dues:

- **A. Volum nou.** No copiïs cap fitxer. El primer `up` crea una base buida ja migrada.
- **B. Importar la base local.** Pot contenir dades de prova. Abans, còpia del servidor amb `tools/backup-sqlite.sh`. Després:

```bash
tools/restore-sqlite.sh --confirmo ./espais.sqlite3
```

## VPS

1. Un Linux amb Docker Engine i el plugin Compose.
2. DNS: un registre A (o AAAA) del domini cap a la IP del VPS.
3. Obre només **80** i **443**. No obris **8000**.
4. Clona el repositori, crea `.env` amb el domini real i un `ESPAIS_SECRET` nou.
5. `docker compose up -d --build`.

Caddy obté i renova el certificat. Els certificats queden als volums `caddy_data` i `caddy_config`, no al disc efímer del contenidor.

Fins que el DNS apunti al servidor, no posis el domini real: el certificat fallaria. En local segueix amb `http://localhost`.

## El que no es fa en aquesta Alpha

PostgreSQL, Redis, Celery, Kubernetes, Swarm, més d’un VPS, un registry d’imatges, ni WebSocket nous. Un worker. Quan calgui escriptura concurrent de veritat, la migració a PostgreSQL es decideix a part (ADR 0012).
