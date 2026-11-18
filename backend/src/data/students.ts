import type { TermSeason } from "./catalog";
import type { Goal } from "./opportunities";

/**
 * What the recommendation engine needs to know about one student. Built from
 * the database by src/repositories/student.repo.ts.
 */
export interface StudentRecord {
  id: string;
  programId: string;
  completed: string[];
  inProgress: string[];
  interests: string[];
  goal: Goal;
  maxCreditsPerTerm: number;
  dismissedCourses: string[];
  dismissedOpportunities: string[];
}

interface DemoTerm {
  season: TermSeason;
  year: number;
  status: "COMPLETED" | "IN_PROGRESS";
  courses: string[];
}

/**
 * SAMPLE ACCOUNTS loaded by `npm run db:seed`. Everyone uses the password
 * "password123". Mike is a senior with a full history so every page has data;
 * new accounts made through "Create account" start with an empty record.
 */
export const DEMO_PASSWORD = "password123";

export const DEMO_STUDENT = {
  email: "mike.smith@gsu.edu",
  name: "Mike Smith",
  programId: "bs-cs",
  goal: "grad-school" as Goal,
  interests: ["ai", "data"],
  maxCreditsPerTerm: 15,
  target: { season: "FALL" as TermSeason, year: 2027 },
  history: [
    { season: "FALL", year: 2023, status: "COMPLETED", courses: ["CSC 1301", "MATH 1113", "ENGL 1101", "HIST 2110", "PSYC 1101"] },
    { season: "SPRING", year: 2024, status: "COMPLETED", courses: ["CSC 1302", "MATH 2211", "ENGL 1102", "POLS 1101"] },
    { season: "FALL", year: 2024, status: "COMPLETED", courses: ["CSC 2510", "MATH 2212", "BIOL 2107K", "COMM 1000", "SPAN 1001"] },
    { season: "SPRING", year: 2025, status: "COMPLETED", courses: ["CSC 2720", "CSC 3210", "BIOL 2108K", "ECON 2105", "SPAN 1002"] },
    { season: "FALL", year: 2025, status: "COMPLETED", courses: ["CSC 3320", "MATH 2641", "PHIL 2010", "ENGL 2110", "SPAN 2001"] },
    { season: "SPRING", year: 2026, status: "COMPLETED", courses: ["SOCI 1101", "MUS 1010", "PERS 2001", "PHYS 2211K", "CHEM 1211K"] },
    { season: "FALL", year: 2026, status: "IN_PROGRESS", courses: ["CSC 3350", "MATH 3020", "CSC 4710"] },
  ] as DemoTerm[],
  plan: [
    { code: "CSC 4520", season: "SPRING" as TermSeason, year: 2027 },
    { code: "CSC 4350", season: "SPRING" as TermSeason, year: 2027 },
    { code: "CSC 4351", season: "FALL" as TermSeason, year: 2027 },
  ],
};

export const DEMO_STAFF = [
  { email: "advisor@gsu.edu", name: "Alex Advisor", role: "ADVISOR" as const },
  { email: "admin@gsu.edu", name: "Ada Admin", role: "ADMIN" as const },
];

/** The demo student as a StudentRecord (used by unit tests) */
export function demoStudentRecord(id = "demo"): StudentRecord {
  const codes = (status: DemoTerm["status"]) =>
    DEMO_STUDENT.history.filter((t) => t.status === status).flatMap((t) => t.courses);
  return {
    id,
    programId: DEMO_STUDENT.programId,
    completed: codes("COMPLETED"),
    inProgress: codes("IN_PROGRESS"),
    interests: [...DEMO_STUDENT.interests],
    goal: DEMO_STUDENT.goal,
    maxCreditsPerTerm: DEMO_STUDENT.maxCreditsPerTerm,
    dismissedCourses: [],
    dismissedOpportunities: [],
  };
}
