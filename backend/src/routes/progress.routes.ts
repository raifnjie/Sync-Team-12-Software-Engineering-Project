import { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.middleware";
import { currentStudent, loadStudentForRequest } from "../middleware/student-access";
import { getCatalog } from "../repositories/catalog.repo";
import { loadStudent, type StudentSnapshot } from "../repositories/student.repo";
import { prisma } from "../db/prisma";
import { HttpError, parse } from "../http";
import { buildTimeline, degreeProgress } from "../services/progress.service";
import { recommendCourses } from "../services/recommendation.service";
import { currentTerm, nextTerm, parseTerm } from "../services/term.service";

/**
 * Degree progress and graduation timeline (FR-4, FR-8)
 *
 *   GET   /api/progress/:studentId              -> credits, per-category progress, expected
 *                                                  graduation, and the term-by-term timeline
 *   PATCH /api/progress/:studentId/settings     { targetTerm?: "FALL-2027" | null, maxCreditsPerTerm? }
 *
 * The timeline combines the academic record, the plan, and (for next term)
 * the recommended courses that fit the student's credit limit.
 */
export const progressRouter = Router();

const settingsBody = z.object({
  targetTerm: z
    .string()
    .refine((t) => parseTerm(t) !== null, "targetTerm must look like FALL-2027.")
    .nullable()
    .optional(),
  maxCreditsPerTerm: z.number().int().min(1).max(24).optional(),
});

export async function buildProgress(student: StudentSnapshot) {
  const catalog = await getCatalog();
  const program = catalog.programs.find((p) => p.id === student.programId);
  if (!program) throw new HttpError(409, "Choose a degree program to see your progress.");

  const today = new Date();
  const progress = degreeProgress(
    program,
    catalog.byCode,
    student.records,
    student.record.maxCreditsPerTerm,
    today,
    student.target
  );
  const recommended = recommendCourses(student.record, program, catalog.courses, nextTerm(today))
    .courses.filter((c) => c.fitsLoad)
    .map((c) => c.code);
  // Recommended courses fill whatever room the plan leaves next term
  const plannedNext = student.plan.filter((p) => {
    const next = nextTerm(today);
    return p.season === next.season && p.year === next.year;
  });
  let room =
    student.record.maxCreditsPerTerm -
    plannedNext.reduce((sum, p) => sum + (catalog.byCode.get(p.code)?.credits ?? 0), 0);
  const planned = new Set(student.plan.map((p) => p.code));
  const fill = recommended.filter((code) => {
    if (planned.has(code)) return false;
    const credits = catalog.byCode.get(code)?.credits ?? 0;
    if (credits > room) return false;
    room -= credits;
    return true;
  });

  return {
    student: { id: student.id, name: student.name },
    program: { id: program.id, name: program.name },
    currentTerm: currentTerm(today),
    maxCreditsPerTerm: student.record.maxCreditsPerTerm,
    ...progress,
    timeline: buildTimeline(catalog.byCode, student.records, student.plan, fill, today),
  };
}

progressRouter.get("/progress/:studentId", authenticateToken, loadStudentForRequest, async (_req, res) => {
  res.json(await buildProgress(currentStudent(res)));
});

progressRouter.patch("/progress/:studentId/settings", authenticateToken, loadStudentForRequest, async (req, res) => {
  const body = parse(settingsBody, req.body);
  const student = currentStudent(res);
  const target = body.targetTerm ? parseTerm(body.targetTerm) : null;

  await prisma.user.update({
    where: { id: student.id },
    data: {
      ...(body.targetTerm !== undefined ? { targetSeason: target?.season ?? null, targetYear: target?.year ?? null } : {}),
      ...(body.maxCreditsPerTerm !== undefined ? { maxCreditsPerTerm: body.maxCreditsPerTerm } : {}),
    },
  });
  res.json(await buildProgress((await loadStudent(student.id))!));
});
