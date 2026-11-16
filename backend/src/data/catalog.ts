/**
 * Domain types for the course catalog, plus SAMPLE catalog data.
 *
 * The app reads the catalog from the database (src/repositories/catalog.repo.ts).
 * The sample data below is what `npm run db:seed` loads into the database and
 * what the service unit tests run against. Admins can add or update courses
 * later through POST /api/admin/catalog/import.
 */

export type TermSeason = "FALL" | "SPRING" | "SUMMER";

/**
 * One AND-ed prerequisite group. The student needs ANY ONE course in `anyOf`.
 * A course's `prerequisites` array is AND-ed: every group must be satisfied.
 *   [{ anyOf: ["A"] }, { anyOf: ["B", "C"] }]  means  A AND (B OR C)
 * `concurrentAllowed` marks a corequisite: it may be taken in the same term.
 */
export interface PrereqGroup {
  anyOf: string[];
  concurrentAllowed?: boolean;
}

export interface Course {
  code: string;
  name: string;
  credits: number;
  termsOffered: TermSeason[];
  /** Topic tags used to match a student's interests and goals */
  tags: string[];
  prerequisites: PrereqGroup[];
}

/**
 * "all"     -> every course in `courses` is required
 * "credits" -> any courses from `courses` adding up to `creditsRequired` (elective group)
 */
export interface RequirementCategory {
  id: string;
  name: string;
  kind: "all" | "credits";
  courses: string[];
  creditsRequired?: number;
}

export interface DegreeProgram {
  id: string;
  name: string;
  /** Credits needed to graduate; anything beyond the categories counts as free electives */
  totalCredits: number;
  categories: RequirementCategory[];
}

const ALL: TermSeason[] = ["FALL", "SPRING", "SUMMER"];
const FALL_SPRING: TermSeason[] = ["FALL", "SPRING"];

