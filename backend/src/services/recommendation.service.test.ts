import { describe, it, expect } from "vitest";
import { courseByCode, courses, findProgram, type Course } from "../data/catalog";
import { opportunities } from "../data/opportunities";
import { demoStudentRecord, type StudentRecord } from "../data/students";
import { checkPrerequisites, findCycle } from "./prerequisite.service";
import { requirementStatus } from "./progress.service";
import {
  makeTerm,
  nextTerm,
  parseTerm,
  recommendCourses,
  recommendOpportunities,
} from "./recommendation.service";

const program = findProgram("bs-cs")!;
const spring = makeTerm("SPRING", 2027);
const today = new Date(2026, 10, 16); // Nov 16, 2026

// The seeded demo student: senior, gen-ed done, CSC 3350 / MATH 3020 / CSC 4710 in progress
function student(overrides: Partial<StudentRecord> = {}): StudentRecord {
  return { ...demoStudentRecord("stu-1"), ...overrides };
}

const codes = (list: { code: string }[]) => list.map((c) => c.code);

describe("prerequisite service", () => {
  const ml = courses.find((c) => c.code === "CSC 4850")!; // CSC 4520 AND (MATH 3020 OR MATH 4751)

  it("treats courses in the same group as OR and separate groups as AND", () => {
    expect(checkPrerequisites(ml, new Set(["CSC 4520", "MATH 4751"])).ok).toBe(true);
    expect(checkPrerequisites(ml, new Set(["CSC 4520", "MATH 3020"])).ok).toBe(true);
    expect(checkPrerequisites(ml, new Set(["MATH 3020"]))).toEqual({ ok: false, missing: [["CSC 4520"]] });
  });

  it("lets corequisites be taken in the same term", () => {
    const netSec = courses.find((c) => c.code === "CSC 4226")!; // CSC 4222 AND CSC 4220 (concurrent ok)
    expect(checkPrerequisites(netSec, new Set(["CSC 4222"]), new Set(["CSC 4220"])).ok).toBe(true);
    expect(checkPrerequisites(netSec, new Set(["CSC 4222"])).ok).toBe(false);
  });

  it("finds circular prerequisites and accepts the sample catalog", () => {
    expect(findCycle(courses)).toBeNull();
    const looped: Course[] = [
      { code: "A", name: "A", credits: 3, termsOffered: ["FALL"], tags: [], prerequisites: [{ anyOf: ["B"] }] },
      { code: "B", name: "B", credits: 3, termsOffered: ["FALL"], tags: [], prerequisites: [{ anyOf: ["A"] }] },
    ];
    expect(findCycle(looped)).toEqual(["A", "B", "A"]);
  });
});

describe("requirement status", () => {
  it("counts elective credits and lists open courses only while credits remain", () => {
    const done = new Set([...student().completed, ...student().inProgress]);
    const electives = requirementStatus(program, done, courseByCode).find((c) => c.id === "electives")!;
    expect(electives.creditsRemaining).toBe(6);
    expect(electives.openCourses).toContain("CSC 4850");

    done.add("CSC 4222").add("CSC 4220");
    const finished = requirementStatus(program, done, courseByCode).find((c) => c.id === "electives")!;
    expect(finished.complete).toBe(true);
    expect(finished.openCourses).toEqual([]);
  });
});

