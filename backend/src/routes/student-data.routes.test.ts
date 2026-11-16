import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";
import { createDemoStudent, createStudent } from "../test/helpers";

const codes = (body: { courses: { code: string }[] }) => body.courses.map((c) => c.code);

describe("Plans API", () => {
  it("returns the saved plan with terms", async () => {
    const student = await createDemoStudent();
    const res = await request(app).get("/api/plans/me").set(student.auth);
    expect(res.status).toBe(200);
    expect(res.body.courses.map((c: { code: string; term: { label: string } }) => `${c.code}:${c.term.label}`)).toEqual([
      "CSC 4350:Spring 2027",
      "CSC 4520:Spring 2027",
      "CSC 4351:Fall 2027",
    ]);
  });

  it("adds a course to next term by default and keeps it", async () => {
    const student = await createDemoStudent();
    const added = await request(app).post("/api/plans/me/courses").set(student.auth).send({ code: "CSC 4330" });
    expect(added.status).toBe(201);

    const later = await request(app).get("/api/plans/me").set(student.auth);
    expect(codes(later.body)).toContain("CSC 4330");
  });

  it("refuses a course whose prerequisites aren't met and says what's missing", async () => {
    const student = await createDemoStudent();
    const res = await request(app).post("/api/plans/me/courses").set(student.auth).send({ code: "CSC 4810", term: "SPRING-2027" });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ reason: "prerequisites", missing: [["CSC 4520"]] });
    expect(res.body.error).toContain("CSC 4520");
  });

  it("refuses duplicates, completed courses, past terms, and unknown courses", async () => {
    const student = await createDemoStudent();
    const post = (body: object) => request(app).post("/api/plans/me/courses").set(student.auth).send(body);
    expect((await post({ code: "CSC 4520" })).status).toBe(409);
    expect((await post({ code: "CSC 2720" })).body.reason).toBe("already-taken");
    expect((await post({ code: "CSC 4330", term: "FALL-2020" })).status).toBe(400);
    expect((await post({ code: "NOPE 1000" })).status).toBe(404);
  });

  it("moves a course to another term and checks the move", async () => {
    const student = await createDemoStudent();
    await request(app).post("/api/plans/me/courses").set(student.auth).send({ code: "CSC 4810", term: "FALL-2027" });

    const tooEarly = await request(app).patch(`/api/plans/me/courses/${encodeURIComponent("CSC 4810")}`).set(student.auth).send({ term: "SPRING-2027" });
    expect(tooEarly.status).toBe(409);

    const moved = await request(app).patch(`/api/plans/me/courses/${encodeURIComponent("CSC 4810")}`).set(student.auth).send({ term: "SPRING-2028" });
    expect(moved.status).toBe(200);
    expect(moved.body.courses.find((c: { code: string }) => c.code === "CSC 4810").term.label).toBe("Spring 2028");
  });

  it("removes a course and flags planned courses that depended on it", async () => {
    const student = await createDemoStudent();
    const res = await request(app).delete(`/api/plans/me/courses/${encodeURIComponent("CSC 4350")}`).set(student.auth);
    expect(res.status).toBe(200);
    expect(res.body.courses.find((c: { code: string }) => c.code === "CSC 4351").missing).toEqual([["CSC 4350"]]);
  });

  it("keeps each student's plan separate", async () => {
    const a = await createStudent();
    const b = await createStudent();
    await request(app).post("/api/plans/me/courses").set(a.auth).send({ code: "CSC 1301" });
    const res = await request(app).get("/api/plans/me").set(b.auth);
    expect(res.body.courses).toEqual([]);
  });
});

