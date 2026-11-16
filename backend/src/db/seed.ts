import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { courses, programs } from "../data/catalog";
import { opportunities } from "../data/opportunities";
import { DEMO_PASSWORD, DEMO_STAFF, DEMO_STUDENT } from "../data/students";
import { findCycle } from "../services/prerequisite.service";

/**
 * Loads the sample catalog and demo accounts. Safe to run more than once:
 * catalog rows are upserted and demo accounts are rebuilt from scratch.
 * Real users' data is never touched.
 *
 *   npm run db:seed        (runs prisma/seed.ts, which calls this)
 *
 * Demo logins (password "password123"): mike.smith@gsu.edu, advisor@gsu.edu, admin@gsu.edu
 */
const upper = (v: string) => v.toUpperCase().replace(/-/g, "_");

export async function seed(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  try {
    const cycle = findCycle(courses);
    if (cycle) throw new Error(`Sample catalog has circular prerequisites: ${cycle.join(" -> ")}`);

    await prisma.$transaction(async (tx) => {
      // ── Courses and prerequisites ──
      for (const c of courses) {
        const data = { name: c.name, credits: c.credits, termsOffered: c.termsOffered, tags: c.tags };
        await tx.course.upsert({ where: { code: c.code }, create: { code: c.code, ...data }, update: data });
      }
      await tx.prerequisiteGroup.deleteMany({ where: { courseCode: { in: courses.map((c) => c.code) } } });
      for (const c of courses) {
        for (const group of c.prerequisites) {
          await tx.prerequisiteGroup.create({
            data: {
              courseCode: c.code,
              concurrentAllowed: group.concurrentAllowed ?? false,
              options: { create: group.anyOf.map((courseCode) => ({ courseCode })) },
            },
          });
        }
      }

      // ── Degree programs and requirements ──
      for (const p of programs) {
        await tx.degreeProgram.upsert({
          where: { id: p.id },
          create: { id: p.id, name: p.name, totalCredits: p.totalCredits },
          update: { name: p.name, totalCredits: p.totalCredits },
        });
        await tx.requirementCategory.deleteMany({ where: { programId: p.id } });
        for (const [position, cat] of p.categories.entries()) {
          await tx.requirementCategory.create({
            data: {
              programId: p.id,
              key: cat.id,
              name: cat.name,
              kind: cat.kind === "all" ? "ALL_OF" : "CREDITS_FROM",
              creditsRequired: cat.creditsRequired ?? null,
              position,
              courses: { create: cat.courses.map((courseCode) => ({ courseCode })) },
            },
          });
        }
      }

      // ── Post-grad options and experiences ──
      for (const o of opportunities) {
        const data = {
          category: upper(o.category) as "POST_GRAD" | "EXPERIENCE",
          kind: upper(o.kind) as "GRAD_PROGRAM",
          title: o.title,
          organization: o.organization,
          description: o.description,
          goals: o.goals.map((g) => upper(g) as "INDUSTRY"),
          tags: o.tags,
          relatedCourses: o.relatedCourses,
          deadline: o.deadline ? new Date(`${o.deadline}T00:00:00Z`) : null,
        };
        await tx.opportunity.upsert({ where: { id: o.id }, create: { id: o.id, ...data }, update: data });
      }

      // ── Demo accounts (deleting a user cascades to all their data) ──
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await tx.user.deleteMany({ where: { email: { in: [DEMO_STUDENT.email, ...DEMO_STAFF.map((s) => s.email)] } } });

      const mike = await tx.user.create({
        data: {
          email: DEMO_STUDENT.email,
          name: DEMO_STUDENT.name,
          passwordHash,
          programId: DEMO_STUDENT.programId,
          goal: upper(DEMO_STUDENT.goal) as "GRAD_SCHOOL",
          interests: DEMO_STUDENT.interests,
          maxCreditsPerTerm: DEMO_STUDENT.maxCreditsPerTerm,
          targetSeason: DEMO_STUDENT.target.season,
          targetYear: DEMO_STUDENT.target.year,
        },
      });
      await tx.academicRecord.createMany({
        data: DEMO_STUDENT.history.flatMap((term) =>
          term.courses.map((courseCode) => ({
            userId: mike.id,
            courseCode,
            status: term.status,
            season: term.season,
            year: term.year,
          }))
        ),
      });
      await tx.planCourse.createMany({
        data: DEMO_STUDENT.plan.map((p) => ({ userId: mike.id, courseCode: p.code, season: p.season, year: p.year })),
      });
      for (const staff of DEMO_STAFF) {
        await tx.user.create({ data: { email: staff.email, name: staff.name, role: staff.role, passwordHash } });
      }
    }, { timeout: 30_000 });
  } finally {
    await prisma.$disconnect();
  }
}
