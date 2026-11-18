import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { config } from "../config";

/**
 * The one shared database client. Prisma opens connections lazily, so importing
 * this file doesn't touch the database until the first query.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.databaseUrl }),
});

/** Database enums are UPPER_SNAKE ("GRAD_SCHOOL"); the API uses kebab-case ("grad-school"). */
export function fromDbEnum<T extends string>(value: string): T {
  return value.toLowerCase().replace(/_/g, "-") as T;
}

export function toDbEnum<T extends string>(value: string): T {
  return value.toUpperCase().replace(/-/g, "_") as T;
}

/** "YYYY-MM-DD" for a DATE column (stored as midnight UTC) */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
