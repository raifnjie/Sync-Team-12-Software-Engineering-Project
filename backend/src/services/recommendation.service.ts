import { courseByCode, type Course, type DegreeProgram, type TermSeason } from "../data/catalog";
import type { Goal, Opportunity } from "../data/opportunities";
import type { StudentRecord } from "../data/students";
import { buildDependents, checkPrerequisites, downstreamCourses, longestChainBelow } from "./prerequisite.service";
import { requirementStatus } from "./progress.service";

/**
 * Rule-based recommendations (FR-7, FR-10.4; SRS 5.2).
 *
 * Courses:       filter to eligible courses that count toward an open
 *                requirement, score them, rank them, fit them to a credit
 *                limit, and explain every score with plain-language reasons.
 * Opportunities: score post-grad options and experiences by goal, interests,
 *                readiness (related courses taken), and deadline.
 *
 * The weights are kept together below so they are easy to tune and document.
 */
export const COURSE_WEIGHTS = {
  requiredCourse: 40,
  electiveBase: 10,
  electiveNeed: 15, // scaled by the share of elective credits still needed
  perUnlockedCourse: 6,
  maxUnlockedCourses: 4,
  perChainStep: 7,
  maxChainSteps: 3,
  perInterestMatch: 10,
  maxInterestMatches: 2,
  leadsToInterest: 5,
  goalMatch: 5,
  onlyOfferedThisTerm: 5,
};

export const OPPORTUNITY_WEIGHTS = {
  goalMatch: 40,
  undecidedGoal: 15,
  perInterestMatch: 12,
  maxInterestMatches: 2,
  readiness: 25, // scaled by the share of related courses taken
  deadlineSoon: 10,
  deadlineSoonDays: 60,
  minimumScore: 20, // weaker matches are left out
};

/** Course tags that support each post-graduation goal */
export const GOAL_TAGS: Record<Goal, string[]> = {
  "grad-school": ["theory", "research", "ai", "math"],
  industry: ["software", "web", "systems", "security", "data"],
  undecided: [],
};

const GOAL_LABEL: Record<Goal, string> = {
  "grad-school": "graduate school",
  industry: "a job in industry",
  undecided: "undecided",
};

const TAG_LABEL: Record<string, string> = {
  ai: "AI",
  data: "data",
  security: "security",
  web: "web development",
  systems: "systems",
  theory: "theory",
  software: "software engineering",
  math: "math",
  research: "research",
};

const SEASON_LABEL: Record<TermSeason, string> = { FALL: "Fall", SPRING: "Spring", SUMMER: "Summer" };

// ─── Types returned to the API ────────────────────────────────────────────────

export interface Term {
  season: TermSeason;
  year: number;
  label: string;
}

export interface CourseRecommendation {
  code: string;
  name: string;
  credits: number;
  tags: string[];
  category: string;
  score: number;
  reasons: string[];
  /** Courses the student still needs that this one directly unlocks */
  unlocks: string[];
  /** false when it doesn't fit under the credit limit after higher-ranked courses */
  fitsLoad: boolean;
}

export interface BlockedCourse {
  code: string;
  name: string;
  category: string;
  /** Each entry is one unmet group: any one of the listed courses satisfies it */
  missing: string[][];
}

export interface OpportunityRecommendation {
  id: string;
  category: Opportunity["category"];
  kind: Opportunity["kind"];
  title: string;
  organization: string;
  description: string;
  deadline?: string;
  daysUntilDeadline?: number;
  score: number;
  reasons: string[];
  readiness: { taken: number; total: number };
  /** Related courses not taken yet that would strengthen the student's case */
  suggestedCourses: { code: string; name: string }[];
}

export interface CourseRecommendationResult {
  courses: CourseRecommendation[];
  blocked: BlockedCourse[];
  suggestedCredits: number;
}

// ─── Terms ────────────────────────────────────────────────────────────────────

export function makeTerm(season: TermSeason, year: number): Term {
  return { season, year, label: `${SEASON_LABEL[season]} ${year}` };
}

