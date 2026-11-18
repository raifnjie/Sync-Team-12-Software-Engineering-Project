import { Router, type Response } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.middleware";
import { currentStudent, loadStudentForRequest } from "../middleware/student-access";
import { getCatalog } from "../repositories/catalog.repo";
import { loadStudent, type StudentSnapshot } from "../repositories/student.repo";
import { prisma } from "../db/prisma";
import { HttpError, parse } from "../http";
import { checkPlacement, planConflicts } from "../services/plan.service";
import { currentTerm, makeTerm, nextTerm, parseTerm, termIndex, type Term } from "../services/term.service";

/**
 * Degree plan (FR-6). One plan per student: each planned course sits in one future term.
 *
 *   GET    /api/plans/:studentId                          -> plan
 *   POST   /api/plans/:studentId/courses        { code, term? }   add (term defaults to next term)
 *   PATCH  /api/plans/:studentId/courses/:code  { term }          move to another term
 *   DELETE /api/plans/:studentId/courses/:code                    remove
 *
 * Adding or moving checks prerequisites against completed courses, courses in
 * progress, and courses planned in earlier terms, and that the course is offered
 * that term. A problem returns 409 with { error, reason, missing? }.
 * Removing is always allowed; courses left without their prerequisites come back
 * with `missing` filled in so the UI can flag them.
 */
export const plansRouter = Router();

const termText = z.string().transform((text, ctx) => {
  const term = parseTerm(text);
  if (!term) {
    ctx.addIssue({ code: "custom", message: "term must look like SPRING-2027." });
    return z.NEVER;
  }
  return term;
});

const addBody = z.object({ code: z.string().trim().min(1), term: termText.optional() });
const moveBody = z.object({ term: termText });

async function buildPlan(student: StudentSnapshot) {
  const { byCode } = await getCatalog();
  const conflicts = planConflicts(byCode, student.records, student.plan);
  const courses = student.plan.map((p) => {
    const course = byCode.get(p.code);
    return {
      code: p.code,
      name: course?.name ?? p.code,
      credits: course?.credits ?? 0,
      term: makeTerm(p.season, p.year),
      missing: conflicts.get(p.code) ?? [],
    };
  });
  return {
    defaultTerm: nextTerm(new Date()),
    totalCredits: courses.reduce((sum, c) => sum + c.credits, 0),
    courses,
  };
}

async function respond(res: Response, studentId: string, status = 200) {
  res.status(status).json(await buildPlan((await loadStudent(studentId))!));
}

/** Plans are for future terms only */
function assertFuture(term: Term) {
  if (termIndex(term) <= termIndex(currentTerm(new Date()))) {
    throw new HttpError(400, `Pick a term after ${currentTerm(new Date()).label}.`);
  }
}

async function validatePlacement(student: StudentSnapshot, code: string, term: Term) {
  const { byCode } = await getCatalog();
  const course = byCode.get(code);
  if (!course) throw new HttpError(404, `No course ${code}.`);
  assertFuture(term);
  const problem = checkPlacement(course, term, student.records, student.plan);
  if (problem) {
    const { message, ...extra } = problem;
    throw new HttpError(409, message, extra);
  }
}

plansRouter.get("/plans/:studentId", authenticateToken, loadStudentForRequest, async (_req, res) => {
  res.json(await buildPlan(currentStudent(res)));
});

plansRouter.post("/plans/:studentId/courses", authenticateToken, loadStudentForRequest, async (req, res) => {
  const body = parse(addBody, req.body);
  const student = currentStudent(res);
  const term = body.term ?? nextTerm(new Date());

  const existing = student.plan.find((p) => p.code === body.code);
  if (existing) {
    throw new HttpError(409, `${body.code} is already in your plan for ${makeTerm(existing.season, existing.year).label}.`, {
      reason: "already-planned",
    });
  }
  await validatePlacement(student, body.code, term);
  await prisma.planCourse.create({
    data: { userId: student.id, courseCode: body.code, season: term.season, year: term.year },
  });
  await respond(res, student.id, 201);
});

plansRouter.patch("/plans/:studentId/courses/:code", authenticateToken, loadStudentForRequest, async (req, res) => {
  const { term } = parse(moveBody, req.body);
  const student = currentStudent(res);
  const code = String(req.params.code);
  if (!student.plan.some((p) => p.code === code)) throw new HttpError(404, `${code} isn't in your plan.`);

  await validatePlacement(student, code, term);
  await prisma.planCourse.update({
    where: { userId_courseCode: { userId: student.id, courseCode: code } },
    data: { season: term.season, year: term.year },
  });
  await respond(res, student.id);
});

plansRouter.delete("/plans/:studentId/courses/:code", authenticateToken, loadStudentForRequest, async (req, res) => {
  const student = currentStudent(res);
  const code = String(req.params.code);
  const deleted = await prisma.planCourse.deleteMany({ where: { userId: student.id, courseCode: code } });
  if (deleted.count === 0) throw new HttpError(404, `${code} isn't in your plan.`);
  await respond(res, student.id);
});

