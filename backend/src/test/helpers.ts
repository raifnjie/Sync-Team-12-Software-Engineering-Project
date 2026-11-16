import request from "supertest";
import app from "../index";
import { prisma } from "../db/prisma";
import { DEMO_STUDENT } from "../data/students";

let counter = 0;

/** Registers a brand-new student through the API. Each call gets its own account. */
export async function createStudent(name = "Test Student") {
  const email = `student${Date.now()}-${++counter}@test.gsu.edu`;
  const res = await request(app).post("/api/auth/register").send({ name, email, password: "password123" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    id: res.body.user.id as string,
    email,
    token: res.body.token as string,
    auth: { Authorization: `Bearer ${res.body.token}` },
  };
}

/** A new student with a copy of the demo student's record, plan, and preferences */
export async function createDemoStudent() {
  const student = await createStudent(DEMO_STUDENT.name);
  await prisma.user.update({
    where: { id: student.id },
    data: {
      goal: "GRAD_SCHOOL",
      interests: DEMO_STUDENT.interests,
      targetSeason: DEMO_STUDENT.target.season,
      targetYear: DEMO_STUDENT.target.year,
    },
  });
  await prisma.academicRecord.createMany({
    data: DEMO_STUDENT.history.flatMap((t) =>
      t.courses.map((courseCode) => ({ userId: student.id, courseCode, status: t.status, season: t.season, year: t.year }))
    ),
  });
  await prisma.planCourse.createMany({
    data: DEMO_STUDENT.plan.map((p) => ({ userId: student.id, courseCode: p.code, season: p.season, year: p.year })),
  });
  return student;
}

/** Logs in as a seeded staff account ("advisor@gsu.edu" or "admin@gsu.edu") */
export async function loginAs(email: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return { Authorization: `Bearer ${res.body.token}` };
}
