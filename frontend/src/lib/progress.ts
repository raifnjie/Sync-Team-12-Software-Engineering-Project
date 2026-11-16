import { apiFetch } from "./api";

/* Mirrors GET /api/progress/me (backend/src/routes/progress.routes.ts) */

export type Term = { season: string; year: number; label: string };

export type TimelineCourseStatus = "completed" | "in-progress" | "planned" | "recommended";

export type TimelineTerm = {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
  totalCredits: number;
  courses: { code: string; name: string; credits: number; status: TimelineCourseStatus }[];
};

export type RequirementProgress = {
  id: string;
  name: string;
  creditsRequired: number;
  creditsDone: number;
  creditsInProgress: number;
  creditsRemaining: number;
  openCourses: string[];
  state: "complete" | "in-progress" | "not-started";
};

export type Progress = {
  student: { id: string; name: string };
  program: { id: string; name: string };
  currentTerm: Term;
  maxCreditsPerTerm: number;
  credits: { earned: number; inProgress: number; required: number; remaining: number };
  percent: number;
  categories: RequirementProgress[];
  expectedGraduation: Term;
  targetGraduation: Term | null;
  onTrack: boolean | null;
  termsRemaining: number;
  timeline: TimelineTerm[];
};

export function getProgress(): Promise<Progress> {
  return apiFetch<Progress>("/api/progress/me");
}

/** Short status line for the expected-graduation card */
export function graduationStatus(progress: Progress): string {
  if (progress.onTrack === null) return "No target term set";
  return progress.onTrack ? "On track" : `Behind your ${progress.targetGraduation!.label} target`;
}
