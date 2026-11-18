import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";
import { createDemoStudent, createStudent, loginAs } from "../test/helpers";

describe("Recommendations API", () => {
  it("requires a token", async () => {
    const res = await request(app).get("/api/recommendations/me");
    expect(res.status).toBe(401);
  });

  it("returns courses, post-grad options, and experiences for the logged-in student", async () => {
    const student = await createDemoStudent();
    const res = await request(app).get("/api/recommendations/me?term=SPRING-2027").set(student.auth);

    expect(res.status).toBe(200);
    expect(res.body.term.label).toBe("Spring 2027");
    expect(res.body.courses[0]).toMatchObject({ code: "CSC 4520", fitsLoad: true });
    expect(res.body.courses[0].reasons.length).toBeGreaterThan(0);
    expect(res.body.postGrad.length).toBeGreaterThan(0);
    expect(res.body.experiences.length).toBeGreaterThan(0);
    expect(res.body.preferences).toMatchObject({ goal: "grad-school", maxCreditsPerTerm: 15 });
    expect(res.body.saved).toEqual([]);
  });

  it("recommends first-year courses to a brand-new student", async () => {
    const student = await createStudent();
    const res = await request(app).get("/api/recommendations/me").set(student.auth);
    expect(res.status).toBe(200);
    expect(res.body.courses.map((c: { code: string }) => c.code)).toContain("CSC 1301");
  });

  it("rejects a badly formatted term", async () => {
    const student = await createStudent();
    const res = await request(app).get("/api/recommendations/me?term=someday").set(student.auth);
    expect(res.status).toBe(400);
  });

  it("stops students from reading another student's recommendations", async () => {
    const owner = await createStudent();
    const other = await createStudent();
    const res = await request(app).get(`/api/recommendations/${owner.id}`).set(other.auth);
    expect(res.status).toBe(403);
  });

  it("lets an advisor view but not change a student's recommendations", async () => {
    const student = await createDemoStudent();
    const advisor = await loginAs("advisor@gsu.edu");

    expect((await request(app).get(`/api/recommendations/${student.id}`).set(advisor)).status).toBe(200);
    const res = await request(app)
      .post(`/api/recommendations/${student.id}/dismissals`)
      .set(advisor)
      .send({ kind: "course", id: "CSC 4520" });
    expect(res.status).toBe(403);
  });

  it("dismisses a course, keeps it dismissed on the next visit, and restores it", async () => {
    const student = await createDemoStudent();
    const dismissed = await request(app)
      .post("/api/recommendations/me/dismissals?term=SPRING-2027")
      .set(student.auth)
      .send({ kind: "course", id: "CSC 4520" });

    expect(dismissed.status).toBe(201);
    expect(dismissed.body.dismissed.courses).toEqual([{ id: "CSC 4520", title: "CSC 4520 Design and Analysis of Algorithms" }]);

    // Saved in the database, not just this response
    const later = await request(app).get("/api/recommendations/me?term=SPRING-2027").set(student.auth);
    expect(later.body.courses.map((c: { code: string }) => c.code)).not.toContain("CSC 4520");

    const restored = await request(app)
      .delete(`/api/recommendations/me/dismissals/course/${encodeURIComponent("CSC 4520")}?term=SPRING-2027`)
      .set(student.auth);
    expect(restored.status).toBe(200);
    expect(restored.body.courses[0].code).toBe("CSC 4520");
  });

  it("rejects dismissing something that doesn't exist", async () => {
    const student = await createStudent();
    const res = await request(app)
      .post("/api/recommendations/me/dismissals")
      .set(student.auth)
      .send({ kind: "course", id: "NOPE 1000" });
    expect(res.status).toBe(400);
  });

  it("saves goal and interests and re-ranks", async () => {
    const student = await createDemoStudent();
    const res = await request(app)
      .patch("/api/recommendations/me/preferences")
      .set(student.auth)
      .send({ goal: "industry", interests: ["security"] });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toMatchObject({ goal: "industry", interests: ["security"] });
    expect(res.body.postGrad[0].reasons).toContain("Fits your goal: a job in industry");

    const later = await request(app).get("/api/recommendations/me").set(student.auth);
    expect(later.body.preferences).toMatchObject({ goal: "industry", interests: ["security"] });
  });

  it("validates preferences", async () => {
    const student = await createStudent();
    const badGoal = await request(app).patch("/api/recommendations/me/preferences").set(student.auth).send({ goal: "astronaut" });
    const badInterest = await request(app).patch("/api/recommendations/me/preferences").set(student.auth).send({ interests: ["cooking"] });
    expect(badGoal.status).toBe(400);
    expect(badInterest.status).toBe(400);
  });
});
