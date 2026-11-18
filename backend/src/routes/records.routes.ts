import { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.middleware";
import { currentStudent, loadStudentForRequest } from "../middleware/student-access";
import { getCatalog } from "../repositories/catalog.repo";
import { loadStudent, type StudentSnapshot } from "../repositories/student.repo";
import { prisma } from "../db/prisma";
import { HttpError, parse } from "../http";
import { makeTerm, parseTerm } from "../services/term.service";

/**
 * Completed and in-progress coursework (FR-3). Not used by a page yet; the
 * Degree Progress page will use it to let students enter their history.
 *
 *   GET    /api/records/:studentId
 *   PUT    /api/records/:studentId/courses/:code   { status: "completed" | "in-progress", grade?, term? }
 *   DELETE /api/records/:studentId/courses/:code
 *
 * Recording a course removes it from the plan, since it no longer needs planning.
 */
export const recordsRouter = Router();

const recordBody = z.object({
  status: z.enum(["completed", "in-progress"]),
  grade: z.string().trim().max(3).nullable().optional(),
  term: z
    .string()
    .refine((t) => parseTerm(t) !== null, "term must look like FALL-2025.")
    .nullable()
    .optional(),
});

function listRecords(student: StudentSnapshot, byCode: Map<string, { name: string; credits: number }>) {
  return {
    records: student.records.map((r) => ({
      code: r.code,
      name: byCode.get(r.code)?.name ?? r.code,
      credits: byCode.get(r.code)?.credits ?? 0,
      status: r.status === "COMPLETED" ? "completed" : "in-progress",
      term: r.season && r.year ? makeTerm(r.season, r.year) : null,
    })),
  };
}

recordsRouter.get("/records/:studentId", authenticateToken, loadStudentForRequest, async (_req, res) => {
  res.json(listRecords(currentStudent(res), (await getCatalog()).byCode));
});

recordsRouter.put("/records/:studentId/courses/:code", authenticateToken, loadStudentForRequest, async (req, res) => {
  const body = parse(recordBody, req.body);
  const student = currentStudent(res);
  const code = String(req.params.code);
  const { byCode } = await getCatalog();
  if (!byCode.has(code)) throw new HttpError(404, `No course ${code}.`);

  const term = body.term ? parseTerm(body.term) : null;
  const data = {
    status: body.status === "completed" ? ("COMPLETED" as const) : ("IN_PROGRESS" as const),
    grade: body.grade ?? null,
    season: term?.season ?? null,
    year: term?.year ?? null,
  };
  await prisma.$transaction([
    prisma.academicRecord.upsert({
      where: { userId_courseCode: { userId: student.id, courseCode: code } },
      create: { userId: student.id, courseCode: code, ...data },
      update: data,
    }),
    prisma.planCourse.deleteMany({ where: { userId: student.id, courseCode: code } }),
  ]);
  res.json(listRecords((await loadStudent(student.id))!, byCode));
});

recordsRouter.delete("/records/:studentId/courses/:code", authenticateToken, loadStudentForRequest, async (req, res) => {
  const student = currentStudent(res);
  const code = String(req.params.code);
  const deleted = await prisma.academicRecord.deleteMany({ where: { userId: student.id, courseCode: code } });
  if (deleted.count === 0) throw new HttpError(404, `${code} isn't on your record.`);
  res.json(listRecords((await loadStudent(student.id))!, (await getCatalog()).byCode));
});
