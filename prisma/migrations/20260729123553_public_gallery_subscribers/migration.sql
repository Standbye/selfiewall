-- CreateTable
CREATE TABLE "subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriber_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "wallStyle" TEXT NOT NULL DEFAULT 'grid-live',
    "textColor" TEXT NOT NULL DEFAULT 'auto',
    "titleBackdrop" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderationMode" TEXT NOT NULL DEFAULT 'pre',
    "displaySeconds" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'active',
    "galleryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "galleryToken" TEXT,
    "collectEmails" BOOLEAN NOT NULL DEFAULT false,
    "emailOnClose" BOOLEAN NOT NULL DEFAULT false,
    "galleryMailedAt" DATETIME,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_event" ("bgColor", "bgDim", "bgImagePath", "closedAt", "createdAt", "customCssStream", "customCssUpload", "customCssWall", "displaySeconds", "fontFamily", "id", "logoPath", "moderationMode", "moderationToken", "motto", "ownerId", "polaroidColor", "polaroidRadius", "primaryColor", "status", "textColor", "title", "titleBackdrop", "token", "updatedAt", "wallStyle") SELECT "bgColor", "bgDim", "bgImagePath", "closedAt", "createdAt", "customCssStream", "customCssUpload", "customCssWall", "displaySeconds", "fontFamily", "id", "logoPath", "moderationMode", "moderationToken", "motto", "ownerId", "polaroidColor", "polaroidRadius", "primaryColor", "status", "textColor", "title", "titleBackdrop", "token", "updatedAt", "wallStyle" FROM "event";
DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";
CREATE UNIQUE INDEX "event_token_key" ON "event"("token");
CREATE UNIQUE INDEX "event_moderationToken_key" ON "event"("moderationToken");
CREATE UNIQUE INDEX "event_galleryToken_key" ON "event"("galleryToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_eventId_email_key" ON "subscriber"("eventId", "email");
