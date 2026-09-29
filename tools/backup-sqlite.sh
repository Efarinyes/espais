#!/bin/sh
# Còpia consistent de /data/espais.sqlite3 del volum Docker.
# Ús: tools/backup-sqlite.sh [directori]
# El backend ha d'estar en marxa. No commitis el fitxer resultant.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if ! docker compose ps --status running --services | grep -qx backend; then
  echo "El backend ha d'estar en marxa per fer la còpia." >&2
  exit 1
fi

DEST_DIR=${1:-"$ROOT/backups"}
mkdir -p "$DEST_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$DEST_DIR/espais-$STAMP.sqlite3"
TMP=/tmp/espais-backup.sqlite3

docker compose exec -T backend python -c 'import os, sqlite3
src = sqlite3.connect("/data/espais.sqlite3")
if os.path.exists("/tmp/espais-backup.sqlite3"):
    os.remove("/tmp/espais-backup.sqlite3")
dst = sqlite3.connect("/tmp/espais-backup.sqlite3")
src.backup(dst)
dst.close()
src.close()'

docker compose cp "backend:$TMP" "$OUT"
docker compose exec -T backend rm -f "$TMP"

echo "$OUT"
