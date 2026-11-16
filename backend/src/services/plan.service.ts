import type { Course } from "../data/catalog";
import { checkPrerequisites } from "./prerequisite.service";
import type { PlanEntry, RecordEntry } from "./progress.service";
import { SEASON_LABEL, termIndex, type TermRef } from "./term.service";

/**
 * Degree-plan rules (FR-6.2, FR-6.3). Pure functions: the routes load the
 * record and plan, and these decide what is allowed.
 */

export type PlacementProblem =
  | { reason: "already-taken"; message: string }
  | { reason: "not-offered"; message: string }
  | { reason: "prerequisites"; message: string; missing: string[][] };

/**
 * What would count as done before `term`: completed and in-progress courses,
 * plus courses planned in an earlier term. Courses planned in the same term
 * only count for corequisites.
 */
function satisfiedBefore(term: TermRef, records: RecordEntry[], plan: PlanEntry[], ignore?: string) {
  const index = termIndex(term);
  const satisfied = new Set(records.map((r) => r.code));
  const concurrent = new Set<string>();
  for (const p of plan) {
    if (p.code === ignore) continue;
    const planned = termIndex(p);
    if (planned < index) satisfied.add(p.code);
    else if (planned === index) concurrent.add(p.code);
  }
  return { satisfied, concurrent };
}

/** Returns null when `course` may be placed in `term`, otherwise why not */
export function checkPlacement(
  course: Course,
  term: TermRef,
  records: RecordEntry[],
  plan: PlanEntry[]
): PlacementProblem | null {
  const record = records.find((r) => r.code === course.code);
  if (record) {
    const message =
      record.status === "COMPLETED" ? `You've already completed ${course.code}.` : `You're already taking ${course.code} this term.`;
    return { reason: "already-taken", message };
  }
  if (!course.termsOffered.includes(term.season)) {
    const offered = course.termsOffered.map((s) => SEASON_LABEL[s]).join(" and ");
    return { reason: "not-offered", message: `${course.code} isn't offered in ${SEASON_LABEL[term.season]}. It's offered in ${offered}.` };
  }
  const { satisfied, concurrent } = satisfiedBefore(term, records, plan, course.code);
  const check = checkPrerequisites(course, satisfied, concurrent);
  if (!check.ok) {
    const needs = check.missing.map((g) => g.join(" or ")).join(", and ");
    return {
      reason: "prerequisites",
      message: `${course.code} needs ${needs} first. Add ${check.missing.length === 1 && check.missing[0].length === 1 ? "it" : "them"} to an earlier term.`,
      missing: check.missing,
    };
  }
  return null;
}

/**
 * Prerequisite conflicts already in the plan, for example after the student
 * removes a course that a later course depends on.
 */
export function planConflicts(
  byCode: Map<string, Course>,
  records: RecordEntry[],
  plan: PlanEntry[]
): Map<string, string[][]> {
  const conflicts = new Map<string, string[][]>();
  for (const entry of plan) {
    const course = byCode.get(entry.code);
    if (!course) continue;
    const { satisfied, concurrent } = satisfiedBefore(entry, records, plan, entry.code);
    const check = checkPrerequisites(course, satisfied, concurrent);
    if (!check.ok) conflicts.set(entry.code, check.missing);
  }
  return conflicts;
}
