import type { Goal } from "./opportunities";

/**
 * A student's academic record and recommendation preferences.
 *
 * TEMPORARY IN-MEMORY STORE: there is no database yet, so every user gets their
 * own copy of a demo record the first time they ask for recommendations, and
 * changes are lost when the server restarts. When Prisma is added, replace the
 * functions in this file with queries against User / AcademicRecordEntry and
 * keep their signatures, so the routes and services don't change.
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

/** The same student shown on the dashboard and timeline sample data */
function demoRecord(id: string): StudentRecord {
  return {
    id,
    programId: "bs-cs",
    completed: [
      "CSC 1301", "CSC 1302", "CSC 2510", "CSC 2720", "CSC 3210", "CSC 3320",
      "MATH 1113", "MATH 2211", "MATH 2212", "MATH 2641",
    ],
    inProgress: ["CSC 3350", "MATH 3020", "CSC 4710"],
    interests: ["ai", "data"],
    goal: "grad-school",
    maxCreditsPerTerm: 15,
    dismissedCourses: [],
    dismissedOpportunities: [],
  };
}

const store = new Map<string, StudentRecord>();

export function getStudent(id: string): StudentRecord {
  let record = store.get(id);
  if (!record) {
    record = demoRecord(id);
    store.set(id, record);
  }
  return record;
}

export function updateStudent(id: string, changes: Partial<Omit<StudentRecord, "id">>): StudentRecord {
  const updated = { ...getStudent(id), ...changes };
  store.set(id, updated);
  return updated;
}

/** Test helper: forget every stored record */
export function resetStudents(): void {
  store.clear();
}
