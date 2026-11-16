import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { courseByCode, courses, findProgram } from "../data/catalog";
import { opportunities, type Goal } from "../data/opportunities";
import { getStudent, updateStudent } from "../data/students";
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
 * `:studentId` may be "me" for the logged-in user. Students may only reach
 * their own data; advisors and admins may read any student (NFR-4.3).
 */
export const recommendationsRouter = Router();

const GOALS = Object.keys(GOAL_TAGS) as Goal[];
export const INTEREST_OPTIONS = ["ai", "data", "security", "web", "systems", "theory", "software"];

/** Resolves "me", checks access, and stores the real id on res.locals.studentId */
function resolveStudent(req: Request, res: Response, next: NextFunction): void {
  const user = req.user!;
  const requested = String(req.params.studentId);
  const studentId = requested === "me" ? user.id : requested;
  const isSelf = studentId === user.id;
  const isStaff = user.role === "advisor" || user.role === "admin";
  const isWrite = req.method !== "GET";

  // Advisors/admins may view a student's recommendations but not change them
  if (!isSelf && (!isStaff || isWrite)) {
    res.status(403).json({ error: "You can only access your own recommendations." });
    return;
  }
  res.locals.studentId = studentId;
  next();
}

function buildResponse(studentId: string, termText: unknown) {
  const student = getStudent(studentId);
  const program = findProgram(student.programId);
  if (!program) throw new Error(`Unknown program ${student.programId}`);

  const today = new Date();
  const term = (typeof termText === "string" && parseTerm(termText)) || nextTerm(today);
  const courseResult = recommendCourses(student, program, courses, term);
  const opps = recommendOpportunities(student, opportunities, today);

  return {
    term,
    program: { id: program.id, name: program.name },
    preferences: {
      goal: student.goal,
      interests: student.interests,
      maxCreditsPerTerm: student.maxCreditsPerTerm,
    },
    options: { goals: GOALS, interests: INTEREST_OPTIONS },
    suggestedCredits: courseResult.suggestedCredits,
    courses: courseResult.courses,
    blocked: courseResult.blocked,
    postGrad: opps.filter((o) => o.category === "post-grad"),
    experiences: opps.filter((o) => o.category === "experience"),
    dismissed: {
      courses: student.dismissedCourses.map((code) => ({ id: code, title: `${code} ${courseByCode.get(code)?.name ?? ""}`.trim() })),
      opportunities: student.dismissedOpportunities.map((id) => ({
        id,
        title: opportunities.find((o) => o.id === id)?.title ?? id,
      })),
    },
  };
}

recommendationsRouter.get("/recommendations/:studentId", authenticateToken, resolveStudent, (req, res) => {
  if (typeof req.query.term === "string" && !parseTerm(req.query.term)) {
    res.status(400).json({ error: "term must look like SPRING-2027." });
    return;
  }
  res.json(buildResponse(res.locals.studentId, req.query.term));
});

recommendationsRouter.patch(
  "/recommendations/:studentId/preferences",
  authenticateToken,
  resolveStudent,
  (req, res) => {
    const { goal, interests } = req.body ?? {};
    const changes: { goal?: Goal; interests?: string[] } = {};

    if (goal !== undefined) {
      if (!GOALS.includes(goal)) {
        res.status(400).json({ error: `goal must be one of: ${GOALS.join(", ")}.` });
        return;
      }
      changes.goal = goal;
    }
    if (interests !== undefined) {
      if (!Array.isArray(interests) || !interests.every((i) => INTEREST_OPTIONS.includes(i))) {
        res.status(400).json({ error: `interests must be a list drawn from: ${INTEREST_OPTIONS.join(", ")}.` });
        return;
      }
      changes.interests = [...new Set(interests as string[])];
    }

    updateStudent(res.locals.studentId, changes);
    res.json(buildResponse(res.locals.studentId, req.query.term));
  }
);

function isKnown(kind: unknown, id: unknown): kind is "course" | "opportunity" {
  if (typeof id !== "string") return false;
  if (kind === "course") return courseByCode.has(id);
  if (kind === "opportunity") return opportunities.some((o) => o.id === id);
  return false;
}

recommendationsRouter.post(
  "/recommendations/:studentId/dismissals",
  authenticateToken,
  resolveStudent,
  (req, res) => {
    const { kind, id } = req.body ?? {};
    if (!isKnown(kind, id)) {
      res.status(400).json({ error: "Send { kind: 'course' | 'opportunity', id } for an existing item." });
      return;
    }
    const student = getStudent(res.locals.studentId);
    const key = kind === "course" ? "dismissedCourses" : "dismissedOpportunities";
    if (!student[key].includes(id)) {
      updateStudent(student.id, { [key]: [...student[key], id] });
    }
    res.status(201).json(buildResponse(res.locals.studentId, req.query.term));
  }
);

recommendationsRouter.delete(
  "/recommendations/:studentId/dismissals/:kind/:id",
  authenticateToken,
  resolveStudent,
  (req, res) => {
    const { kind, id } = req.params;
    if (!isKnown(kind, id)) {
      res.status(404).json({ error: "No such dismissed item." });
      return;
    }
    const student = getStudent(res.locals.studentId);
    const key = kind === "course" ? "dismissedCourses" : "dismissedOpportunities";
    updateStudent(student.id, { [key]: student[key].filter((x) => x !== id) });
    res.json(buildResponse(res.locals.studentId, req.query.term));
  }
);
