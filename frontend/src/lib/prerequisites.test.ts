import { describe, expect, it } from "vitest";
import { availability, missingPrereqs, prereqChain, unlocks } from "./prerequisites";
import { catalog, categories, credits } from "./mockdata";
import { remainingCourses, toPercent } from "./progress";

const get = (code: string) => catalog.find((c) => c.code === code)!;

describe("prerequisite logic", () => {
  it("marks a course ready when every prerequisite is completed", () => {
    expect(availability(get("CSC 3320"))).toBe("ready");
  });

  it("locks a course and names what is missing when a prerequisite is only in progress", () => {
    expect(availability(get("MATH 3350"))).toBe("locked");
    expect(missingPrereqs(get("MATH 3350")).map((c) => c.code)).toEqual(["MATH 2420"]);
  });

  it("lists the full chain with each course after the ones it depends on", () => {
    const codes = prereqChain("CSC 4730").map((c) => c.code);
    expect(codes).toContain("CSC 1301");
    expect(codes.indexOf("CSC 2310")).toBeLessThan(codes.indexOf("CSC 3210"));
    expect(codes.indexOf("CSC 3210")).toBeLessThan(codes.indexOf("CSC 3320"));
  });

  it("finds the courses a course unlocks", () => {
    expect(unlocks("CSC 3320").map((c) => c.code)).toEqual(["CSC 4730"]);
  });

  it("does not loop forever on circular prerequisites", () => {
    const loop = [
      { code: "A 1", name: "A", credits: 3, status: "not-taken" as const, prereqs: ["B 1"] },
      { code: "B 1", name: "B", credits: 3, status: "not-taken" as const, prereqs: ["A 1"] },
    ];
    expect(prereqChain("A 1", loop).map((c) => c.code)).toEqual(["B 1"]);
  });
});

describe("progress data", () => {
  it("adds up to the 100 / 120 credits the dashboard shows", () => {
    expect(credits).toEqual({ earned: 100, required: 120 });
  });

  it("lists courses that add up to the credits left (except open electives)", () => {
    for (const c of categories.filter((x) => x.remaining.length > 0)) {
      const listed = remainingCourses(c).reduce((sum, course) => sum + course.credits, 0);
      expect(listed).toBe(c.required - c.earned);
    }
  });

  it("keeps percents between 0 and 100", () => {
    expect(toPercent(100, 120)).toBe(83);
    expect(toPercent(5, 0)).toBe(0);
    expect(toPercent(200, 100)).toBe(100);
  });
});
