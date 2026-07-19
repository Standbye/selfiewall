-- AlterTable
ALTER TABLE "session" ADD COLUMN "impersonatedBy" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN "banExpires" DATETIME;
ALTER TABLE "user" ADD COLUMN "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN "banned" BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN "role" TEXT;

-- CreateTable
CREATE TABLE "like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "like_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "moderationToken" TEXT,
    "title" TEXT NOT NULL,
    "motto" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#e11d48',
    "bgColor" TEXT NOT NULL DEFAULT '#18181b',
    "logoPath" TEXT,
    "bgImagePath" TEXT,
    "bgDim" INTEGER NOT NULL DEFAULT 40,
    "fontFamily" TEXT NOT NULL DEFAULT 'geist',
    "polaroidColor" TEXT NOT NULL DEFAULT '#ffffff',
    "polaroidRadius" INTEGER NOT NULL DEFAULT 4,
    "customCssUpload" TEXT,
    "customCssWall" TEXT,
    "customCssStream" TEXT,
    "moderationMode" TEXT NOT NULL DEFAULT 'pre',
    "displaySeconds" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_event" ("bgColor", "closedAt", "createdAt", "displaySeconds", "id", "logoPath", "moderationMode", "motto", "ownerId", "primaryColor", "status", "title", "token") SELECT "bgColor", "closedAt", "createdAt", "displaySeconds", "id", "logoPath", "moderationMode", "motto", "ownerId", "primaryColor", "status", "title", "token" FROM "event";
DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";
CREATE UNIQUE INDEX "event_token_key" ON "event"("token");
CREATE UNIQUE INDEX "event_moderationToken_key" ON "event"("moderationToken");
CREATE TABLE "new_photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'photo',
    "name" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploaderKey" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "photo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_photo" ("approvedAt", "createdAt", "eventId", "id", "ip", "message", "name", "status", "uploaderKey") SELECT "approvedAt", "createdAt", "eventId", "id", "ip", "message", "name", "status", "uploaderKey" FROM "photo";
DROP TABLE "photo";
ALTER TABLE "new_photo" RENAME TO "photo";
CREATE INDEX "photo_eventId_status_idx" ON "photo"("eventId", "status");
CREATE INDEX "photo_eventId_uploaderKey_createdAt_idx" ON "photo"("eventId", "uploaderKey", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "like_photoId_deviceKey_key" ON "like"("photoId", "deviceKey");

-- Rollen-Backfill: ältester Account wird Superadmin, alle anderen Veranstalter
UPDATE "user" SET "role" = 'user' WHERE "role" IS NULL;
UPDATE "user" SET "role" = 'admin' WHERE "id" = (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1);
