import { Router, Request, Response } from "express";
import { config } from "../config";

// Create a dedicated router for health and system monitoring
export const healthRouter = Router();

/**
 * GET /api/health
 * Public health check endpoint:
 * - Checks whether the server is up and responding
 * - Reports uptime, current timestamp, environment mode, and memory usage
 * - Used by cloud providers, load balancers, Docker, and frontend status checks
 */
healthRouter.get("/health", (_req: Request, res: Response) => {
  // Calculate process uptime in seconds
  const uptimeSeconds = Math.floor(process.uptime());

  // Get current system memory usage metrics in megabytes
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  };

  res.status(200).json({
    status: "ok",
    message: "Sync backend service is healthy",
    uptime: `${uptimeSeconds}s`,
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: "1.0.0",
    memory: memoryUsageMB,
  });
});

