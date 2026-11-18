import type { Course } from "../data/catalog";

/**
 * Prerequisite logic over the course graph (FR-5, FR-6.2, FR-12.2).
 * Everything here is a pure function of plain data, so it can be unit tested
 * without a database or HTTP server.
 */

export interface PrereqCheck {
  ok: boolean;
  /** Each inner array is one unmet group: the student needs any one of these */
  missing: string[][];
}

/**
 * Does the student satisfy a course's prerequisites?
 *
 * @param satisfied courses that count as done (completed, plus in-progress when
 *                  planning for a later term)
 * @param concurrent courses taken in the same term (only count for groups that
 *                   allow concurrent enrollment, i.e. corequisites)
 */
export function checkPrerequisites(
  course: Course,
  satisfied: Set<string>,
  concurrent: Set<string> = new Set()
): PrereqCheck {
  const missing = course.prerequisites
    .filter(
      (group) =>
        !group.anyOf.some(
          (code) => satisfied.has(code) || (group.concurrentAllowed === true && concurrent.has(code))
        )
    )
    .map((group) => group.anyOf);
  return { ok: missing.length === 0, missing };
}

/** Reverse edges: for each course, the courses that list it as a prerequisite */
export function buildDependents(courses: Course[]): Map<string, string[]> {
  const dependents = new Map<string, string[]>();
  for (const course of courses) {
    for (const group of course.prerequisites) {
      for (const code of group.anyOf) {
        const list = dependents.get(code) ?? [];
        if (!list.includes(course.code)) list.push(course.code);
        dependents.set(code, list);
      }
    }
  }
  return dependents;
}

/** Every course reachable downstream of `code`, limited to the `relevant` set */
export function downstreamCourses(
  code: string,
  dependents: Map<string, string[]>,
  relevant: Set<string>
): Set<string> {
  const seen = new Set<string>();
  const stack = [...(dependents.get(code) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (seen.has(next) || !relevant.has(next)) continue;
    seen.add(next);
    stack.push(...(dependents.get(next) ?? []));
  }
  return seen;
}

/**
 * Length of the longest chain of `relevant` courses that must come after `code`.
 * 0 means nothing the student still needs depends on it. Used for the
 * critical-path priority (FR-5.4, FR-7.1).
 */
export function longestChainBelow(
  code: string,
  dependents: Map<string, string[]>,
  relevant: Set<string>,
  memo: Map<string, number> = new Map()
): number {
  const cached = memo.get(code);
  if (cached !== undefined) return cached;
  memo.set(code, 0); // guards against cycles in bad data
  let best = 0;
  for (const next of dependents.get(code) ?? []) {
    if (!relevant.has(next)) continue;
    best = Math.max(best, 1 + longestChainBelow(next, dependents, relevant, memo));
  }
  memo.set(code, best);
  return best;
}

/**
 * Returns one cycle (as a list of course codes) if the prerequisite graph has
 * any, otherwise null. Run this before accepting a catalog import (FR-12.2).
 */
export function findCycle(courses: Course[]): string[] | null {
  const prereqsOf = new Map(courses.map((c) => [c.code, c.prerequisites.flatMap((g) => g.anyOf)]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  function visit(code: string): string[] | null {
    if (state.get(code) === "done") return null;
    if (state.get(code) === "visiting") return [...path.slice(path.indexOf(code)), code];
    state.set(code, "visiting");
    path.push(code);
    for (const prereq of prereqsOf.get(code) ?? []) {
      const cycle = visit(prereq);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(code, "done");
    return null;
  }

  for (const course of courses) {
    const cycle = visit(course.code);
    if (cycle) return cycle;
  }
  return null;
}
