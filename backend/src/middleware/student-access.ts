import type { NextFunction, Request, Response } from "express";
import { loadStudent, type StudentSnapshot } from "../repositories/student.repo";

/**
 * For routes shaped like /api/<feature>/:studentId/...
 *
 * - `:studentId` may be "me" for the logged-in user.
 * - Students may only reach their own data (NFR-4.3).
 * - Advisors and admins may read a student's data but not change it.
 *
 * On success the student's data is on `res.locals.student`. Use after
 * authenticateToken.
 */
export async function loadStudentForRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user!;
  const requested = String(req.params.studentId);
  const studentId = requested === "me" ? user.id : requested;
  const isSelf = studentId === user.id;
  const isStaff = user.role === "advisor" || user.role === "admin";

  if (!isSelf && (!isStaff || req.method !== "GET")) {
    res.status(403).json({ error: "You can only access your own data." });
    return;
  }

  const student = await loadStudent(studentId);
  if (!student) {
    if (isSelf) {
      // A valid token for an account that no longer exists (for example after the database was reset)
      res.status(401).json({ error: "Your session is no longer valid. Please log in again." });
    } else {
      res.status(404).json({ error: "No student with that id." });
    }
    return;
  }

  res.locals.student = student;
  next();
}

export function currentStudent(res: Response): StudentSnapshot {
  return res.locals.student as StudentSnapshot;
}
