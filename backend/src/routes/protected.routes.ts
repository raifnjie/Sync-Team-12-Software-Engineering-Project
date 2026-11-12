import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

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
 * Demonstrates retrieving student-specific academic progress from a token.
 */
protectedRouter.get("/student/progress", authenticateToken, (req, res) => {
  res.json({
    message: "Degree progress data retrieved.",
    studentEmail: req.user?.email,
    progressPercentage: 80,
  });
});

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
 * Demonstrates privileged administrative actions (e.g., uploading university catalog data).
 */
protectedRouter.post(
  "/admin/catalog/import",
  authenticateToken,
  requireRole(["admin"]),
  (req, res) => {
    res.json({
      message: "Course catalog imported successfully by administrator.",
      admin: req.user?.email,
    });
  }
);