describe("recommendCourses", () => {
  it("only recommends eligible courses that are offered next term and still needed", () => {
    const result = recommendCourses(student(), program, courses, spring);
    const recommended = codes(result.courses);

    expect(recommended).not.toContain("CSC 2720"); // already completed
    expect(recommended).not.toContain("CSC 4710"); // in progress
    expect(recommended).not.toContain("CSC 4810"); // needs CSC 4520 first
    expect(recommended).not.toContain("MATH 4751"); // doesn't count toward any requirement
    expect(codes(result.blocked)).toEqual(expect.arrayContaining(["CSC 4810", "CSC 4850", "CSC 4351"]));
    expect(result.blocked.find((b) => b.code === "CSC 4351")!.missing).toEqual([["CSC 4350"]]);
  });

  it("counts in-progress courses as done when planning next term", () => {
    // CSC 4350 needs CSC 3350, which is in progress now
    const result = recommendCourses(student(), program, courses, spring);
    expect(codes(result.courses)).toContain("CSC 4350");
  });

  it("ranks the course that unlocks the most remaining requirements first and explains why", () => {
    const [top] = recommendCourses(student(), program, courses, spring).courses;
    expect(top.code).toBe("CSC 4520");
    expect(top.unlocks).toEqual(["CSC 4810", "CSC 4850"]);
    expect(top.reasons).toContain("Required for Upper-Division Core");
    expect(top.reasons.some((r) => r.startsWith("Unlocks 2 courses"))).toBe(true);
  });

  it("ranks required courses above electives", () => {
    const result = recommendCourses(student(), program, courses, spring);
    const lastRequired = Math.max(...result.courses.map((c, i) => (c.category === "Upper-Division Core" ? i : -1)));
    const firstElective = result.courses.findIndex((c) => c.category === "CS Electives");
    expect(lastRequired).toBeLessThan(firstElective);
  });

  it("re-ranks electives when the student's interests change", () => {
    const electives = (interests: string[]) =>
      recommendCourses(student({ interests }), program, courses, spring).courses.filter((c) => c.category === "CS Electives");

    expect(electives(["data"])[0].code).toBe("CSC 4760");
    expect(electives(["security"])[0].tags).toContain("security");
    expect(electives(["security"])[0].code).not.toBe("CSC 4760");
  });

  it("fills the term up to the credit limit and flags the rest", () => {
    const result = recommendCourses(student({ maxCreditsPerTerm: 9 }), program, courses, spring);
    expect(result.suggestedCredits).toBe(9);
    expect(result.courses.filter((c) => c.fitsLoad).map((c) => c.code)).toEqual(["CSC 4520", "CSC 4350", "CSC 4330"]);
    expect(result.courses.some((c) => !c.fitsLoad)).toBe(true);
  });

  it("leaves out dismissed courses", () => {
    const result = recommendCourses(student({ dismissedCourses: ["CSC 4520"] }), program, courses, spring);
    expect(codes(result.courses)).not.toContain("CSC 4520");
  });

  it("skips courses not offered in the target term", () => {
    const fall = recommendCourses(student(), program, courses, makeTerm("FALL", 2027));
    expect(codes(fall.courses)).not.toContain("CSC 4760"); // spring only
  });
});

describe("recommendOpportunities", () => {
  it("puts options that fit the student's goal and interests first", () => {
    const [top] = recommendOpportunities(student(), opportunities, today, courseByCode);
    expect(top.id).toBe("ex-research");
    expect(top.reasons).toContain("Fits your goal: graduate school");
    expect(top.suggestedCourses.map((c) => c.code)).toEqual(["CSC 4850"]);
  });

  it("changes with the goal", () => {
    const ids = recommendOpportunities(student({ goal: "industry", interests: ["software"] }), opportunities, today, courseByCode).map((o) => o.id);
    expect(ids.indexOf("pg-new-grad-swe")).toBeLessThan(ids.indexOf("pg-ms-cs") === -1 ? Infinity : ids.indexOf("pg-ms-cs"));
    expect(ids).toContain("ex-swe-intern");
  });

  it("drops dismissed options and ones whose deadline has passed", () => {
    const ids = recommendOpportunities(student({ dismissedOpportunities: ["pg-ms-ds"] }), opportunities, new Date(2027, 1, 10), courseByCode).map((o) => o.id);
    expect(ids).not.toContain("pg-ms-ds");
    expect(ids).not.toContain("ex-research"); // deadline Jan 15, 2027
  });

  it("reports readiness and an upcoming deadline", () => {
    const research = recommendOpportunities(student(), opportunities, today, courseByCode).find((o) => o.id === "ex-research")!;
    expect(research.readiness).toEqual({ taken: 2, total: 3 });
    expect(research.daysUntilDeadline).toBe(60);
  });
});

describe("terms", () => {
  it("picks the next fall or spring term", () => {
    expect(nextTerm(new Date(2026, 10, 16)).label).toBe("Spring 2027");
    expect(nextTerm(new Date(2027, 2, 1)).label).toBe("Fall 2027");
  });

  it("parses term query strings", () => {
    expect(parseTerm("spring-2027")).toEqual({ season: "SPRING", year: 2027, label: "Spring 2027" });
    expect(parseTerm("winter")).toBeNull();
  });
});
