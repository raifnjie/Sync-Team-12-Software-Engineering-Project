import { catalog as sampleCatalog, type CatalogCourse } from "./mockdata";

/* What a student sees for a course on the Prerequisite Map */
export type Availability = "completed" | "in-progress" | "ready" | "locked";

export function findCourse(code: string, catalog: CatalogCourse[] = sampleCatalog) {
  return catalog.find((c) => c.code === code);
}

/* Direct prerequisites as full course objects (unknown codes are skipped) */
export function prereqsOf(course: CatalogCourse, catalog: CatalogCourse[] = sampleCatalog) {
  return course.prereqs
    .map((code) => findCourse(code, catalog))
    .filter((c): c is CatalogCourse => c !== undefined);
}

/* Direct prerequisites the student has NOT completed yet */
export function missingPrereqs(course: CatalogCourse, catalog: CatalogCourse[] = sampleCatalog) {
  return prereqsOf(course, catalog).filter((c) => c.status !== "completed");
}

export function availability(course: CatalogCourse, catalog: CatalogCourse[] = sampleCatalog): Availability {
  if (course.status === "completed") return "completed";
  if (course.status === "in-progress") return "in-progress";
  return missingPrereqs(course, catalog).length === 0 ? "ready" : "locked";
}

/* Courses that list this course as a direct prerequisite */
export function unlocks(code: string, catalog: CatalogCourse[] = sampleCatalog) {
  return catalog.filter((c) => c.prereqs.includes(code));
}

/* Every course needed before this one (prerequisites of prerequisites, and so on).
   Ordered so each course comes after the courses it depends on. The `seen` set also
   protects against a circular prerequisite in bad data. */
export function prereqChain(code: string, catalog: CatalogCourse[] = sampleCatalog) {
  const ordered: CatalogCourse[] = [];
  const seen = new Set<string>([code]);

  function visit(current: string) {
    const course = findCourse(current, catalog);
    if (!course) return;
    for (const p of course.prereqs) {
      if (seen.has(p)) continue;
      seen.add(p);
      visit(p);
      const prereq = findCourse(p, catalog);
      if (prereq) ordered.push(prereq);
    }
  }

  visit(code);
  return ordered;
}
