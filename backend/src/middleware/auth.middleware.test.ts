import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
  authenticateToken,
  requireRole,
  generateToken,
  AuthUserPayload,
} from "./auth.middleware";

// Type definition for our mocked Express Response object
type MockResponse = Response & { statusCode: number; jsonData: any };

/**
 * Helper to build mock Express `req`, `res`, and `next` objects for unit tests
 * without spinning up a real HTTP server.
 */
function createMockReqRes(authHeader?: string, user?: AuthUserPayload) {
  // Mock Request: includes headers and an optional user object
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    user,
  } as unknown as Request;

  // Mock Response: captures the status code and json response sent by the middleware
  const resObj: {
    statusCode: number;
    jsonData: any;
    status: (code: number) => any;
    json: (data: any) => any;
  } = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.jsonData = data;
      return this;
    },
  };

  const res = resObj as unknown as MockResponse;

  // Mock NextFunction: a spy to verify if next() was called
  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("JWT Auth Middleware (authenticateToken)", () => {
  // Sample test user payload
  const testUser: AuthUserPayload = {
    id: "user-123",
    email: "test@gsu.edu",
    role: "student",
  };

  // Test 1: Missing Authorization Header
  it("returns 401 if no Authorization header is provided", () => {
    const { req, res, next } = createMockReqRes();

    authenticateToken(req, res, next);

    // Should reject with 401 Unauthorized
    expect(res.statusCode).toBe(401);
    expect(res.jsonData).toEqual({ error: "Access denied. No token provided." });
    // next() should NOT be called
    expect(next).not.toHaveBeenCalled();
  });

  // Test 2: Invalid or Malformed Token
  it("returns 403 if token is invalid", () => {
    const { req, res, next } = createMockReqRes("Bearer invalid-token");

    authenticateToken(req, res, next);

    // Should reject with 403 Forbidden
    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toEqual({ error: "Invalid or expired token." });
    expect(next).not.toHaveBeenCalled();
  });

  // Test 3: Valid Token
  it("successfully verifies valid token and attaches user to req", () => {
    // Generate a valid signed token
    const validToken = generateToken(testUser);
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);

    authenticateToken(req, res, next);

    // next() should be called to let the request continue
    expect(next).toHaveBeenCalled();
    // req.user should be populated with the decoded token payload
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe(testUser.id);
    expect(req.user?.email).toBe(testUser.email);
    expect(req.user?.role).toBe(testUser.role);
  });
});

describe("Role Authorization Middleware (requireRole)", () => {
  // Test 1: User is not authenticated at all
  it("returns 401 if user is not authenticated", () => {
    const { req, res, next } = createMockReqRes();
    const middleware = requireRole(["admin"]);

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  // Test 2: User is authenticated but does not have the required role
  it("returns 403 if user does not possess required role", () => {
    const studentUser: AuthUserPayload = { id: "1", email: "s@gsu.edu", role: "student" };
    const { req, res, next } = createMockReqRes(undefined, studentUser);

    // Only advisors or admins allowed for this route
    const middleware = requireRole(["advisor", "admin"]);

    middleware(req, res, next);

    // Student role is rejected with 403 Forbidden
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  // Test 3: User has the authorized role
  it("allows request through if user has authorized role", () => {
    const adminUser: AuthUserPayload = { id: "2", email: "a@gsu.edu", role: "admin" };
    const { req, res, next } = createMockReqRes(undefined, adminUser);

    const middleware = requireRole(["admin"]);

    middleware(req, res, next);

    // Access granted: next() is called
    expect(next).toHaveBeenCalled();
  });
});
