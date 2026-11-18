import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";

describe("GET /api/health", () => {
  /**
   * Test 1: Verify HTTP status code and expected JSON structure
   * - Ensures endpoint returns 200 OK without errors
   * - Validates that essential status fields and properties exist
   */
  it("returns 200 OK with healthy status and metadata", async () => {
    // Send a GET request to /api/health using supertest
    const res = await request(app).get("/api/health");

    // 1. Assert HTTP Status is 200 OK
    expect(res.status).toBe(200);

    // 2. Assert core response payload values
    expect(res.body.status).toBe("ok");
    expect(res.body.message).toBe("Sync backend service is healthy");
    expect(res.body.version).toBe("1.0.0");

    // 3. Assert required metadata properties are present
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("environment");
    expect(res.body).toHaveProperty("memory");
  });

  /**
   * Test 2: Timestamp format verification
   * - Confirms the timestamp is a valid ISO 8601 formatted date string
   */
  it("provides a valid ISO 8601 timestamp", async () => {
    const res = await request(app).get("/api/health");

    // Parsing the timestamp should produce a valid Unix epoch timestamp (not NaN)
    const parsedDate = new Date(res.body.timestamp);
    expect(parsedDate.getTime()).not.toBeNaN();
  });

  /**
   * Test 3: Memory metrics structure verification
   * - Ensures memory breakdown includes RSS, heapUsed, and heapTotal in readable format
   */
  it("provides memory usage breakdown", async () => {
    const res = await request(app).get("/api/health");

    // Assert that the memory object contains all three expected metrics
    expect(res.body.memory).toHaveProperty("rss");
    expect(res.body.memory).toHaveProperty("heapUsed");
    expect(res.body.memory).toHaveProperty("heapTotal");

    // Confirm that the memory string values end with "MB"
    expect(res.body.memory.rss).toMatch(/MB$/);
    expect(res.body.memory.heapUsed).toMatch(/MB$/);
    expect(res.body.memory.heapTotal).toMatch(/MB$/);
  });
});
