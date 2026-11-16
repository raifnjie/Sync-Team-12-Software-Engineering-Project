import type { Course, DegreeProgram, TermSeason } from "../data/catalog";
import type { Goal, Opportunity } from "../data/opportunities";
import { fromDbEnum, prisma, toIsoDate } from "../db/prisma";

/**
 * Reads the shared catalog (courses, prerequisites, degree programs,
 * opportunities) from the database and converts it to the plain shapes the
 * services use.
 *
 * The catalog is the same for every user and changes only when an admin
 * imports data, so it is cached in memory and reloaded after an import.
 */
export interface Catalog {
  courses: Course[];
  byCode: Map<string, Course>;
  programs: DegreeProgram[];
  opportunities: Opportunity[];
}

let cached: Promise<Catalog> | null = null;

export function getCatalog(): Promise<Catalog> {
  if (!cached) {
    cached = loadCatalog().catch((error) => {
      cached = null; // don't cache a failure
      throw error;
    });
  }
  return cached;
}

/** Call after changing catalog tables */
export function invalidateCatalog(): void {
  cached = null;
}

async function loadCatalog(): Promise<Catalog> {
  const [courseRows, programRows, opportunityRows] = await Promise.all([
    prisma.course.findMany({
      include: { prerequisiteGroups: { include: { options: true }, orderBy: { id: "asc" } } },
      orderBy: { code: "asc" },
    }),
    prisma.degreeProgram.findMany({
      include: { categories: { include: { courses: true }, orderBy: { position: "asc" } } },
      orderBy: { id: "asc" },
    }),
    prisma.opportunity.findMany({ orderBy: { id: "asc" } }),
  ]);

  const courses: Course[] = courseRows.map((row) => ({
    code: row.code,
    name: row.name,
    credits: row.credits,
    termsOffered: row.termsOffered as TermSeason[],
    tags: row.tags,
    prerequisites: row.prerequisiteGroups.map((group) => ({
      anyOf: group.options.map((o) => o.courseCode).sort(),
      ...(group.concurrentAllowed ? { concurrentAllowed: true } : {}),
    })),
  }));

  const programs: DegreeProgram[] = programRows.map((row) => ({
    id: row.id,
    name: row.name,
    totalCredits: row.totalCredits,
    categories: row.categories.map((category) => ({
      id: category.key,
      name: category.name,
      kind: category.kind === "ALL_OF" ? "all" : "credits",
      courses: category.courses.map((c) => c.courseCode).sort(),
      ...(category.creditsRequired !== null ? { creditsRequired: category.creditsRequired } : {}),
    })),
  }));

  const opportunities: Opportunity[] = opportunityRows.map((row) => ({
    id: row.id,
    category: fromDbEnum<Opportunity["category"]>(row.category),
    kind: fromDbEnum<Opportunity["kind"]>(row.kind),
    title: row.title,
    organization: row.organization,
    description: row.description,
    goals: row.goals.map((g) => fromDbEnum<Goal>(g)),
    tags: row.tags,
    relatedCourses: row.relatedCourses,
    ...(row.deadline ? { deadline: toIsoDate(row.deadline) } : {}),
  }));

  return { courses, byCode: new Map(courses.map((c) => [c.code, c])), programs, opportunities };
}
