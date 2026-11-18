import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/navbar";

const USER_KEY = "sync_user";
const PLAN_KEY = "sync_plan";

type SessionUser = { name: string; email: string };

type PlanCourse = { code: string; name: string; credits: number };

/* Full catalog so we can look up names for codes stored in localStorage */
const catalog: PlanCourse[] = [
  { code: "CSC 3320", name: "Systems Programming", credits: 3 },
  { code: "MATH 2420", name: "Discrete Math", credits: 3 },
  { code: "MATH 3350", name: "Software Engineering Math", credits: 3 },
  { code: "MATH 3020", name: "Applied Probability & Stats for CS", credits: 3 },
  { code: "CSC 4140", name: "Artificial Intelligence", credits: 3 },
  { code: "CSC 4910", name: "Technical Elective II", credits: 3 },
  { code: "CSC 4930", name: "Technical Elective III", credits: 3 },
  { code: "CSC 4950", name: "Senior Capstone I", credits: 3 },
  { code: "CSC 4960", name: "Senior Capstone II", credits: 3 },
];

function loadUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as SessionUser;
    return user && typeof user.name === "string" ? user : null;
  } catch {
    return null;
  }
}

function loadPlan(): string[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as unknown;
    return Array.isArray(saved) ? saved.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export default function PlanPage() {
  const [user] = useState<SessionUser | null>(loadUser);
  const [plan, setPlan] = useState<string[]>(loadPlan);

  useEffect(() => {
    document.title = "My Plan · Sync";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch {
      /* storage blocked */
    }
  }, [plan]);

  if (!user) return <Navigate to="/login" replace />;

  const plannedCourses = plan
    .map((code) => catalog.find((c) => c.code === code))
    .filter((c): c is PlanCourse => c !== undefined);

  const totalCredits = plannedCourses.reduce((sum, c) => sum + c.credits, 0);

  function removeCourse(code: string) {
    setPlan((current) => current.filter((c) => c !== code));
  }

  function clearAll() {
    setPlan([]);
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">My Plan</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {plannedCourses.length} {plannedCourses.length === 1 ? "course" : "courses"} ·{" "}
              {totalCredits} credit hours
            </p>
          </div>
          {plan.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer text-xs text-red-500 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {plannedCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Your plan is empty</p>
            <p className="mt-1 text-xs text-gray-400">
              Add courses from the{" "}
              <Link to="/dashboard" className="text-brand hover:underline">
                Dashboard
              </Link>{" "}
              or{" "}
              <Link to="/recs" className="text-brand hover:underline">
                Recommendations
              </Link>{" "}
              page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {plannedCourses.map((course) => (
              <div
                key={course.code}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div>
                  <span className="text-sm font-semibold text-gray-900">{course.code}</span>
                  <span className="ml-2 text-xs text-gray-500">{course.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">{course.credits} cr</span>
                  <button
                    type="button"
                    onClick={() => removeCourse(course.code)}
                    aria-label={`Remove ${course.code}`}
                    className="cursor-pointer text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-sm font-bold text-brand">{totalCredits} credit hours</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
