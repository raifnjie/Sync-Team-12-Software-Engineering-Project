import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, fromDbEnum } from "../db/prisma";
import { authenticateToken, generateToken, type UserRole } from "../middleware/auth.middleware";
import { HttpError, parse } from "../http";

/**
 * Accounts and sessions (FR-1.1)
 *
 *   POST /api/auth/register          { name, email, password }  -> 201 { token, user }
 *   POST /api/auth/login             { email, password }        -> 200 { token, user }
 *   POST /api/auth/forgot-password   { email }                  -> 202
 *   GET  /api/auth/me                                           -> { user }
 *
 * Sessions are stateless JWTs (7 days). The frontend keeps the token and sends
 * it as "Authorization: Bearer <token>"; logging out just discards it.
 */
export const authRouter = Router();

const BCRYPT_ROUNDS = 10;
const DEFAULT_PROGRAM_ID = "bs-cs";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email, like you@gsu.edu." }));

const registerBody = z.object({
  name: z.string().trim().min(1, "Enter your full name.").max(100),
  email,
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

const loginBody = z.object({ email, password: z.string().min(1, "Enter your password.") });

type UserRow = { id: string; name: string; email: string; role: string };

function publicUser(user: UserRow) {
  return { id: user.id, name: user.name, email: user.email, role: fromDbEnum<UserRole>(user.role) };
}

function session(user: UserRow) {
  const pub = publicUser(user);
  return { token: generateToken({ id: pub.id, email: pub.email, role: pub.role }), user: pub };
}

authRouter.post("/auth/register", async (req, res) => {
  const body = parse(registerBody, req.body);

  if (await prisma.user.findUnique({ where: { email: body.email } })) {
    throw new HttpError(409, "An account with this email already exists. Try logging in.");
  }
  // New students start in the default program with an empty record
  const program = await prisma.degreeProgram.findUnique({ where: { id: DEFAULT_PROGRAM_ID } });

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, BCRYPT_ROUNDS),
      programId: program?.id ?? null,
      lastLoginAt: new Date(),
    },
  });
  res.status(201).json(session(user));
});

authRouter.post("/auth/login", async (req, res) => {
  const body = parse(loginBody, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });

  // Same message whether the email or the password is wrong, so emails can't be probed
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json(session(user));
});

/**
 * Always answers 202 so it can't be used to find out which emails have accounts.
 * TODO (SI.2): send a reset link once an email service is connected.
 */
authRouter.post("/auth/forgot-password", (req, res) => {
  parse(z.object({ email }), req.body);
  res.status(202).json({ message: "If an account exists for that email, a reset link is on its way." });
});

authRouter.get("/auth/me", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new HttpError(401, "Your session is no longer valid. Please log in again.");
  res.json({ user: publicUser(user) });
});