describe("Progress API", () => {
  it("returns credits, requirement progress, expected graduation, and the timeline", async () => {
    const student = await createDemoStudent();
    const res = await request(app).get("/api/progress/me").set(student.auth);

    expect(res.status).toBe(200);
    expect(res.body.credits).toMatchObject({ earned: 95, inProgress: 9, required: 120 });
    expect(res.body.percent).toBe(79);
    expect(res.body.categories).toHaveLength(5);
    expect(res.body.expectedGraduation.label).toBeTruthy();
    const statuses = new Set(res.body.timeline.flatMap((t: { courses: { status: string }[] }) => t.courses.map((c) => c.status)));
    expect(statuses).toEqual(new Set(["completed", "in-progress", "planned", "recommended"]));
  });

  it("updates when the plan or record changes", async () => {
    const student = await createDemoStudent();
    const before = await request(app).get("/api/progress/me").set(student.auth);

    await request(app)
      .put(`/api/records/me/courses/${encodeURIComponent("CSC 4520")}`)
      .set(student.auth)
      .send({ status: "completed", grade: "A", term: "SUMMER-2026" });

    const after = await request(app).get("/api/progress/me").set(student.auth);
    expect(after.body.credits.earned).toBe(before.body.credits.earned + 3);
    // Recording a planned course takes it out of the plan
    const plan = await request(app).get("/api/plans/me").set(student.auth);
    expect(codes(plan.body)).not.toContain("CSC 4520");
  });

  it("saves the target graduation term and credit limit", async () => {
    const student = await createDemoStudent();
    const res = await request(app)
      .patch("/api/progress/me/settings")
      .set(student.auth)
      .send({ targetTerm: "SPRING-2027", maxCreditsPerTerm: 12 });
    expect(res.status).toBe(200);
    expect(res.body.targetGraduation.label).toBe("Spring 2027");
    expect(res.body.onTrack).toBe(false);
    expect(res.body.maxCreditsPerTerm).toBe(12);
  });

  it("serves the legacy /api/student/progress summary from real data", async () => {
    const student = await createDemoStudent();
    const res = await request(app).get("/api/student/progress").set(student.auth);
    expect(res.body.progressPercentage).toBe(79);
  });
});

describe("Records API", () => {
  it("lists, updates, and deletes record entries", async () => {
    const student = await createStudent();
    const put = await request(app)
      .put(`/api/records/me/courses/${encodeURIComponent("CSC 1301")}`)
      .set(student.auth)
      .send({ status: "in-progress", term: "FALL-2026" });
    expect(put.status).toBe(200);
    expect(put.body.records).toEqual([
      { code: "CSC 1301", name: "Principles of Computer Science I", credits: 4, status: "in-progress", term: { season: "FALL", year: 2026, label: "Fall 2026" } },
    ]);

    const del = await request(app).delete(`/api/records/me/courses/${encodeURIComponent("CSC 1301")}`).set(student.auth);
    expect(del.body.records).toEqual([]);
  });
});

describe("Saved opportunities API", () => {
  it("saves, tracks, and removes an opportunity", async () => {
    const student = await createDemoStudent();
    const saved = await request(app).put("/api/opportunities/me/saved/pg-ms-cs").set(student.auth).send({});
    expect(saved.body.saved).toMatchObject([{ id: "pg-ms-cs", status: "saved" }]);

    const applied = await request(app).put("/api/opportunities/me/saved/pg-ms-cs").set(student.auth).send({ status: "applied", notes: "Sent Jan 5" });
    expect(applied.body.saved).toMatchObject([{ id: "pg-ms-cs", status: "applied", notes: "Sent Jan 5" }]);

    const recs = await request(app).get("/api/recommendations/me").set(student.auth);
    expect(recs.body.saved).toEqual(["pg-ms-cs"]);

    const removed = await request(app).delete("/api/opportunities/me/saved/pg-ms-cs").set(student.auth);
    expect(removed.body.saved).toEqual([]);
  });

  it("rejects unknown opportunities", async () => {
    const student = await createStudent();
    const res = await request(app).put("/api/opportunities/me/saved/nope").set(student.auth).send({});
    expect(res.status).toBe(404);
  });
});
