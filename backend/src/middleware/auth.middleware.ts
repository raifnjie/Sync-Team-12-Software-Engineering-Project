import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { config } from "../config";

// Allowed user roles matching the architecture document (ARCHITECTURE.md)
export type UserRole = "student" | "advisor" | "admin";

// Data stored inside the decoded JWT token
export interface AuthUserPayload extends JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

// Extend Express's Request type so TypeScript recognizes `req.user`
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

// Secret key from centralized config
const JWT_SECRET = config.jwtSecret;

/**
 * Authentication Middleware:
 * Checks for a valid Bearer token in the "Authorization" header.
 * - If missing: returns 401 Unauthorized
 * - If invalid or expired: returns 403 Forbidden
 * - If valid: sets `req.user` with the decoded token payload and calls `next()`
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // Grab the header, e.g. "Authorization: Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // 1. Check if token was provided
  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  // 2. Verify token signature and expiration
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    // Attach decoded user info to the request for subsequent handlers
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
}

/**
 * Authorization Middleware (Role-Based Access Control):
 * Restricts route access to specific roles (e.g. only "admin" or "advisor").
 * Must be used after `authenticateToken`.
 *
 * Example: router.delete("/users/:id", authenticateToken, requireRole(["admin"]), handler)
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Ensure user is already authenticated
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    // 2. Check if user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access forbidden: requires one of the following roles: [${allowedRoles.join(", ")}]`,
      });
      return;
    }

    // 3. User is authorized, proceed to route handler
    next();
  };
}

/**
 * Helper function to create/sign a JWT token when a user registers or logs in.
 *
 * @param payload - User data to embed in the token (id, email, role)
 * @param expiresIn - Expiration time (defaults to 7 days)
 */
export function generateToken(
  payload: AuthUserPayload,
  expiresIn: SignOptions["expiresIn"] = "7d"
): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}
