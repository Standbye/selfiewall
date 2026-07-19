# ---- Abhängigkeiten (inkl. nativer Builds für better-sqlite3/sharp) ----
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- Laufzeit ----
FROM node:22-alpine AS runner
RUN apk add --no-cache su-exec
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATA_DIR=/data \
    DATABASE_URL=file:/data/db.sqlite \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY docker/entrypoint.sh ./entrypoint.sh

# Kein USER-Statement: Der Entrypoint startet als root, setzt die
# Volume-Ownership und wechselt dann selbst per su-exec zu "node".
RUN chmod +x entrypoint.sh && mkdir -p /data && chown -R node:node /data /app

EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
