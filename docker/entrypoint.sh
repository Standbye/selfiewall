#!/bin/sh
set -e

# Als root gestartet: Volume-Ownership korrigieren, dann unprivilegiert weiter.
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /data
  exec su-exec node "$0" "$@"
fi

node scripts/migrate.mjs
exec node server.js
