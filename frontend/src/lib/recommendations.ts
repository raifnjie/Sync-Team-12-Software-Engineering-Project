import { apiFetch } from "./api";

/* These types mirror the JSON returned by backend/src/routes/recommendations.routes.ts */

export type Goal = "industry" | "grad-school" | "undecided";
export type DismissKind = "course" | "opportunity";

export type CourseRecommendation = {
  code: string;
  name: string;
  credits: number;
  tags: string[];
  category: string;
  score: number;
  reasons: string[];
  unlocks: string[];
  fitsLoad: boolean;
};

export type BlockedCourse = {
  code: string;
  name: string;
  category: string;
  missing: string[][];
};

export type OpportunityRecommendation = {
  id: string;
  category: "post-grad" | "experience";
  kind: "grad-program" | "job" | "internship" | "research" | "certification" | "club";
  title: string;
  organization: string;
  description: string;
  deadline?: string;
  daysUntilDeadline?: number;
  score: number;
  reasons: string[];
  readiness: { taken: number; total: number };
  suggestedCourses: { code: string; name: string }[];
};

export type Recommendations = {
  term: { season: string; year: number; label: string };
  program: { id: string; name: string };
  preferences: { goal: Goal; interests: string[]; maxCreditsPerTerm: number };
  options: { goals: Goal[]; interests: string[] };
  suggestedCredits: number;
  courses: CourseRecommendation[];
  blocked: BlockedCourse[];
  postGrad: OpportunityRecommendation[];
  experiences: OpportunityRecommendation[];
  dismissed: { courses: { id: string; title: string }[]; opportunities: { id: string; title: string }[] };
};

const BASE = "/api/recommendations/me";

export function getRecommendations(): Promise<Recommendations> {
  return apiFetch<Recommendations>(BASE);
}

export function updatePreferences(changes: { goal?: Goal; interests?: string[] }): Promise<Recommendations> {
  return apiFetch<Recommendations>(`${BASE}/preferences`, { method: "PATCH", body: JSON.stringify(changes) });
}

export function dismiss(kind: DismissKind, id: string): Promise<Recommendations> {
  return apiFetch<Recommendations>(`${BASE}/dismissals`, { method: "POST", body: JSON.stringify({ kind, id }) });
}

export function restore(kind: DismissKind, id: string): Promise<Recommendations> {
  return apiFetch<Recommendations>(`${BASE}/dismissals/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
