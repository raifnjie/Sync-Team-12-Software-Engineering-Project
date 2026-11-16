import { z } from "zod";
import type { Course } from "../data/catalog";
import { prisma } from "../db/prisma";
import { HttpError } from "../http";
import { findCycle } from "../services/prerequisite.service";
import { getCatalog, invalidateCatalog } from "./catalog.repo";

/**
 * Adds or updates courses and their prerequisites (FR-12.1, FR-12.2).
 * Courses not in the import are left alone. A course's prerequisites are
 * replaced by the ones in the import.
 */
const season = z.enum(["FALL", "SPRING", "SUMMER"]);

export const catalogImportSchema = z.object({
  courses: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(20),
        name: z.string().trim().min(1).max(200),
        credits: z.number().int().min(0).max(12),
        termsOffered: z.array(season).min(1),
        tags: z.array(z.string()).default([]),
        prerequisites: z
          .array(z.object({ anyOf: z.array(z.string()).min(1), concurrentAllowed: z.boolean().optional() }))
          .default([]),
      })
    )
    .min(1, "Send at least one course."),
});

export async function importCourses(input: z.infer<typeof catalogImportSchema>): Promise<number> {
  const incoming: Course[] = input.courses;

  // Validate against the catalog as it would look after the import
  const merged = new Map((await getCatalog()).byCode);
  for (const course of incoming) merged.set(course.code, course);

  for (const course of incoming) {
    for (const code of course.prerequisites.flatMap((g) => g.anyOf)) {
      if (!merged.has(code)) throw new HttpError(400, `${course.code} lists an unknown prerequisite: ${code}.`);
    }
  }
  const cycle = findCycle([...merged.values()]);
  if (cycle) {
    throw new HttpError(400, `Circular prerequisites: ${cycle.join(" → ")}.`, { cycle });
  }

  const codes = incoming.map((c) => c.code);
  await prisma.$transaction(async (tx) => {
    // 1. Every course must exist before prerequisites can point at it
    for (const c of incoming) {
      const data = { name: c.name, credits: c.credits, termsOffered: c.termsOffered, tags: c.tags };
      await tx.course.upsert({ where: { code: c.code }, create: { code: c.code, ...data }, update: data });
    }
    // 2. Replace the imported courses' prerequisites
    await tx.prerequisiteGroup.deleteMany({ where: { courseCode: { in: codes } } });
    for (const c of incoming) {
      for (const group of c.prerequisites) {
        await tx.prerequisiteGroup.create({
          data: {
            courseCode: c.code,
            concurrentAllowed: group.concurrentAllowed ?? false,
            options: { create: [...new Set(group.anyOf)].map((courseCode) => ({ courseCode })) },
          },
        });
      }
    }
  });

  invalidateCatalog();
  return incoming.length;
}
