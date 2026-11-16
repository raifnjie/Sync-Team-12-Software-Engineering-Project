import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../db/prisma";
import { generateToken } from "../middleware/auth.middleware";

const unique = () => `new${Date.now()}${Math.random().toString(36).slice(2, 6)}@gsu.edu`;

describe("Auth API", () => {
  it("registers a student, stores only a password hash, and returns a working token", async () => {
    const email = unique();
    const res = await request(app).post("/api/auth/register").send({ name: "Jordan Smith", email, password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Jordan Smith", email, role: "student" });

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row!.passwordHash).not.toContain("password123");
    expect(row!.programId).toBe("bs-cs");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.body.user.email).toBe(email);
  });

  it("rejects a duplicate email regardless of case", async () => {
    const email = unique();
    await request(app).post("/api/auth/register").send({ name: "A", email, password: "password123" });
    const res = await request(app).post("/api/auth/register").send({ name: "B", email: email.toUpperCase(), password: "password123" });
    expect(res.status).toBe(409);
  });

  it("validates sign-up input", async () => {
    const short = await request(app).post("/api/auth/register").send({ name: "A", email: unique(), password: "short" });
    const badEmail = await request(app).post("/api/auth/register").send({ name: "A", email: "nope", password: "password123" });
    expect(short.status).toBe(400);
    expect(short.body.error).toContain("at least 8");
    expect(badEmail.status).toBe(400);
  });

  it("logs in the seeded demo student and rejects a wrong password", async () => {
    const ok = await request(app).post("/api/auth/login").send({ email: "Mike.Smith@gsu.edu", password: "password123" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe("Mike Smith");

    const bad = await request(app).post("/api/auth/login").send({ email: "mike.smith@gsu.edu", password: "wrong-password" });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("Email or password is incorrect.");
  });

  it("answers forgot-password the same way for any email", async () => {
    const known = await request(app).post("/api/auth/forgot-password").send({ email: "mike.smith@gsu.edu" });
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: unique() });
    expect(known.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
  });

  it("treats a token for a deleted account as logged out", async () => {
    const token = generateToken({ id: "no-such-user", email: "ghost@gsu.edu", role: "student" });
    const res = await request(app).get("/api/progress/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
