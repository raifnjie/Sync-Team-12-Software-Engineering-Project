import { execSync } from "node:child_process";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { seed } from "../db/seed";

/**
 * Runs once before all tests: brings the test database up to the latest
 * migration, empties every table, and loads the sample catalog and demo accounts.
 */
export default async function setup(): Promise<void> {
  dotenv.config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Add it to backend/.env (see .env.example) and run `createdb sync_test`."
    );
  }
  // The tables are emptied on every run, so refuse anything that doesn't look like a test database
  const dbName = new URL(url).pathname.slice(1);
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to empty "${dbName}": TEST_DATABASE_URL must name a test database.`);
  }

  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
  await seed(url);
}
