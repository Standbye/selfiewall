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
    "wallStyle" TEXT NOT NULL DEFAULT 'grid-live',
    "textColor" TEXT NOT NULL DEFAULT 'auto',
    "titleBackdrop" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderationMode" TEXT NOT NULL DEFAULT 'pre',
    "displaySeconds" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_event" ("bgColor", "bgDim", "bgImagePath", "closedAt", "createdAt", "customCssStream", "customCssUpload", "customCssWall", "displaySeconds", "fontFamily", "id", "logoPath", "moderationMode", "moderationToken", "motto", "ownerId", "polaroidColor", "polaroidRadius", "primaryColor", "status", "title", "token", "wallStyle") SELECT "bgColor", "bgDim", "bgImagePath", "closedAt", "createdAt", "customCssStream", "customCssUpload", "customCssWall", "displaySeconds", "fontFamily", "id", "logoPath", "moderationMode", "moderationToken", "motto", "ownerId", "polaroidColor", "polaroidRadius", "primaryColor", "status", "title", "token", "wallStyle" FROM "event";
DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";
CREATE UNIQUE INDEX "event_token_key" ON "event"("token");
CREATE UNIQUE INDEX "event_moderationToken_key" ON "event"("moderationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
