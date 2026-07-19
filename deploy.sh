#!/usr/bin/env bash
# Deployt die Selfiewall auf den Produktionsserver.
# Aufruf: bash deploy.sh
set -euo pipefail

SERVER="root@178.104.197.29"
TARGET="/opt/selfiewall"

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

echo "==> Build & Restart"
ssh "$SERVER" "cd $TARGET && docker compose up -d --build"

echo "==> Health-Check"
sleep 5
ssh "$SERVER" "curl -sf http://127.0.0.1:3006/api/health" && echo " ✓ Selfiewall läuft"
