import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/navbar";
import ProgressBar from "../components/progressbar";
import ProgressRing from "../components/progressring";
import { categories, credits, type CourseStatus } from "../lib/mockdata";
import { inProgressCredits, remainingCourses, toPercent } from "../lib/progress";
import { loadUser } from "../lib/session";

/* TODO: replace the sample data in ../lib/mockdata with the student's real data from the backend */

const statusLabel: Record<CourseStatus, string> = {
  completed: "Done",
  "in-progress": "In Progress",
  "not-taken": "Not taken",
};

const statusStyle: Record<CourseStatus, string> = {
  completed: "bg-green-100 text-green-700",
  "in-progress": "bg-brand/10 text-brand",
  "not-taken": "bg-gray-100 text-gray-600",
};

function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
      <p className="mb-1.5 text-[11px] text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function ProgressPage() {
  const [user] = useState(loadUser);

  useEffect(() => {
    document.title = "Progress · Sync";
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const remaining = credits.required - credits.earned;
  const overall = toPercent(credits.earned, credits.required);
  const takingNow = categories.reduce((sum, c) => sum + inProgressCredits(c), 0);

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold">Degree Progress</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            What you have finished, what you are taking, and what is left in each requirement.
          </p>
        </div>

        {/* The overall picture: a ring plus the key numbers */}
        <section aria-label="Overall progress" className="mb-6 grid gap-3 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2 rounded-md border border-gray-200 bg-white px-8 py-5">
            <ProgressRing value={overall} label="Overall degree progress" />
            <p className="text-xs text-gray-500">of your degree complete</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Credits earned" value={credits.earned} sub={`of ${credits.required} required`} />
            <StatCard label="Credits to go" value={remaining} sub="still needed to graduate" />
            <StatCard label="Taking now" value={takingNow} sub="credits in progress" />
            <StatCard label="Expected graduation" value="Spring 2027" sub="On track" />
          </div>
        </section>

        {/* One card per requirement category */}
        <section aria-label="Requirements">
          <h2 className="mb-2 text-sm font-bold">Requirements</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => {
              const left = category.required - category.earned;
              const complete = left <= 0;
              const taking = inProgressCredits(category);
              const courses = remainingCourses(category);

              return (
                <li key={category.id} className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-sm font-bold">{category.name}</h3>
                    <p className="text-xs text-gray-500">
                      {category.earned} / {category.required} credits
                    </p>
                  </div>

                  <ProgressBar
                    className="mt-2.5"
                    label={`${category.name} progress`}
                    value={toPercent(category.earned, category.required)}
                    inProgressValue={toPercent(taking, category.required)}
                    valueText={`${category.earned} of ${category.required} credits`}
                    tone={complete ? "green" : "brand"}
                  />

                  <p className={`mt-2 text-xs ${complete ? "font-medium text-green-700" : "text-gray-500"}`}>
                    {complete ? "Complete ✓" : `${left} ${left === 1 ? "credit" : "credits"} to go`}
                  </p>

                  {!complete && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer py-1 text-brand hover:underline">
                        What is left
                      </summary>
                      <ul className="mt-1 divide-y divide-gray-100">
                        {courses.map((course) => (
                          <li key={course.code} className="flex items-center justify-between gap-2 py-2">
                            <span className="min-w-0">
                              <span className="font-medium text-gray-900">{course.code}</span>
                              <span className="ml-1.5 text-gray-500">{course.name}</span>
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[course.status]}`}
                            >
                              {statusLabel[course.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {category.note && <p className="mt-1 text-gray-500">{category.note}</p>}
                    </details>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Key for the lighter part of each bar */}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-brand" /> Earned
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-brand/40" /> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-gray-200" /> Still needed
            </span>
          </p>
        </section>

        <p className="mt-6 text-xs">
          <Link to="/map" className="text-brand hover:underline">
            See which courses you can take next
          </Link>
        </p>
      </main>
    </>
  );
}
