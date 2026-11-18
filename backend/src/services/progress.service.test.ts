import { describe, it, expect } from "vitest";
import { courseByCode, findProgram } from "../data/catalog";
import { DEMO_STUDENT } from "../data/students";
import { buildTimeline, degreeProgress, remainingChainLength, type PlanEntry, type RecordEntry } from "./progress.service";
import { checkPlacement, planConflicts } from "./plan.service";
import { addTerms, currentTerm, makeTerm, termIndex } from "./term.service";

const program = findProgram("bs-cs")!;
const today = new Date(2026, 10, 16); // Nov 16, 2026: Fall 2026 is in session

const demoRecords: RecordEntry[] = DEMO_STUDENT.history.flatMap((t) =>
  t.courses.map((code) => ({ code, status: t.status, season: t.season, year: t.year }))
);
const demoPlan: PlanEntry[] = DEMO_STUDENT.plan;
const course = (code: string) => courseByCode.get(code)!;

describe("degreeProgress", () => {
  const progress = degreeProgress(program, courseByCode, demoRecords, 15, today, DEMO_STUDENT.target);

  it("adds up earned, in-progress, and remaining credits", () => {
    expect(progress.credits).toEqual({ earned: 95, inProgress: 9, required: 120, remaining: 21 });
    expect(progress.percent).toBe(79);
  });

  it("marks each requirement complete, in progress, or not started", () => {
    const state = Object.fromEntries(progress.categories.map((c) => [c.id, c.state]));
    expect(state).toEqual({
      "gen-ed": "complete",
      foundations: "in-progress",
      "upper-core": "not-started",
      electives: "in-progress",
      capstone: "not-started",
    });
    expect(progress.categories.find((c) => c.id === "foundations")!.creditsInProgress).toBe(6);
  });

  it("projects graduation from remaining credits and prerequisite chains", () => {
    // 21 credits at 15 per term = 2 terms after this one
    expect(progress.expectedGraduation.label).toBe("Fall 2027");
    expect(progress.onTrack).toBe(true);
  });

  it("is not on track when the target is earlier than the projection", () => {
    const early = degreeProgress(program, courseByCode, demoRecords, 15, today, { season: "SPRING", year: 2027 });
    expect(early.onTrack).toBe(false);
  });

  it("needs more terms when the credit limit is lower", () => {
    const slow = degreeProgress(program, courseByCode, demoRecords, 6, today, null);
    expect(slow.termsRemaining).toBe(4);
    expect(slow.onTrack).toBeNull();
  });

  it("counts prerequisite chains even when credits would fit sooner", () => {
    // CSC 4350 -> CSC 4351 must take two terms no matter the credit limit
    expect(remainingChainLength(new Set(["CSC 4350", "CSC 4351", "CSC 4330"]), courseByCode)).toBe(2);
  });

  it("starts a new student at zero", () => {
    const fresh = degreeProgress(program, courseByCode, [], 15, today, null);
    expect(fresh.credits.earned).toBe(0);
    expect(fresh.percent).toBe(0);
    expect(fresh.categories.every((c) => c.state === "not-started")).toBe(true);
  });
});

describe("buildTimeline", () => {
  const timeline = buildTimeline(courseByCode, demoRecords, demoPlan, ["CSC 4330", "CSC 4520"], today);

  it("orders terms and labels past, current, and future", () => {
    expect(timeline.map((t) => `${t.label}:${t.status}`)).toEqual([
      "Fall 2023:completed",
      "Spring 2024:completed",
      "Fall 2024:completed",
      "Spring 2025:completed",
      "Fall 2025:completed",
      "Spring 2026:completed",
      "Fall 2026:current",
      "Spring 2027:upcoming",
      "Fall 2027:upcoming",
    ]);
  });

  it("puts recommendations in next term without repeating planned courses", () => {
    const spring = timeline.find((t) => t.label === "Spring 2027")!;
    expect(spring.courses.map((c) => `${c.code}:${c.status}`)).toEqual([
      "CSC 4520:planned",
      "CSC 4350:planned",
      "CSC 4330:recommended",
    ]);
    expect(spring.totalCredits).toBe(9);
  });
});

describe("plan rules", () => {
  const spring = makeTerm("SPRING", 2027);
  const fall = makeTerm("FALL", 2027);

  it("allows a course whose prerequisites are done or in progress", () => {
    expect(checkPlacement(course("CSC 4330"), spring, demoRecords, demoPlan)).toBeNull();
  });

  it("rejects a course whose prerequisite is planned for the same term", () => {
    const problem = checkPlacement(course("CSC 4810"), spring, demoRecords, demoPlan);
    expect(problem).toMatchObject({ reason: "prerequisites", missing: [["CSC 4520"]] });
  });

  it("allows it once the prerequisite is planned earlier", () => {
    expect(checkPlacement(course("CSC 4810"), fall, demoRecords, demoPlan)).toBeNull();
  });

  it("rejects courses already taken or not offered that term", () => {
    expect(checkPlacement(course("CSC 2720"), spring, demoRecords, demoPlan)?.reason).toBe("already-taken");
    expect(checkPlacement(course("CSC 4760"), fall, demoRecords, demoPlan)?.reason).toBe("not-offered");
  });

  it("allows a corequisite in the same term", () => {
    const records: RecordEntry[] = [...demoRecords, { code: "CSC 4222", status: "COMPLETED", season: "FALL", year: 2025 }];
    const plan: PlanEntry[] = [{ code: "CSC 4220", season: "SPRING", year: 2027 }];
    expect(checkPlacement(course("CSC 4226"), spring, records, plan)).toBeNull();
  });

  it("flags planned courses that lost a prerequisite", () => {
    const withoutCsc4350 = demoPlan.filter((p) => p.code !== "CSC 4350");
    expect([...planConflicts(courseByCode, demoRecords, withoutCsc4350)]).toEqual([["CSC 4351", [["CSC 4350"]]]]);
    expect(planConflicts(courseByCode, demoRecords, demoPlan).size).toBe(0);
  });
});

describe("terms", () => {
  it("knows the term in session and skips summer when planning", () => {
    expect(currentTerm(today).label).toBe("Fall 2026");
    expect(currentTerm(new Date(2027, 5, 15)).label).toBe("Summer 2027");
    expect(addTerms(makeTerm("SPRING", 2027), 3).label).toBe("Fall 2028");
    expect(termIndex(makeTerm("SPRING", 2027))).toBeLessThan(termIndex(makeTerm("SUMMER", 2027)));
  });
});
