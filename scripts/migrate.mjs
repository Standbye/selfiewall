// Wendet die Prisma-Migrations-SQL-Dateien beim Containerstart an,
// ohne die Prisma-CLI ins Produktions-Image zu holen.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const url = process.env.DATABASE_URL ?? "file:./data/db.sqlite";
const dbPath = url.replace(/^file:/, "");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
// WICHTIG: better-sqlite3 erzwingt Fremdschlüssel per Default. Während
// Prisma-Migrationen (Tabellen-Neuaufbau mit DROP TABLE) würde das die
// abhängigen Zeilen per CASCADE löschen — daher für die Migration abschalten.
db.pragma("foreign_keys = OFF");
db.exec(
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
);

const migrationsDir = process.env.MIGRATIONS_DIR ?? "./prisma/migrations";
const applied = new Set(
  db.prepare("SELECT name FROM _migrations").all().map((row) => row.name)
);

for (const name of fs.readdirSync(migrationsDir).sort()) {
  const file = path.join(migrationsDir, name, "migration.sql");
  if (!fs.existsSync(file) || applied.has(name)) continue;
  const sql = fs.readFileSync(file, "utf8");
  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      new Date().toISOString()
    );
    db.exec("COMMIT");
    console.log(`[migrate] applied ${name}`);
  } catch (err) {
    db.exec("ROLLBACK");
    console.error(`[migrate] FAILED ${name}`);
    throw err;
  }
}

db.pragma("foreign_keys = ON");
const violations = db.pragma("foreign_key_check");
if (violations.length > 0) {
  console.error("[migrate] FOREIGN KEY VIOLATIONS:", violations);
  process.exit(1);
}
db.close();
console.log("[migrate] database is up to date");
