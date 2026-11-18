import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/navbar";

const USER_KEY = "sync_user";
const PLAN_KEY = "sync_plan";

type SessionUser = { name: string; email: string };

type RecCourse = {
  code: string;
  name: string;
  credits: number;
  reason: string;
  difficulty: "Easy" | "Moderate" | "Hard";
};

/* Mock recommendation data */
const allRecs: RecCourse[] = [
  { code: "CSC 3320", name: "Systems Programming", credits: 3, reason: "Required for your major — builds on CSC 3410", difficulty: "Moderate" },
  { code: "MATH 2420", name: "Discrete Math", credits: 3, reason: "Required — strengthens algorithm analysis skills", difficulty: "Moderate" },
  { code: "MATH 3350", name: "Software Engineering Math", credits: 3, reason: "Required — covers formal methods for SE", difficulty: "Hard" },
  { code: "MATH 3020", name: "Applied Probability & Stats for CS", credits: 3, reason: "Required — supports ML and data-focused electives", difficulty: "Moderate" },
  { code: "CSC 4140", name: "Artificial Intelligence", credits: 3, reason: "Popular elective — prereqs satisfied next semester", difficulty: "Hard" },
  { code: "CSC 4910", name: "Technical Elective II", credits: 3, reason: "Needed to complete elective requirement", difficulty: "Easy" },
  { code: "CSC 4930", name: "Technical Elective III", credits: 3, reason: "Fills remaining elective slot before capstone", difficulty: "Easy" },
  { code: "CSC 4950", name: "Senior Capstone I", credits: 3, reason: "Start your capstone sequence — CSC 4350 complete", difficulty: "Hard" },
];

const diffBadge: Record<RecCourse["difficulty"], string> = {
  Easy: "bg-green-100 text-green-700",
  Moderate: "bg-amber-100 text-amber-700",
  Hard: "bg-red-100 text-red-700",
};

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

export default function RecsPage() {
  const [user] = useState<SessionUser | null>(loadUser);
  const [plan, setPlan] = useState<string[]>(loadPlan);

  useEffect(() => {
    document.title = "Recommendations · Sync";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch {
      /* storage blocked */
    }
  }, [plan]);

  if (!user) return <Navigate to="/login" replace />;

  function toggleCourse(code: string) {
    setPlan((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <h1 className="mb-1 text-lg font-bold">Recommended Courses</h1>
        <p className="mb-5 text-xs text-gray-500">
          Courses you should consider next, based on your progress and degree requirements.
        </p>

        <div className="space-y-2.5">
          {allRecs.map((rec) => {
            const inPlan = plan.includes(rec.code);
            return (
              <div
                key={rec.code}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{rec.code}</span>
                    <span className="text-xs text-gray-500">{rec.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${diffBadge[rec.difficulty]}`}
                    >
                      {rec.difficulty}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-400">{rec.reason}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[11px] text-gray-400">{rec.credits} cr</span>
                  {inPlan ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">✓ In plan</span>
                      <button
                        type="button"
                        onClick={() => toggleCourse(rec.code)}
                        className="cursor-pointer text-brand hover:underline"
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleCourse(rec.code)}
                      className="cursor-pointer rounded-full border border-brand px-3 py-1 text-xs font-medium text-brand hover:bg-brand hover:text-white transition-colors"
                    >
                      Add to plan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
          <span className="font-medium text-gray-900">{plan.length}</span>{" "}
          {plan.length === 1 ? "course" : "courses"} in your plan ·{" "}
          <span className="font-medium text-gray-900">
            {plan.reduce((s, code) => s + (allRecs.find((r) => r.code === code)?.credits ?? 0), 0)}
          </span>{" "}
          credit hours
        </div>
      </main>
    </>
  );
}
