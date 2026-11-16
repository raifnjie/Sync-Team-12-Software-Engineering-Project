import { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.middleware";
import { currentStudent, loadStudentForRequest } from "../middleware/student-access";
import { getCatalog } from "../repositories/catalog.repo";
import { loadStudent, type StudentSnapshot } from "../repositories/student.repo";
import { prisma, toDbEnum } from "../db/prisma";
import { HttpError, parse } from "../http";
import type { Goal } from "../data/opportunities";
import type { Goal as DbGoal } from "../generated/prisma/client";
import {
  GOAL_TAGS,
  nextTerm,
  parseTerm,
  recommendCourses,
  recommendOpportunities,
} from "../services/recommendation.service";

/**
 * Recommendations API (FR-7, FR-10.4)
 *
 *   GET    /api/recommendations/:studentId?term=SPRING-2027
 *   PATCH  /api/recommendations/:studentId/preferences          { goal?, interests? }
 *   POST   /api/recommendations/:studentId/dismissals           { kind: "course" | "opportunity", id }
 *   DELETE /api/recommendations/:studentId/dismissals/:kind/:id
 *
 * Every write returns the full, re-ranked response so the page can just swap it in.
 * `:studentId` may be "me". See middleware/student-access.ts for who can reach what.
 */
export const recommendationsRouter = Router();

const GOALS = Object.keys(GOAL_TAGS) as Goal[];
export const INTEREST_OPTIONS = ["ai", "data", "security", "web", "systems", "theory", "software"];

const termQuery = z.object({
  term: z
    .string()
    .refine((t) => parseTerm(t) !== null, "term must look like SPRING-2027.")
    .optional(),
});

const preferencesBody = z.object({
  goal: z.enum(GOALS as [Goal, ...Goal[]]).optional(),
  interests: z
    .array(z.enum(INTEREST_OPTIONS as [string, ...string[]]))
    .transform((list) => [...new Set(list)])
    .optional(),
});

const dismissalBody = z.object({ kind: z.enum(["course", "opportunity"]), id: z.string().min(1) });

export async function buildRecommendations(student: StudentSnapshot, termText?: string) {
  const catalog = await getCatalog();
  const program = catalog.programs.find((p) => p.id === student.programId);
  if (!program) throw new HttpError(409, "Choose a degree program before getting recommendations.");

  const today = new Date();
  const term = (termText && parseTerm(termText)) || nextTerm(today);
  const courseResult = recommendCourses(student.record, program, catalog.courses, term);
  const opps = recommendOpportunities(student.record, catalog.opportunities, today, catalog.byCode);

  return {
    term,
    program: { id: program.id, name: program.name },
    preferences: {
      goal: student.record.goal,
      interests: student.record.interests,
      maxCreditsPerTerm: student.record.maxCreditsPerTerm,
    },
    options: { goals: GOALS, interests: INTEREST_OPTIONS },
    suggestedCredits: courseResult.suggestedCredits,
    courses: courseResult.courses,
    blocked: courseResult.blocked,
    postGrad: opps.filter((o) => o.category === "post-grad"),
    experiences: opps.filter((o) => o.category === "experience"),
    saved: student.saved.map((s) => s.opportunityId),
    dismissed: {
      courses: student.record.dismissedCourses.map((code) => ({
        id: code,
        title: `${code} ${catalog.byCode.get(code)?.name ?? ""}`.trim(),
      })),
      opportunities: student.record.dismissedOpportunities.map((id) => ({
        id,
        title: catalog.opportunities.find((o) => o.id === id)?.title ?? id,
      })),
    },
  };
}

/** Reloads the student after a change and sends the re-ranked recommendations */
async function respond(res: import("express").Response, studentId: string, termText: string | undefined, status = 200) {
  const student = await loadStudent(studentId);
  res.status(status).json(await buildRecommendations(student!, termText));
}

recommendationsRouter.get("/recommendations/:studentId", authenticateToken, loadStudentForRequest, async (req, res) => {
  const { term } = parse(termQuery, req.query);
  res.json(await buildRecommendations(currentStudent(res), term));
});

recommendationsRouter.patch(
  "/recommendations/:studentId/preferences",
  authenticateToken,
  loadStudentForRequest,
  async (req, res) => {
    const { term } = parse(termQuery, req.query);
    const body = parse(preferencesBody, req.body);
    const student = currentStudent(res);

    await prisma.user.update({
      where: { id: student.id },
      data: {
        ...(body.goal ? { goal: toDbEnum<DbGoal>(body.goal) } : {}),
        ...(body.interests ? { interests: body.interests } : {}),
      },
    });
    await respond(res, student.id, term);
  }
);

recommendationsRouter.post(
  "/recommendations/:studentId/dismissals",
  authenticateToken,
  loadStudentForRequest,
  async (req, res) => {
    const { term } = parse(termQuery, req.query);
    const { kind, id } = parse(dismissalBody, req.body);
    const student = currentStudent(res);
    const catalog = await getCatalog();

    if (kind === "course") {
      if (!catalog.byCode.has(id)) throw new HttpError(400, `No course ${id}.`);
      await prisma.dismissedCourse.upsert({
        where: { userId_courseCode: { userId: student.id, courseCode: id } },
        create: { userId: student.id, courseCode: id },
        update: {},
      });
    } else {
      if (!catalog.opportunities.some((o) => o.id === id)) throw new HttpError(400, `No opportunity ${id}.`);
      await prisma.dismissedOpportunity.upsert({
        where: { userId_opportunityId: { userId: student.id, opportunityId: id } },
        create: { userId: student.id, opportunityId: id },
        update: {},
      });
    }
    await respond(res, student.id, term, 201);
  }
);

recommendationsRouter.delete(
  "/recommendations/:studentId/dismissals/:kind/:id",
  authenticateToken,
  loadStudentForRequest,
  async (req, res) => {
    const { term } = parse(termQuery, req.query);
    const { kind, id } = parse(dismissalBody, req.params);
    const student = currentStudent(res);

    const deleted =
      kind === "course"
        ? await prisma.dismissedCourse.deleteMany({ where: { userId: student.id, courseCode: id } })
        : await prisma.dismissedOpportunity.deleteMany({ where: { userId: student.id, opportunityId: id } });
    if (deleted.count === 0) throw new HttpError(404, "No such dismissed item.");
    await respond(res, student.id, term);
  }
);
