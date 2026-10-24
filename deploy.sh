#!/usr/bin/env bash
# Deployt die Selfiewall auf den Produktionsserver.
#
#   bash deploy.sh              → rollt exakt das GitHub-Image zum aktuellen
#                                 Commit aus (wartet auf dessen Build)
#   bash deploy.sh --build      → baut auf dem Server aus dem Quellcode
#                                 (Notnagel, wenn GitHub Actions klemmt)
set -euo pipefail
cd "$(dirname "$0")"

SERVER="root@178.104.197.29"
TARGET="/opt/selfiewall"
BACKUP_DIR="/opt/selfiewall-backups"
REPO="Standbye/selfiewall"
MODE="${1:-pull}"

abort() { echo "!! $1" >&2; [ -n "${2:-}" ] && echo "   $2" >&2; exit 1; }

if [ "$MODE" != "--build" ]; then
  # Alle Prüfungen VOR Backup und Sync: lieber gar nicht deployen als die
  # falsche Version.
  command -v gh >/dev/null 2>&1 \
    || abort "GitHub-CLI (gh) fehlt – ohne sie lässt sich der Build nicht prüfen." "Notnagel: bash deploy.sh --build"
  [ -z "$(git status --porcelain --untracked-files=no)" ] \
    || abort "Es gibt nicht committete Änderungen." "Erst committen und pushen, dann deployen."

  SHA="$(git rev-parse HEAD)"
  SHORT="$(git rev-parse --short=7 HEAD)"
  git fetch -q origin main
  git merge-base --is-ancestor "$SHA" origin/main \
    || abort "Commit $SHORT ist noch nicht auf GitHub." "Erst 'git push', dann erneut deployen."

  # Der Workflow-Lauf erscheint erst einige Sekunden nach dem Push
  echo "==> Suche GitHub-Build für $SHORT"
  RUN_ID=""
  for _ in $(seq 1 18); do
    RUN_ID="$(gh run list --repo "$REPO" --commit "$SHA" --workflow docker.yml --limit 1 \
      --json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true)"
    [ -n "$RUN_ID" ] && break
    sleep 10
  done
  [ -n "$RUN_ID" ] || abort "Nach 3 Minuten kein GitHub-Build für $SHORT gefunden." "Actions prüfen: https://github.com/$REPO/actions"

  echo "==> Warte auf GitHub-Build für $SHORT"
  gh run watch "$RUN_ID" --repo "$REPO" --exit-status >/dev/null \
    || abort "Der GitHub-Build für $SHORT ist fehlgeschlagen." "Log: gh run view $RUN_ID --repo $REPO --log-failed"

  # Exakt dieses Image ausrollen, nicht 'latest'
  IMAGE="ghcr.io/standbye/selfiewall:sha-$SHORT"
fi

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
  echo "==> Image $IMAGE ziehen & Restart"
  ssh "$SERVER" "cd $TARGET && SELFIEWALL_IMAGE=$IMAGE docker compose pull && SELFIEWALL_IMAGE=$IMAGE docker compose up -d"
fi

echo "==> Health-Check"
sleep 5
ssh "$SERVER" "curl -sf http://127.0.0.1:3006/api/health" && echo " ✓ Selfiewall läuft"

echo "==> Laufende Version"
ssh "$SERVER" "docker inspect --format '{{index .Config.Image}}' selfiewall-selfiewall-1"
