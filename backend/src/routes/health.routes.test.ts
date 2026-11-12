import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";

describe("GET /api/health", () => {
  // Test 1: HTTP Status and Core Fields
  it("returns 200 OK with healthy status and metadata", async () => {
    const res = await request(app).get("/api/health");

    // Status code verification
    expect(res.status).toBe(200);

    // Body payload verification
    expect(res.body.status).toBe("ok");
    expect(res.body.message).toBe("Sync backend service is healthy");
    expect(res.body.version).toBe("1.0.0");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("environment");
    expect(res.body).toHaveProperty("memory");
  });

  // Test 2: ISO Timestamp validation
  it("provides a valid ISO 8601 timestamp", async () => {
    const res = await request(app).get("/api/health");

    const parsedDate = new Date(res.body.timestamp);
    expect(parsedDate.getTime()).not.toBeNaN();
  });

  // Test 3: Memory details structure
  it("provides memory usage breakdown", async () => {
    const res = await request(app).get("/api/health");

    expect(res.body.memory).toHaveProperty("rss");
    expect(res.body.memory).toHaveProperty("heapUsed");
    expect(res.body.memory).toHaveProperty("heapTotal");
  });
});

