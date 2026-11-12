import express from "express";
import cors from "cors";
import { config } from "./config";
import { healthRouter } from "./routes/health.routes";
import { protectedRouter } from "./routes/protected.routes";
import { generateToken } from "./middleware/auth.middleware";

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
 * 4. Sample Public Auth Route (/api/auth/demo-token):
 * Helper endpoint for testing that issues signed JWTs for different roles.
 */
app.post("/api/auth/demo-token", (req, res) => {
  const { email = "student@gsu.edu", role = "student", id = "usr-1" } = req.body || {};
  const token = generateToken({ id, email, role });
  res.json({ token, role, email });
});

/**
 * 5. Mount Protected Routes:
 * Registers all protected endpoints behind the "/api" prefix.
 */
app.use("/api", protectedRouter);

// Start the Express HTTP listener (skipped during unit tests so test runner controls lifecycle)
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    console.log(`CORS enabled for origin: ${config.corsOrigin}`);
  });
}

export default app;
