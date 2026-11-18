import { Router, Request, Response } from "express";
import { config } from "../config";

// Create a dedicated Express router for health checks and service monitoring
export const healthRouter = Router();

/**
 * Endpoint: GET /api/health
 * Access: Public (no authentication required)
 * 
 * Purpose:
 * Provides a lightweight health check endpoint for:
 * 1. Cloud load balancers / container orchestrators (AWS ECS, Kubernetes, Render, Railway)
 *    to determine if the backend container is healthy and ready to accept traffic.
 * 2. Frontend / status pages to check API availability.
 * 3. Developer debugging: returns runtime statistics including process uptime,
 *    current environment, service version, and memory allocation.
 */
healthRouter.get("/health", (_req: Request, res: Response) => {
  // Calculate process uptime (how many seconds the Node server has been running)
  const uptimeSeconds = Math.floor(process.uptime());

  // Capture current memory usage from the Node.js V8 runtime
  const memoryUsage = process.memoryUsage();

  // Convert raw bytes to readable megabytes (MB) formatted to two decimal places
  const memoryUsageMB = {
    // Resident Set Size: total memory allocated for the process execution in RAM
    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    // Heap Used: actual memory currently occupied by JavaScript objects and variables
    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    // Heap Total: total allocated size of the V8 JavaScript heap
    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  };

  // Return HTTP 200 OK with a structured JSON health payload
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
