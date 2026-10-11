/*
  Warnings:

  - Added the required column `deviceKey` to the `subscriber` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriber_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Bestandszeilen bekommen eine Platzhalter-Gerätekennung (eindeutig je Zeile)
INSERT INTO "new_subscriber" ("createdAt", "email", "eventId", "id", "deviceKey") SELECT "createdAt", "email", "eventId", "id", 'legacy-' || "id" FROM "subscriber";
DROP TABLE "subscriber";
ALTER TABLE "new_subscriber" RENAME TO "subscriber";
CREATE UNIQUE INDEX "subscriber_eventId_email_key" ON "subscriber"("eventId", "email");
CREATE UNIQUE INDEX "subscriber_eventId_deviceKey_key" ON "subscriber"("eventId", "deviceKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