export const courses: Course[] = [
  // ── Lower-division foundations ──
  { code: "CSC 1301", name: "Principles of Computer Science I", credits: 4, termsOffered: ALL, tags: ["software"], prerequisites: [] },
  { code: "CSC 1302", name: "Principles of Computer Science II", credits: 4, termsOffered: ALL, tags: ["software"], prerequisites: [{ anyOf: ["CSC 1301"] }] },
  { code: "CSC 2510", name: "Theoretical Foundations of Computer Science", credits: 3, termsOffered: ALL, tags: ["theory", "math"], prerequisites: [{ anyOf: ["CSC 1301"] }] },
  { code: "CSC 2720", name: "Data Structures", credits: 3, termsOffered: ALL, tags: ["software", "theory"], prerequisites: [{ anyOf: ["CSC 1302"] }, { anyOf: ["CSC 2510"] }] },
  { code: "CSC 3210", name: "Computer Organization and Programming", credits: 3, termsOffered: FALL_SPRING, tags: ["systems"], prerequisites: [{ anyOf: ["CSC 1302"] }] },
  { code: "CSC 3320", name: "System-Level Programming", credits: 3, termsOffered: FALL_SPRING, tags: ["systems"], prerequisites: [{ anyOf: ["CSC 1302"] }] },
  { code: "CSC 3350", name: "Software Development", credits: 3, termsOffered: FALL_SPRING, tags: ["software", "web"], prerequisites: [{ anyOf: ["CSC 2720"] }] },
  { code: "MATH 1113", name: "Precalculus", credits: 3, termsOffered: ALL, tags: ["math"], prerequisites: [] },
  { code: "MATH 2211", name: "Calculus of One Variable I", credits: 4, termsOffered: ALL, tags: ["math"], prerequisites: [{ anyOf: ["MATH 1113"] }] },
  { code: "MATH 2212", name: "Calculus of One Variable II", credits: 4, termsOffered: ALL, tags: ["math"], prerequisites: [{ anyOf: ["MATH 2211"] }] },
  { code: "MATH 2641", name: "Linear Algebra I", credits: 3, termsOffered: FALL_SPRING, tags: ["math", "ai"], prerequisites: [{ anyOf: ["MATH 2211"] }] },
  { code: "MATH 3020", name: "Applied Probability and Statistics for CS", credits: 3, termsOffered: FALL_SPRING, tags: ["math", "data"], prerequisites: [{ anyOf: ["MATH 2211"] }] },
  { code: "MATH 4751", name: "Mathematical Statistics I", credits: 3, termsOffered: ["FALL"], tags: ["math", "data"], prerequisites: [{ anyOf: ["MATH 2212"] }] },

  // ── Upper-division core ──
  { code: "CSC 4320", name: "Operating Systems", credits: 3, termsOffered: FALL_SPRING, tags: ["systems"], prerequisites: [{ anyOf: ["CSC 3320"] }, { anyOf: ["CSC 3210"] }] },
  { code: "CSC 4330", name: "Programming Language Concepts", credits: 3, termsOffered: FALL_SPRING, tags: ["theory", "software"], prerequisites: [{ anyOf: ["CSC 2720"] }] },
  { code: "CSC 4350", name: "Software Engineering", credits: 3, termsOffered: FALL_SPRING, tags: ["software", "web"], prerequisites: [{ anyOf: ["CSC 3350"] }] },
  { code: "CSC 4520", name: "Design and Analysis of Algorithms", credits: 3, termsOffered: ALL, tags: ["theory", "research"], prerequisites: [{ anyOf: ["CSC 2720"] }, { anyOf: ["MATH 2211"] }] },
  { code: "CSC 4351", name: "Senior Capstone Project", credits: 3, termsOffered: FALL_SPRING, tags: ["software"], prerequisites: [{ anyOf: ["CSC 4350"] }] },

  // ── Upper-division electives ──
  { code: "CSC 4220", name: "Computer Networks", credits: 3, termsOffered: FALL_SPRING, tags: ["systems", "security"], prerequisites: [{ anyOf: ["CSC 3320"] }] },
  { code: "CSC 4222", name: "Cyber Security", credits: 3, termsOffered: FALL_SPRING, tags: ["security"], prerequisites: [{ anyOf: ["CSC 3320"] }] },
  { code: "CSC 4226", name: "Network Security", credits: 3, termsOffered: ["SPRING"], tags: ["security", "systems"], prerequisites: [{ anyOf: ["CSC 4222"] }, { anyOf: ["CSC 4220"], concurrentAllowed: true }] },
  { code: "CSC 4370", name: "Web Programming", credits: 3, termsOffered: FALL_SPRING, tags: ["web", "software"], prerequisites: [{ anyOf: ["CSC 2720"] }] },
  { code: "CSC 4710", name: "Database Systems", credits: 3, termsOffered: ALL, tags: ["data", "software"], prerequisites: [{ anyOf: ["CSC 2720"] }] },
  { code: "CSC 4760", name: "Big Data Programming", credits: 3, termsOffered: ["SPRING"], tags: ["data", "systems"], prerequisites: [{ anyOf: ["CSC 4710"] }] },
  { code: "CSC 4810", name: "Artificial Intelligence", credits: 3, termsOffered: FALL_SPRING, tags: ["ai", "research"], prerequisites: [{ anyOf: ["CSC 4520"] }] },
  { code: "CSC 4850", name: "Machine Learning", credits: 3, termsOffered: ["FALL"], tags: ["ai", "data", "research"], prerequisites: [{ anyOf: ["CSC 4520"] }, { anyOf: ["MATH 3020", "MATH 4751"] }] },

  // ── General education (core curriculum) ──
  { code: "ENGL 1101", name: "English Composition I", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "ENGL 1102", name: "English Composition II", credits: 3, termsOffered: ALL, tags: [], prerequisites: [{ anyOf: ["ENGL 1101"] }] },
  { code: "ENGL 2110", name: "World Literature", credits: 3, termsOffered: ALL, tags: [], prerequisites: [{ anyOf: ["ENGL 1102"] }] },
  { code: "HIST 2110", name: "Survey of U.S. History", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "POLS 1101", name: "American Government", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "PSYC 1101", name: "Introduction to General Psychology", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "SOCI 1101", name: "Introductory Sociology", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "ECON 2105", name: "Principles of Macroeconomics", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "PHIL 2010", name: "Introduction to Philosophy", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "COMM 1000", name: "Human Communication", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "MUS 1010", name: "Music Appreciation", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "PERS 2001", name: "Perspectives on Comparative Culture", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "BIOL 2107K", name: "Principles of Biology I", credits: 4, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "BIOL 2108K", name: "Principles of Biology II", credits: 4, termsOffered: ALL, tags: [], prerequisites: [{ anyOf: ["BIOL 2107K"] }] },
  { code: "CHEM 1211K", name: "Principles of Chemistry I", credits: 4, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "PHYS 2211K", name: "Principles of Physics I", credits: 4, termsOffered: ALL, tags: [], prerequisites: [{ anyOf: ["MATH 2211"] }] },

  // ── Free electives (count toward total credits only) ──
  { code: "SPAN 1001", name: "Elementary Spanish I", credits: 3, termsOffered: ALL, tags: [], prerequisites: [] },
  { code: "SPAN 1002", name: "Elementary Spanish II", credits: 3, termsOffered: ALL, tags: [], prerequisites: [{ anyOf: ["SPAN 1001"] }] },
  { code: "SPAN 2001", name: "Intermediate Spanish I", credits: 3, termsOffered: ALL, tags: [], prerequisites: [{ anyOf: ["SPAN 1002"] }] },
];

export const programs: DegreeProgram[] = [
  {
    id: "bs-cs",
    name: "B.S. Computer Science",
    totalCredits: 120,
    categories: [
      {
        id: "gen-ed",
        name: "General Education",
        kind: "credits",
        creditsRequired: 42,
        courses: [
          "ENGL 1101", "ENGL 1102", "ENGL 2110", "HIST 2110", "POLS 1101", "PSYC 1101", "SOCI 1101", "ECON 2105",
          "PHIL 2010", "COMM 1000", "MUS 1010", "PERS 2001", "BIOL 2107K", "BIOL 2108K", "CHEM 1211K", "PHYS 2211K",
        ],
      },
      {
        id: "foundations",
        name: "CS & Math Foundations",
        kind: "all",
        courses: ["CSC 1301", "CSC 1302", "CSC 2510", "CSC 2720", "CSC 3210", "CSC 3320", "CSC 3350", "MATH 2211", "MATH 2212", "MATH 2641", "MATH 3020"],
      },
      {
        id: "upper-core",
        name: "Upper-Division Core",
        kind: "all",
        courses: ["CSC 4320", "CSC 4330", "CSC 4350", "CSC 4520"],
      },
      {
        id: "electives",
        name: "CS Electives",
        kind: "credits",
        creditsRequired: 9,
        courses: ["CSC 4220", "CSC 4222", "CSC 4226", "CSC 4370", "CSC 4710", "CSC 4760", "CSC 4810", "CSC 4850"],
      },
      {
        id: "capstone",
        name: "Capstone",
        kind: "all",
        courses: ["CSC 4351"],
      },
    ],
  },
];

export const courseByCode = new Map(courses.map((c) => [c.code, c]));

export function findProgram(id: string): DegreeProgram | undefined {
  return programs.find((p) => p.id === id);
}
