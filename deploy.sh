#!/usr/bin/env bash
# Deployt die Selfiewall auf den Produktionsserver.
#
#   bash deploy.sh              → wartet auf das GitHub-Image und zieht es
#   bash deploy.sh --build      → baut auf dem Server aus dem Quellcode
#                                 (Notnagel, wenn GitHub Actions klemmt)
set -euo pipefail

SERVER="root@178.104.197.29"
TARGET="/opt/selfiewall"
BACKUP_DIR="/opt/selfiewall-backups"
MODE="${1:-pull}"

echo "==> Backup der Produktionsdaten (nach $BACKUP_DIR, außerhalb des Sync-Ziels)"
ssh "$SERVER" "mkdir -p $BACKUP_DIR && cp -r $TARGET/data $BACKUP_DIR/data-\$(date +%Y%m%d-%H%M%S) && ls -dt $BACKUP_DIR/data-* | tail -n +11 | xargs -r rm -rf"

echo "==> Sync nach $SERVER:$TARGET"
rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude data \
  --exclude .env \
  --exclude .claude \
  --exclude tsconfig.tsbuildinfo \
  ./ "$SERVER:$TARGET/"

if [ "$MODE" = "--build" ]; then
  echo "==> Build auf dem Server & Restart"
  ssh "$SERVER" "cd $TARGET && docker compose up -d --build"
else
  # Auf den Image-Build zum aktuellen Commit warten, damit nicht versehentlich
  # eine ältere Version ausgerollt wird.
  if command -v gh >/dev/null 2>&1; then
    SHA="$(git rev-parse HEAD)"
    RUN_ID="$(gh run list --commit "$SHA" --workflow docker.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    if [ -n "${RUN_ID:-}" ]; then
      echo "==> Warte auf GitHub-Build für ${SHA:0:7}"
      gh run watch "$RUN_ID" --exit-status >/dev/null || {
        echo "!! Der GitHub-Build ist fehlgeschlagen – Abbruch." >&2
        echo "   Notnagel: bash deploy.sh --build" >&2
        exit 1
      }
    else
      echo "!! Kein GitHub-Build für ${SHA:0:7} gefunden – es wird das aktuelle 'latest' ausgerollt."
    fi
  fi

  echo "==> Image ziehen & Restart"
  ssh "$SERVER" "cd $TARGET && docker compose pull && docker compose up -d"
fi

echo "==> Health-Check"
sleep 5
ssh "$SERVER" "curl -sf http://127.0.0.1:3006/api/health" && echo " ✓ Selfiewall läuft"

echo "==> Laufende Version"
ssh "$SERVER" "docker inspect --format '{{index .Config.Image}}' selfiewall-selfiewall-1"
