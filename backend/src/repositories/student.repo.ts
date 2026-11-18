import type { TermSeason } from "../data/catalog";
import type { Goal } from "../data/opportunities";
import type { StudentRecord } from "../data/students";
import { fromDbEnum, prisma } from "../db/prisma";
import type { PlanEntry, RecordEntry } from "../services/progress.service";
import type { TermRef } from "../services/term.service";

/**
 * Everything Sync stores about one student, loaded in a single query. Routes
 * load a snapshot, run the pure services on it, and write changes with the
 * small functions below.
 */
export interface StudentSnapshot {
  id: string;
  name: string;
  email: string;
  programId: string | null;
  target: TermRef | null;
  /** The shape the recommendation engine uses */
  record: StudentRecord;
  records: RecordEntry[];
  plan: PlanEntry[];
  saved: { opportunityId: string; status: string; notes: string | null }[];
}

export async function loadStudent(userId: string): Promise<StudentSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      records: { orderBy: [{ year: "asc" }, { season: "asc" }, { courseCode: "asc" }] },
      planCourses: { orderBy: [{ year: "asc" }, { season: "asc" }, { courseCode: "asc" }] },
      dismissedCourses: { orderBy: { createdAt: "asc" } },
      dismissedOpportunities: { orderBy: { createdAt: "asc" } },
      savedOpportunities: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!user) return null;

  const records: RecordEntry[] = user.records.map((r) => ({
    code: r.courseCode,
    status: r.status,
    season: r.season as TermSeason | null,
    year: r.year,
  }));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    programId: user.programId,
    target: user.targetSeason && user.targetYear ? { season: user.targetSeason as TermSeason, year: user.targetYear } : null,
    record: {
      id: user.id,
      programId: user.programId ?? "",
      completed: records.filter((r) => r.status === "COMPLETED").map((r) => r.code),
      inProgress: records.filter((r) => r.status === "IN_PROGRESS").map((r) => r.code),
      interests: user.interests,
      goal: fromDbEnum<Goal>(user.goal),
      maxCreditsPerTerm: user.maxCreditsPerTerm,
      dismissedCourses: user.dismissedCourses.map((d) => d.courseCode),
      dismissedOpportunities: user.dismissedOpportunities.map((d) => d.opportunityId),
    },
    records,
    plan: user.planCourses.map((p) => ({ code: p.courseCode, season: p.season as TermSeason, year: p.year })),
    saved: user.savedOpportunities.map((s) => ({
      opportunityId: s.opportunityId,
      status: fromDbEnum<string>(s.status),
      notes: s.notes,
    })),
  };
}
