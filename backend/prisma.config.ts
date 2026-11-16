import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI settings (migrations, seed). The app itself connects in src/db/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
