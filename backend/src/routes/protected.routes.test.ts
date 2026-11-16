import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";
import { generateToken } from "../middleware/auth.middleware";

describe("CORS, Environment & Protected Routes Integration Tests", () => {
  // Generate a mock student token (simulates a logged-in student)
  const studentToken = generateToken({
    id: "stu-1",
    email: "student@gsu.edu",
    role: "student",
  });

  // Generate a mock admin token (simulates a logged-in system administrator)
  const adminToken = generateToken({
    id: "adm-1",
    email: "admin@gsu.edu",
    role: "admin",
  });

  // ─── Test Suite 1: CORS Headers ──────────────────────────────────────────
  describe("CORS configuration", () => {
    // Verifies the backend accepts requests from the Vite frontend port (http://localhost:5173)
    it("returns appropriate CORS headers for authorized frontend origin", async () => {
      const res = await request(app)
        .get("/api/health")
        .set("Origin", "http://localhost:5173");

      // Check HTTP 200 OK
      expect(res.status).toBe(200);
      // Verify origin allowed by CORS
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      // Verify credentials/cookies/tokens are permitted across origins
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });
  });

  // ─── Test Suite 2: General Protected Route (/api/profile) ─────────────────
  describe("Protected Routes (/api/profile)", () => {
    // 1. Missing Token -> Expect 401 Unauthorized
    it("rejects request without token with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/profile");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Access denied. No token provided.");
    });

    // 2. Valid Token -> Expect 200 OK with decoded user payload
    it("allows request with valid token and returns profile", async () => {
      const res = await request(app)
        .get("/api/profile")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("student@gsu.edu");
      expect(res.body.user.role).toBe("student");
    });
  });

  // ─── Test Suite 3: Role-Protected Route (/api/admin/catalog/import) ───────
  describe("Role-based Protected Routes (/api/admin/catalog/import)", () => {
    // 1. Authenticated as Student -> Blocked from Admin endpoint (403 Forbidden)
    it("rejects non-admin role with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/admin/catalog/import")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Access forbidden");
    });

    // 2. Authenticated as Admin -> Allowed to access Admin endpoint (200 OK)
    it("allows admin user to access admin-only endpoint", async () => {
      const res = await request(app)
        .post("/api/admin/catalog/import")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          courses: [
            { code: "CSC 4998", name: "Special Topics", credits: 3, termsOffered: ["FALL"], prerequisites: [{ anyOf: ["CSC 2720"] }] },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("imported successfully");
      expect(res.body.imported).toBe(1);
    });

    // 3. Admin import is validated: an empty body is rejected
    it("rejects an import with no courses", async () => {
      const res = await request(app)
        .post("/api/admin/catalog/import")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    // 4. Circular prerequisites are rejected (FR-12.2)
    it("rejects an import that would create circular prerequisites", async () => {
      const res = await request(app)
        .post("/api/admin/catalog/import")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          courses: [
            { code: "CSC 4996", name: "Loop A", credits: 3, termsOffered: ["FALL"], prerequisites: [{ anyOf: ["CSC 4997"] }] },
            { code: "CSC 4997", name: "Loop B", credits: 3, termsOffered: ["FALL"], prerequisites: [{ anyOf: ["CSC 4996"] }] },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Circular prerequisites");
    });
  });
});
