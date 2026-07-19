import fs from "node:fs";
import { defineConfig } from "prisma/config";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/db.sqlite",
  },
});
