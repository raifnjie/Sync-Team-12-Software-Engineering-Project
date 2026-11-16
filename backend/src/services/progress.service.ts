import type { Course, DegreeProgram, RequirementCategory, TermSeason } from "../data/catalog";
import { addTerms, currentTerm, makeTerm, nextTerm, termIndex, termKey, type Term, type TermRef } from "./term.service";

/**
 * Degree progress (FR-4), expected graduation (FR-8.1) and the term-by-term
 * timeline (FR-8). Pure functions of plain data: no database access here.
 */

export interface RecordEntry {
  code: string;
  status: "COMPLETED" | "IN_PROGRESS";
  /** null for transfer credit */
  season: TermSeason | null;
  year: number | null;
}

export interface PlanEntry {
  code: string;
  season: TermSeason;
  year: number;
}

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

function creditsOf(code: string, byCode: Map<string, Course>): number {
  return byCode.get(code)?.credits ?? 0;
}

function sumCredits(codes: string[], byCode: Map<string, Course>): number {
  return codes.reduce((sum, code) => sum + creditsOf(code, byCode), 0);
}

/**
 * Status of each requirement category.
 *
 * @param done courses that count as finished (completed, plus in-progress when
 *             looking ahead to next term)
 *
 * A course is applied to the first category that lists it, so it is never
 * counted twice.
 */
