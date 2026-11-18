import { apiFetch } from "./api";

/* The student's degree plan, stored on the server (GET/POST/DELETE /api/plans/me) */

export type Term = { season: string; year: number; label: string };

export type PlannedCourse = {
  code: string;
  name: string;
  credits: number;
  term: Term;
  /** Prerequisite groups not met by earlier terms (empty when fine) */
  missing: string[][];
};

export type Plan = { defaultTerm: Term; totalCredits: number; courses: PlannedCourse[] };

export function getPlan(): Promise<Plan> {
  return apiFetch<Plan>("/api/plans/me");
}

/** Adds to next term unless a term like "FALL-2027" is given */
export function addToPlan(code: string, term?: string): Promise<Plan> {
  return apiFetch<Plan>("/api/plans/me/courses", { method: "POST", body: JSON.stringify({ code, term }) });
}

export function removeFromPlan(code: string): Promise<Plan> {
  return apiFetch<Plan>(`/api/plans/me/courses/${encodeURIComponent(code)}`, { method: "DELETE" });
}
