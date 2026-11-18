import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { loadStudentForRequest, currentStudent } from "../middleware/student-access";
import { catalogImportSchema, importCourses } from "../repositories/catalog-import";
import { parse } from "../http";
import { buildProgress } from "./progress.routes";

// Create an Express router for protected endpoints
export const protectedRouter = Router();

/**
 * 1. General Protected Route (/api/profile):
 * Protected by `authenticateToken`.
 * Accessible by ANY authenticated user (student, advisor, or admin).
 * Used to fetch the logged-in user's identity and basic session details.
 */
protectedRouter.get("/profile", authenticateToken, (req, res) => {
  res.json({
    message: "Access granted to user profile.",
    user: req.user,
  });
});

/**
 * 2. Protected Student Route (/api/student/progress):
 * Protected by `authenticateToken`.
 * Short summary of the logged-in student's degree progress.
 * The full version (categories, timeline) is GET /api/progress/me.
 */
protectedRouter.get(
  "/student/progress",
  authenticateToken,
  (req, _res, next) => {
    req.params.studentId = "me";
    next();
  },
  loadStudentForRequest,
  async (req, res) => {
    const progress = await buildProgress(currentStudent(res));
    res.json({
      message: "Degree progress data retrieved.",
      studentEmail: req.user?.email,
      progressPercentage: progress.percent,
    });
  }
);

/**
 * 3. Role-Protected Advisor Route (/api/advisor/reviews):
 * Protected by both `authenticateToken` AND `requireRole(["advisor", "admin"])`.
 * Restricts access so regular students receive a 403 Forbidden.
 */
protectedRouter.get(
  "/advisor/reviews",
  authenticateToken,
  requireRole(["advisor", "admin"]),
  (req, res) => {
    res.json({
      message: "Advisor review queue loaded.",
      advisor: req.user?.email,
    });
  }
);

/**
 * 4. Strict Role-Protected Admin Route (/api/admin/catalog/import):
 * Protected by both `authenticateToken` AND `requireRole(["admin"])`.
 * Adds or updates courses and prerequisites. Body: { courses: [...] }
 * (see repositories/catalog-import.ts). Rejects unknown prerequisites and
 * circular prerequisite chains with 400 (FR-12.2).
 */
protectedRouter.post(
  "/admin/catalog/import",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    const imported = await importCourses(parse(catalogImportSchema, req.body));
    res.json({
      message: "Course catalog imported successfully by administrator.",
      admin: req.user?.email,
      imported,
    });
  }
);
