#!/bin/sh
# Restaura una còpia SQLite al volum Docker.
# Substitueix la base actual: cal --confirmo.
# Ús: tools/restore-sqlite.sh --confirmo RUTA_BACKUP
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

CONFIRM=0
FILE=""
for arg in "$@"; do
  case "$arg" in
    --confirmo) CONFIRM=1 ;;
    *) FILE=$arg ;;
  esac
done

if [ "$CONFIRM" -ne 1 ] || [ -z "$FILE" ]; then
  echo "Ús: tools/restore-sqlite.sh --confirmo RUTA_BACKUP" >&2
  echo "Això substitueix la base del volum. Sense --confirmo no es fa res." >&2
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "No existeix el fitxer: $FILE" >&2
  exit 1
fi

SRC=$(CDPATH= cd -- "$(dirname "$FILE")" && pwd)/$(basename "$FILE")

docker compose stop

docker compose run --rm --no-deps --entrypoint python \
  -v "$SRC:/restore-src.sqlite3:ro" \
  backend -c 'import sqlite3
src = sqlite3.connect("/restore-src.sqlite3")
dst = sqlite3.connect("/data/espais.sqlite3")
src.backup(dst)
dst.close()
src.close()
print("restaurat")'

docker compose up -d
echo "Restaurat des de $SRC. Els serveis s'estan engegant."