export function requirementStatus(
  program: DegreeProgram,
  done: Set<string>,
  byCode: Map<string, Course>
): CategoryStatus[] {
  const applied = new Set<string>();

  return program.categories.map((category) => {
    const counted = category.courses.filter((code) => done.has(code) && !applied.has(code));
    counted.forEach((code) => applied.add(code));
    const notTaken = category.courses.filter((code) => !done.has(code));
    const doneCredits = sumCredits(counted, byCode);

    if (category.kind === "all") {
      const required = sumCredits(category.courses, byCode);
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

/**
 * The fewest terms the remaining required courses need because of
 * prerequisite chains (a 3-course chain takes at least 3 terms).
 */
export function remainingChainLength(required: Set<string>, byCode: Map<string, Course>): number {
  const depth = new Map<string, number>();
  function visit(code: string, seen: Set<string>): number {
    const cached = depth.get(code);
    if (cached !== undefined) return cached;
    if (seen.has(code)) return 0; // guards against bad data with cycles
    seen.add(code);
    let longest = 0;
    for (const group of byCode.get(code)?.prerequisites ?? []) {
      for (const prereq of group.anyOf) {
        if (required.has(prereq)) longest = Math.max(longest, visit(prereq, seen));
      }
    }
    seen.delete(code);
    depth.set(code, longest + 1);
    return longest + 1;
  }
  let best = 0;
  for (const code of required) best = Math.max(best, visit(code, new Set()));
  return best;
}

export interface DegreeProgress {
  credits: { earned: number; inProgress: number; required: number; remaining: number };
  /** Share of required credits already earned, 0-100 */
  percent: number;
  categories: (CategoryStatus & { creditsInProgress: number; state: "complete" | "in-progress" | "not-started" })[];
  expectedGraduation: Term;
  targetGraduation: Term | null;
  /** null when the student hasn't set a target term */
  onTrack: boolean | null;
  /** Fall/spring terms still needed after the current one */
  termsRemaining: number;
}

export function degreeProgress(
  program: DegreeProgram,
  byCode: Map<string, Course>,
  records: RecordEntry[],
  maxCreditsPerTerm: number,
  today: Date,
  target: TermRef | null
): DegreeProgress {
  const completed = records.filter((r) => r.status === "COMPLETED").map((r) => r.code);
  const inProgress = records.filter((r) => r.status === "IN_PROGRESS").map((r) => r.code);
  const earned = sumCredits(completed, byCode);
  const inProgressCredits = sumCredits(inProgress, byCode);

  const doneNow = requirementStatus(program, new Set(completed), byCode);
  const doneByTermEnd = requirementStatus(program, new Set([...completed, ...inProgress]), byCode);

  const categories = doneNow.map((category, i) => {
    const creditsInProgress = doneByTermEnd[i].creditsDone - category.creditsDone;
    const state: "complete" | "in-progress" | "not-started" = category.complete
      ? "complete"
      : category.creditsDone > 0 || creditsInProgress > 0
        ? "in-progress"
        : "not-started";
    return { ...category, creditsInProgress, state };
  });

  // Credits still needed after this term: whichever is larger, the program
  // total or the open requirement categories
  const categoryRemaining = doneByTermEnd.reduce((sum, c) => sum + c.creditsRemaining, 0);
  const remaining = Math.max(0, program.totalCredits - earned - inProgressCredits, categoryRemaining);

  const requiredLeft = new Set(
    doneByTermEnd.filter((c) => c.kind === "all").flatMap((c) => c.openCourses)
  );
  const termsRemaining = Math.max(
    Math.ceil(remaining / Math.max(1, maxCreditsPerTerm)),
    remainingChainLength(requiredLeft, byCode)
  );

  let expectedGraduation: Term;
  if (termsRemaining > 0) {
    expectedGraduation = addTerms(nextTerm(today), termsRemaining - 1);
  } else if (inProgress.length > 0) {
    expectedGraduation = currentTerm(today);
  } else {
    const terms = records.filter((r) => r.season && r.year).map((r) => ({ season: r.season!, year: r.year! }));
    const last = terms.sort((a, b) => termIndex(b) - termIndex(a))[0];
    expectedGraduation = last ? makeTerm(last.season, last.year) : currentTerm(today);
  }

  return {
    credits: { earned, inProgress: inProgressCredits, required: program.totalCredits, remaining },
    percent: program.totalCredits > 0 ? Math.min(100, Math.round((earned / program.totalCredits) * 100)) : 0,
    categories,
    expectedGraduation,
    targetGraduation: target ? makeTerm(target.season, target.year) : null,
    onTrack: target ? termIndex(expectedGraduation) <= termIndex(target) : null,
    termsRemaining,
  };
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineCourseStatus = "completed" | "in-progress" | "planned" | "recommended";

export interface TimelineTerm {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  totalCredits: number;
  courses: { code: string; name: string; credits: number; status: TimelineCourseStatus }[];
}

/**
 * Builds the term-by-term timeline from the record, the plan, and
 * `recommended` (course codes suggested for next term).
 */
export function buildTimeline(
  byCode: Map<string, Course>,
  records: RecordEntry[],
  plan: PlanEntry[],
  recommended: string[],
  today: Date
): TimelineTerm[] {
  const now = termIndex(currentTerm(today));
  const terms = new Map<string, { term: TermRef | null; courses: TimelineTerm["courses"] }>();

  function add(term: TermRef | null, code: string, status: TimelineCourseStatus) {
    const key = term ? termKey(term) : "TRANSFER";
    const entry = terms.get(key) ?? { term, courses: [] };
    const course = byCode.get(code);
    entry.courses.push({ code, name: course?.name ?? code, credits: course?.credits ?? 0, status });
    terms.set(key, entry);
  }

  for (const r of records) {
    add(r.season && r.year ? { season: r.season, year: r.year } : null, r.code, r.status === "COMPLETED" ? "completed" : "in-progress");
  }
  for (const p of plan) add({ season: p.season, year: p.year }, p.code, "planned");

  const taken = new Set([...records.map((r) => r.code), ...plan.map((p) => p.code)]);
  const next = nextTerm(today);
  for (const code of recommended) if (!taken.has(code)) add(next, code, "recommended");

  return [...terms.entries()]
    .sort(([, a], [, b]) => (a.term ? termIndex(a.term) : -1) - (b.term ? termIndex(b.term) : -1))
    .map(([key, { term, courses }]) => {
      const index = term ? termIndex(term) : -1;
      const hasInProgress = courses.some((c) => c.status === "in-progress");
      return {
        id: key.toLowerCase(),
        label: term ? makeTerm(term.season, term.year).label : "Transfer credit",
        status: hasInProgress || index === now ? "current" : index < now ? "completed" : "upcoming",
        totalCredits: courses.reduce((sum, c) => sum + c.credits, 0),
        courses,
      };
    });
}
