import { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.middleware";
import { currentStudent, loadStudentForRequest } from "../middleware/student-access";
import { getCatalog } from "../repositories/catalog.repo";
import { loadStudent, type StudentSnapshot } from "../repositories/student.repo";
import { prisma, toDbEnum } from "../db/prisma";
import { HttpError, parse } from "../http";
import type { ApplicationStatus } from "../generated/prisma/client";

/**
 * Saved post-grad options and experiences, with application tracking (FR-10.2, FR-10.3)
 *
 *   GET    /api/opportunities/:studentId/saved
 *   PUT    /api/opportunities/:studentId/saved/:id   { status?: "saved" | "applied" | "accepted" | "rejected", notes? }
 *   DELETE /api/opportunities/:studentId/saved/:id
 */
export const opportunitiesRouter = Router();

const saveBody = z.object({
  status: z.enum(["saved", "applied", "accepted", "rejected"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

async function listSaved(student: StudentSnapshot) {
  const { opportunities } = await getCatalog();
  return {
    saved: student.saved.map((s) => {
      const opp = opportunities.find((o) => o.id === s.opportunityId);
      return {
        id: s.opportunityId,
        title: opp?.title ?? s.opportunityId,
        organization: opp?.organization ?? "",
        deadline: opp?.deadline ?? null,
        status: s.status,
        notes: s.notes,
      };
    }),
  };
}

opportunitiesRouter.get("/opportunities/:studentId/saved", authenticateToken, loadStudentForRequest, async (_req, res) => {
  res.json(await listSaved(currentStudent(res)));
});

opportunitiesRouter.put("/opportunities/:studentId/saved/:id", authenticateToken, loadStudentForRequest, async (req, res) => {
  const body = parse(saveBody, req.body);
  const student = currentStudent(res);
  const id = String(req.params.id);
  const { opportunities } = await getCatalog();
  if (!opportunities.some((o) => o.id === id)) throw new HttpError(404, `No opportunity ${id}.`);

  const data = {
    ...(body.status ? { status: toDbEnum<ApplicationStatus>(body.status) } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  };
  await prisma.savedOpportunity.upsert({
    where: { userId_opportunityId: { userId: student.id, opportunityId: id } },
    create: { userId: student.id, opportunityId: id, ...data },
    update: data,
  });
  res.json(await listSaved((await loadStudent(student.id))!));
});

opportunitiesRouter.delete("/opportunities/:studentId/saved/:id", authenticateToken, loadStudentForRequest, async (req, res) => {
  const student = currentStudent(res);
  const deleted = await prisma.savedOpportunity.deleteMany({
    where: { userId: student.id, opportunityId: String(req.params.id) },
  });
  if (deleted.count === 0) throw new HttpError(404, "That opportunity isn't saved.");
  res.json(await listSaved((await loadStudent(student.id))!));
});
