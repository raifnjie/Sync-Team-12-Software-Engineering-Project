import express from "express";
import cors from "cors";
import { config } from "./config";
import { healthRouter } from "./routes/health.routes";
import { protectedRouter } from "./routes/protected.routes";
import { recommendationsRouter } from "./routes/recommendations.routes";
import { authRouter } from "./routes/auth.routes";
import { plansRouter } from "./routes/plans.routes";
import { progressRouter } from "./routes/progress.routes";
import { recordsRouter } from "./routes/records.routes";
import { opportunitiesRouter } from "./routes/opportunities.routes";
import { generateToken } from "./middleware/auth.middleware";
import { errorHandler } from "./http";

// Initialize the Express backend application
const app = express();

/**
 * 1. CORS Middleware (Cross-Origin Resource Sharing):
 * Enables the frontend application (Vite running on http://localhost:5173)
 * to communicate with this backend API over HTTP without browser origin blocking.
 */
app.use(
  cors({
    origin: config.corsOrigin, // Allowed client URL from .env
    credentials: true, // Allow cookies and authorization headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * 2. Body Parser:
 * Automatically parses incoming JSON request bodies into `req.body`
 */
app.use(express.json());

/**
 * 3. Mount Public Health Check Routes:
 * GET /api/health
 */
app.use("/api", healthRouter);

/**
 * 4. Accounts: register, log in, forgot password, current user (/api/auth/...)
 */
app.use("/api", authRouter);

/**
 * Development-only helper that issues a signed JWT for any role, for trying
 * role-protected routes. Never available in production.
 */
if (config.nodeEnv !== "production") {
  app.post("/api/auth/demo-token", (req, res) => {
    const { email = "student@gsu.edu", role = "student", id = "usr-1" } = req.body || {};
    const token = generateToken({ id, email, role });
    res.json({ token, role, email });
  });
}

/**
 * 5. Mount Protected Routes:
 * Registers all protected endpoints behind the "/api" prefix.
 */
app.use("/api", protectedRouter);

/**
 * 6. Recommendations (courses, post-grad options, experiences):
 * GET/PATCH/POST/DELETE /api/recommendations/:studentId/...
 */
app.use("/api", recommendationsRouter);

/**
 * 7. Student data: degree plan, progress and timeline, academic record, saved opportunities
 */
app.use("/api", plansRouter);
app.use("/api", progressRouter);
app.use("/api", recordsRouter);
app.use("/api", opportunitiesRouter);

/**
 * 8. Unknown /api routes and errors always answer with JSON
 */
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});
app.use(errorHandler);

// Start the Express HTTP listener (skipped during unit tests so test runner controls lifecycle)
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`CORS enabled for origin: ${config.corsOrigin}`);
  });
}

export default app;
