/* Sample data for the Progress and Prerequisite Map pages.
   TODO: replace each export with an API call once the backend is connected:
     - catalog      -> GET /api/courses and GET /api/courses/:id/prerequisites
     - categories   -> GET /api/programs/:id/requirements (+ GET /api/student/progress)
   Keep the exported types the same and the pages will not need to change. */

/* completed = finished, in-progress = taking it now, not-taken = still to do */
export type CourseStatus = "completed" | "in-progress" | "not-taken";
// The Catalog Course numbers
export type CatalogCourse = {
  code: string;
  name: string;
  credits: number;
  status: CourseStatus;
  /* Codes of the courses that must be completed first (an edge in the prerequisite graph) */
  prereqs: string[];
};

export type RequirementCategory = {
  id: string;
  name: string;
  required: number;
  earned: number;
  /* Codes of the courses still needed for this category (looked up in the catalog) */
  remaining: string[];
  note?: string;
};
// The Course Catalog
export const catalog: CatalogCourse[] = [
  { code: "CSC 1301", name: "Introduction to Computer Science", credits: 3, status: "completed", prereqs: [] },
  { code: "CSC 1302", name: "Computer Science II", credits: 3, status: "completed", prereqs: ["CSC 1301"] },
  { code: "CSC 2310", name: "Data Structures", credits: 3, status: "completed", prereqs: ["CSC 1302"] },
  { code: "CSC 3210", name: "Computer Organization", credits: 3, status: "completed", prereqs: ["CSC 2310"] },
  { code: "CSC 3310", name: "Design and Analysis of Algorithms", credits: 3, status: "completed", prereqs: ["CSC 2310"] },
  { code: "MATH 2211", name: "Calculus of One Variable I", credits: 4, status: "completed", prereqs: [] },
  { code: "MATH 2212", name: "Calculus of One Variable II", credits: 4, status: "completed", prereqs: ["MATH 2211"] },
  { code: "MATH 2420", name: "Discrete Math", credits: 3, status: "in-progress", prereqs: ["MATH 2211"] },
  { code: "CSC 3320", name: "Systems Programming", credits: 3, status: "not-taken", prereqs: ["CSC 2310", "CSC 3210"] },
  { code: "MATH 3020", name: "Applied Probability & Stats for CS", credits: 3, status: "not-taken", prereqs: ["MATH 2212"] },
  { code: "MATH 3350", name: "Software Engineering Math", credits: 3, status: "not-taken", prereqs: ["MATH 2212", "MATH 2420"] },
  { code: "CSC 4730", name: "Operating Systems", credits: 3, status: "not-taken", prereqs: ["CSC 3210", "CSC 3320"] },
  { code: "CSC 4140", name: "Artificial Intelligence", credits: 3, status: "not-taken", prereqs: ["CSC 3310", "MATH 3020"] },
];
// The Requirement Category
export const categories: RequirementCategory[] = [
  { id: "gen-ed", name: "General Education", required: 42, earned: 42, remaining: [] },
  { id: "major-core", name: "Major Core", required: 36, earned: 30, remaining: ["CSC 3320", "CSC 4730"] },
  { id: "math-stats", name: "Math & Statistics", required: 18, earned: 9, remaining: ["MATH 2420", "MATH 3020", "MATH 3350"] },
  { id: "major-electives", name: "Major Electives", required: 15, earned: 12, remaining: ["CSC 4140"] },
  {
    id: "free-electives",
    name: "Free Electives",
    required: 9,
    earned: 7,
    remaining: [],
    note: "Any open elective counts toward the remaining credits.",
  },
];

/* Totals that the dashboard, timeline and progress pages all share (100 / 120 with the sample data) */
export const credits = {
  earned: categories.reduce((sum, c) => sum + c.earned, 0),
  required: categories.reduce((sum, c) => sum + c.required, 0),
};