/** The next fall or spring term after `today` (summer is skipped) */
export function nextTerm(today: Date): Term {
  const month = today.getMonth(); // 0 = January
  return month <= 7 ? makeTerm("FALL", today.getFullYear()) : makeTerm("SPRING", today.getFullYear() + 1);
}

/** Parses "SPRING-2027"; returns null when the text isn't a valid term */
export function parseTerm(text: string): Term | null {
  const match = /^(FALL|SPRING|SUMMER)-(\d{4})$/.exec(text.trim().toUpperCase());
  return match ? makeTerm(match[1] as TermSeason, Number(match[2])) : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function labelTags(tags: string[]): string {
  return joinWords(tags.map((t) => TAG_LABEL[t] ?? t));
}

function courseLabel(code: string): string {
  const course = courseByCode.get(code);
  return course ? `${code} ${course.name}` : code;
}

function daysBetween(from: Date, isoDate: string): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const [y, m, d] = isoDate.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export function recommendCourses(
  student: StudentRecord,
  program: DegreeProgram,
  catalog: Course[],
  term: Term
): CourseRecommendationResult {
  const byCode = new Map(catalog.map((c) => [c.code, c]));
  // Planning for next term: in-progress courses are assumed passed by then
  const done = new Set([...student.completed, ...student.inProgress]);
  const dismissed = new Set(student.dismissedCourses);
  const interests = new Set(student.interests);
  const goalTags = new Set(GOAL_TAGS[student.goal]);

  // Which requirements are still open, and which courses would count toward them
  const status = requirementStatus(program, done);
  const neededBy = new Map<string, (typeof status)[number]>();
  for (const category of status) {
    for (const code of category.openCourses) {
      if (!neededBy.has(code) && byCode.has(code)) neededBy.set(code, category);
    }
  }
  const needed = new Set(neededBy.keys());
  const dependents = buildDependents(catalog);
  const chainMemo = new Map<string, number>();

  const ranked: Omit<CourseRecommendation, "fitsLoad">[] = [];
  const blocked: BlockedCourse[] = [];

  for (const [code, category] of neededBy) {
    const course = byCode.get(code)!;
    if (dismissed.has(code)) continue;

    const check = checkPrerequisites(course, done);
    if (!check.ok) {
      blocked.push({ code, name: course.name, category: category.name, missing: check.missing });
      continue;
    }
    if (!course.termsOffered.includes(term.season)) continue;

    const w = COURSE_WEIGHTS;
    let score = 0;
    const reasons: string[] = [];

    // 1. Requirement need
    if (category.kind === "all") {
      score += w.requiredCourse;
      reasons.push(`Required for ${category.name}`);
    } else {
      score += w.electiveBase + w.electiveNeed * (category.creditsRemaining / category.creditsRequired);
      reasons.push(`Counts toward ${category.name} (${category.creditsRemaining} credits left)`);
    }

    // 2. Unlocks future requirements
    const directUnlocks = (dependents.get(code) ?? []).filter((c) => needed.has(c));
    const allUnlocks = downstreamCourses(code, dependents, needed);
    if (allUnlocks.size > 0) {
      score += w.perUnlockedCourse * Math.min(allUnlocks.size, w.maxUnlockedCourses);
      reasons.push(
        `Unlocks ${allUnlocks.size} course${allUnlocks.size === 1 ? "" : "s"} you still need: ${joinWords(directUnlocks)}`
      );
    }

    // 3. Critical path
    const chain = longestChainBelow(code, dependents, needed, chainMemo);
    if (chain > 0) {
      score += w.perChainStep * Math.min(chain, w.maxChainSteps);
      if (chain >= 2) {
        reasons.push(`Starts a ${chain + 1}-course prerequisite chain, so waiting could delay graduation`);
      }
    }

    // 4. Interests and goal
    const interestMatches = course.tags.filter((t) => interests.has(t));
    if (interestMatches.length > 0) {
      score += w.perInterestMatch * Math.min(interestMatches.length, w.maxInterestMatches);
      reasons.push(`Matches your interest in ${labelTags(interestMatches)}`);
    }
    const leadsTo = [...allUnlocks].find((c) => byCode.get(c)!.tags.some((t) => interests.has(t)));
    if (leadsTo && interestMatches.length === 0) {
      score += w.leadsToInterest;
      reasons.push(`Leads to ${courseLabel(leadsTo)}, which matches your interests`);
    }
    if (course.tags.some((t) => goalTags.has(t))) {
      score += w.goalMatch;
      reasons.push(`Supports your goal: ${GOAL_LABEL[student.goal]}`);
    }

    // 5. Availability
    if (course.termsOffered.length === 1) {
      score += w.onlyOfferedThisTerm;
      reasons.push(`Only offered in ${SEASON_LABEL[term.season]}, so the next chance is a year away`);
    }

    ranked.push({
      code,
      name: course.name,
      credits: course.credits,
      tags: course.tags,
      category: category.name,
      score: Math.min(100, Math.round(score)),
      reasons,
      unlocks: directUnlocks,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));

  // Fill the term greedily, highest score first, up to the credit limit
  let load = 0;
  const courses = ranked.map((rec) => {
    const fitsLoad = load + rec.credits <= student.maxCreditsPerTerm;
    if (fitsLoad) load += rec.credits;
    return { ...rec, fitsLoad };
  });

  blocked.sort((a, b) => a.code.localeCompare(b.code));
  return { courses, blocked, suggestedCredits: load };
}

// ─── Post-grad options and experiences ────────────────────────────────────────

export function recommendOpportunities(
  student: StudentRecord,
  catalog: Opportunity[],
  today: Date
): OpportunityRecommendation[] {
  const w = OPPORTUNITY_WEIGHTS;
  const taken = new Set([...student.completed, ...student.inProgress]);
  const dismissed = new Set(student.dismissedOpportunities);
  const interests = new Set(student.interests);
  const results: OpportunityRecommendation[] = [];

  for (const opp of catalog) {
    if (dismissed.has(opp.id)) continue;
    const daysUntilDeadline = opp.deadline ? daysBetween(today, opp.deadline) : undefined;
    if (daysUntilDeadline !== undefined && daysUntilDeadline < 0) continue; // deadline passed

    let score = 0;
    const reasons: string[] = [];

    if (student.goal === "undecided") {
      score += w.undecidedGoal;
    } else if (opp.goals.includes(student.goal)) {
      score += w.goalMatch;
      reasons.push(`Fits your goal: ${GOAL_LABEL[student.goal]}`);
    }

    const interestMatches = opp.tags.filter((t) => interests.has(t));
    if (interestMatches.length > 0) {
      score += w.perInterestMatch * Math.min(interestMatches.length, w.maxInterestMatches);
      reasons.push(`Matches your interest in ${labelTags(interestMatches)}`);
    }

    const related = opp.relatedCourses.filter((c) => courseByCode.has(c));
    const takenCount = related.filter((c) => taken.has(c)).length;
    const suggestedCourses = related
      .filter((c) => !taken.has(c))
      .map((c) => ({ code: c, name: courseByCode.get(c)!.name }));
    if (related.length > 0) {
      score += w.readiness * (takenCount / related.length);
      reasons.push(
        takenCount === related.length
          ? "You've already taken all the related courses"
          : takenCount === 0
          ? `You haven't taken any of the ${related.length} related courses yet`
          : `You've taken ${takenCount} of ${related.length} related courses`
      );
    }
    if (suggestedCourses.length > 0) {
      reasons.push(`Taking ${courseLabel(suggestedCourses[0].code)} would strengthen your application`);
    }

    if (daysUntilDeadline !== undefined && daysUntilDeadline <= w.deadlineSoonDays) {
      score += w.deadlineSoon;
      reasons.push(
        daysUntilDeadline === 0 ? "Application due today" : `Application due in ${daysUntilDeadline} days`
      );
    }

    if (score < w.minimumScore) continue;

    results.push({
      id: opp.id,
      category: opp.category,
      kind: opp.kind,
      title: opp.title,
      organization: opp.organization,
      description: opp.description,
      deadline: opp.deadline,
      daysUntilDeadline,
      score: Math.min(100, Math.round(score)),
      reasons,
      readiness: { taken: takenCount, total: related.length },
      suggestedCourses,
    });
  }

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
