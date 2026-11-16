import { beforeEach, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";
import { generateToken } from "../middleware/auth.middleware";
import { resetStudents } from "../data/students";

const student = generateToken({ id: "stu-1", email: "student@gsu.edu", role: "student" });
const otherStudent = generateToken({ id: "stu-2", email: "other@gsu.edu", role: "student" });
const advisor = generateToken({ id: "adv-1", email: "advisor@gsu.edu", role: "advisor" });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Recommendations API", () => {
  beforeEach(() => resetStudents());

  it("requires a token", async () => {
    const res = await request(app).get("/api/recommendations/me");
    expect(res.status).toBe(401);
  });

  it("returns courses, post-grad options, and experiences for the logged-in student", async () => {
    const res = await request(app).get("/api/recommendations/me?term=SPRING-2027").set(auth(student));

    expect(res.status).toBe(200);
    expect(res.body.term.label).toBe("Spring 2027");
    expect(res.body.courses[0]).toMatchObject({ code: "CSC 4520", fitsLoad: true });
    expect(res.body.courses[0].reasons.length).toBeGreaterThan(0);
    expect(res.body.postGrad.length).toBeGreaterThan(0);
    expect(res.body.experiences.length).toBeGreaterThan(0);
    expect(res.body.preferences).toMatchObject({ goal: "grad-school", maxCreditsPerTerm: 15 });
  });

  it("rejects a badly formatted term", async () => {
    const res = await request(app).get("/api/recommendations/me?term=someday").set(auth(student));
    expect(res.status).toBe(400);
  });

  it("stops students from reading another student's recommendations", async () => {
    const res = await request(app).get("/api/recommendations/stu-1").set(auth(otherStudent));
    expect(res.status).toBe(403);
  });

  it("lets an advisor view but not change a student's recommendations", async () => {
    expect((await request(app).get("/api/recommendations/stu-1").set(auth(advisor))).status).toBe(200);
    const res = await request(app)
      .post("/api/recommendations/stu-1/dismissals")
      .set(auth(advisor))
      .send({ kind: "course", id: "CSC 4520" });
    expect(res.status).toBe(403);
  });

  it("dismisses and restores a course", async () => {
    const dismissed = await request(app)
      .post("/api/recommendations/me/dismissals?term=SPRING-2027")
      .set(auth(student))
      .send({ kind: "course", id: "CSC 4520" });

    expect(dismissed.status).toBe(201);
    expect(dismissed.body.courses.map((c: { code: string }) => c.code)).not.toContain("CSC 4520");
    expect(dismissed.body.dismissed.courses).toEqual([{ id: "CSC 4520", title: "CSC 4520 Design and Analysis of Algorithms" }]);

    const restored = await request(app)
      .delete(`/api/recommendations/me/dismissals/course/${encodeURIComponent("CSC 4520")}?term=SPRING-2027`)
      .set(auth(student));
    expect(restored.status).toBe(200);
    expect(restored.body.courses[0].code).toBe("CSC 4520");
  });

  it("rejects dismissing something that doesn't exist", async () => {
    const res = await request(app)
      .post("/api/recommendations/me/dismissals")
      .set(auth(student))
      .send({ kind: "course", id: "NOPE 1000" });
    expect(res.status).toBe(400);
  });

  it("updates goal and interests and re-ranks", async () => {
    const res = await request(app)
      .patch("/api/recommendations/me/preferences")
      .set(auth(student))
      .send({ goal: "industry", interests: ["security"] });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toMatchObject({ goal: "industry", interests: ["security"] });
    expect(res.body.postGrad[0].reasons).toContain("Fits your goal: a job in industry");
  });

  it("validates preferences", async () => {
    const badGoal = await request(app).patch("/api/recommendations/me/preferences").set(auth(student)).send({ goal: "astronaut" });
    const badInterest = await request(app).patch("/api/recommendations/me/preferences").set(auth(student)).send({ interests: ["cooking"] });
    expect(badGoal.status).toBe(400);
    expect(badInterest.status).toBe(400);
  });
});
