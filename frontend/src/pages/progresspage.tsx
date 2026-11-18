import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/navbar";

const USER_KEY = "sync_user";

type SessionUser = { name: string; email: string };

type Requirement = {
  category: string;
  earned: number;
  required: number;
  courses: { code: string; name: string; credits: number; done: boolean }[];
};

/* Mock degree‑audit data */
const requirements: Requirement[] = [
  {
    category: "Core Computer Science",
    earned: 33,
    required: 42,
    courses: [
      { code: "CSC 1301", name: "Intro to Computer Science", credits: 3, done: true },
      { code: "CSC 1302", name: "Computer Science II", credits: 3, done: true },
      { code: "CSC 2310", name: "Data Structures", credits: 3, done: true },
      { code: "CSC 3210", name: "Computer Organization", credits: 3, done: true },
      { code: "CSC 3310", name: "Design & Analysis of Algorithms", credits: 3, done: true },
      { code: "CSC 3410", name: "Systems Programming", credits: 3, done: true },
      { code: "CSC 4350", name: "Software Engineering", credits: 3, done: true },
      { code: "CSC 4330", name: "Programming Languages", credits: 3, done: true },
      { code: "CSC 4730", name: "Operating Systems", credits: 3, done: true },
      { code: "CSC 4810", name: "Computer Networks", credits: 3, done: true },
      { code: "CSC 4510", name: "Theory of Computation", credits: 3, done: true },
      { code: "CSC 4720", name: "Database Systems", credits: 3, done: false },
      { code: "CSC 4910", name: "Technical Elective II", credits: 3, done: false },
      { code: "CSC 4930", name: "Technical Elective III", credits: 3, done: false },
    ],
  },
  {
    category: "Mathematics",
    earned: 10,
    required: 16,
    courses: [
      { code: "MATH 1113", name: "Pre-Calculus", credits: 3, done: true },
      { code: "MATH 2211", name: "Calculus I", credits: 4, done: true },
      { code: "MATH 2212", name: "Calculus II", credits: 4, done: false },
      { code: "MATH 3670", name: "Probability & Statistics", credits: 3, done: true },
      { code: "MATH 2420", name: "Discrete Math", credits: 3, done: false },
    ],
  },
  {
    category: "General Education",
    earned: 15,
    required: 18,
    courses: [
      { code: "ENGL 1101", name: "English Composition I", credits: 3, done: true },
      { code: "ENGL 1102", name: "English Composition II", credits: 3, done: true },
      { code: "ENGL 2130", name: "American Literature", credits: 3, done: true },
      { code: "HIST 2110", name: "Survey of U.S. History", credits: 3, done: true },
      { code: "POLS 1101", name: "American Government", credits: 3, done: true },
      { code: "CSC 1010", name: "Computers and Society", credits: 3, done: false },
    ],
  },
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

export default function ProgressPage() {
  const [user] = useState<SessionUser | null>(loadUser);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Progress · Sync";
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const totalEarned = requirements.reduce((s, r) => s + r.earned, 0);
  const totalRequired = requirements.reduce((s, r) => s + r.required, 0);
  const overallPercent = Math.round((totalEarned / totalRequired) * 100);

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <h1 className="mb-1 text-lg font-bold">Degree Progress</h1>
        <p className="mb-5 text-xs text-gray-500">
          {totalEarned} of {totalRequired} credit hours completed ({overallPercent}%)
        </p>

        {/* Overall progress bar */}
        <div
          role="progressbar"
          aria-label="Overall degree progress"
          aria-valuenow={overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mb-6 h-2.5 overflow-hidden rounded-full bg-gray-200"
        >
          <div className="h-full bg-brand transition-all" style={{ width: `${overallPercent}%` }} />
        </div>

        {/* Category breakdown */}
        <div className="space-y-3">
          {requirements.map((req, idx) => {
            const pct = Math.round((req.earned / req.required) * 100);
            const isOpen = openIdx === idx;
            return (
              <div key={req.category} className="rounded-lg border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <span className="text-sm font-semibold">{req.category}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {req.earned}/{req.required} credits · {pct}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* Mini progress bar */}
                <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-sm bg-gray-200">
                  <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                </div>

                {isOpen && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {req.courses.map((c) => (
                      <li key={c.code} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs">
                          <span className="font-medium text-gray-900">{c.code}</span>
                          <span className="ml-1.5 text-gray-500">{c.name}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            c.done
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {c.done ? "Done" : "Remaining"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
