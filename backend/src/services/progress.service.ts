import { courseByCode, type DegreeProgram, type RequirementCategory } from "../data/catalog";

/**
 * Degree-requirement status (FR-4.1, FR-4.3). The recommendation engine uses
 * it to know which requirements are still open; the Degree Progress page and
 * GET /api/progress can reuse it.
 */
export interface CategoryStatus {
  id: string;
  name: string;
  kind: RequirementCategory["kind"];
  creditsRequired: number;
  creditsDone: number;
  creditsRemaining: number;
  /** Courses not yet taken that would still count toward this category */
  openCourses: string[];
  complete: boolean;
}

function creditsOf(code: string): number {
  return courseByCode.get(code)?.credits ?? 0;
}

/**
 * @param done courses that count as finished (completed, plus in-progress when
 *             looking ahead to next term)
 *
 * A course is applied to the first category that lists it, so it is never
 * counted twice.
 */
export function requirementStatus(program: DegreeProgram, done: Set<string>): CategoryStatus[] {
  const applied = new Set<string>();

  return program.categories.map((category) => {
    const counted = category.courses.filter((code) => done.has(code) && !applied.has(code));
    counted.forEach((code) => applied.add(code));
    const notTaken = category.courses.filter((code) => !done.has(code));
    const doneCredits = counted.reduce((sum, code) => sum + creditsOf(code), 0);

    if (category.kind === "all") {
      const required = category.courses.reduce((sum, code) => sum + creditsOf(code), 0);
      return {
        id: category.id,
        name: category.name,
        kind: category.kind,
        creditsRequired: required,
        creditsDone: doneCredits,
        creditsRemaining: required - doneCredits,
        openCourses: notTaken,
        complete: notTaken.length === 0,
      };
    }

    const required = category.creditsRequired ?? 0;
    const remaining = Math.max(0, required - doneCredits);
    return {
      id: category.id,
      name: category.name,
      kind: category.kind,
      creditsRequired: required,
      creditsDone: Math.min(doneCredits, required),
      creditsRemaining: remaining,
      openCourses: remaining > 0 ? notTaken : [],
      complete: remaining === 0,
    };
  });
}
