import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/navbar";

const USER_KEY = "sync_user";

type SessionUser = { name: string; email: string };

type MapCourse = {
  code: string;
  name: string;
  credits: number;
  prereqs: string[];
  status: "completed" | "in-progress" | "available" | "locked";
};

/* Mock prerequisite‑map data */
const courses: MapCourse[] = [
  { code: "CSC 1301", name: "Intro to CS", credits: 3, prereqs: [], status: "completed" },
  { code: "CSC 1302", name: "CS II", credits: 3, prereqs: ["CSC 1301"], status: "completed" },
  { code: "CSC 2310", name: "Data Structures", credits: 3, prereqs: ["CSC 1302"], status: "completed" },
  { code: "MATH 2211", name: "Calculus I", credits: 4, prereqs: ["MATH 1113"], status: "completed" },
  { code: "MATH 1113", name: "Pre-Calculus", credits: 3, prereqs: [], status: "completed" },
  { code: "MATH 2212", name: "Calculus II", credits: 4, prereqs: ["MATH 2211"], status: "completed" },
  { code: "CSC 3210", name: "Computer Organization", credits: 3, prereqs: ["CSC 1302"], status: "completed" },
  { code: "CSC 3310", name: "Algorithms", credits: 3, prereqs: ["CSC 2310", "MATH 2212"], status: "completed" },
  { code: "CSC 3410", name: "Systems Programming", credits: 3, prereqs: ["CSC 3210"], status: "completed" },
  { code: "CSC 4350", name: "Software Engineering", credits: 3, prereqs: ["CSC 3310"], status: "completed" },
  { code: "CSC 4720", name: "Database Systems", credits: 3, prereqs: ["CSC 2310"], status: "completed" },
  { code: "CSC 4730", name: "Operating Systems", credits: 3, prereqs: ["CSC 3410"], status: "completed" },
  { code: "CSC 3320", name: "Systems Programming II", credits: 3, prereqs: ["CSC 3410"], status: "in-progress" },
  { code: "MATH 2420", name: "Discrete Math", credits: 3, prereqs: ["MATH 2211"], status: "in-progress" },
  { code: "CSC 4140", name: "Artificial Intelligence", credits: 3, prereqs: ["CSC 3310", "MATH 3670"], status: "available" },
  { code: "MATH 3670", name: "Probability & Stats", credits: 3, prereqs: ["MATH 2212"], status: "completed" },
  { code: "CSC 4810", name: "Computer Networks", credits: 3, prereqs: ["CSC 3410"], status: "completed" },
  { code: "CSC 4950", name: "Senior Capstone I", credits: 3, prereqs: ["CSC 4350"], status: "locked" },
  { code: "CSC 4960", name: "Senior Capstone II", credits: 3, prereqs: ["CSC 4950"], status: "locked" },
];

const statusStyle: Record<MapCourse["status"], string> = {
  completed: "border-green-400 bg-green-50",
  "in-progress": "border-brand bg-brand/5",
  available: "border-amber-400 bg-amber-50",
  locked: "border-gray-300 bg-gray-50 opacity-60",
};

const statusLabel: Record<MapCourse["status"], string> = {
  completed: "Done",
  "in-progress": "In Progress",
  available: "Available",
  locked: "Locked",
};

const badgeStyle: Record<MapCourse["status"], string> = {
  completed: "bg-green-100 text-green-700",
  "in-progress": "bg-brand/10 text-brand",
  available: "bg-amber-100 text-amber-700",
  locked: "bg-gray-200 text-gray-500",
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

export default function MapPage() {
  const [user] = useState<SessionUser | null>(loadUser);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Prerequisite Map · Sync";
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const selectedCourse = courses.find((c) => c.code === selected);

  /* Which courses need this one as a prereq? */
  const dependents = selected
    ? courses.filter((c) => c.prereqs.includes(selected)).map((c) => c.code)
    : [];

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <h1 className="mb-1 text-lg font-bold">Prerequisite Map</h1>
        <p className="mb-5 text-xs text-gray-500">
          Click a course to see its prerequisites and what it unlocks.
        </p>

        {/* Legend */}
        <div className="mb-5 flex flex-wrap gap-3">
          {(["completed", "in-progress", "available", "locked"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className={`inline-block h-2.5 w-2.5 rounded-full border ${statusStyle[s]}`} />
              {statusLabel[s]}
            </span>
          ))}
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {courses.map((c) => {
            const isSelected = selected === c.code;
            const isPrereq = selectedCourse?.prereqs.includes(c.code);
            const isDependent = dependents.includes(c.code);
            const highlight = isSelected
              ? "ring-2 ring-brand"
              : isPrereq
              ? "ring-2 ring-green-400"
              : isDependent
              ? "ring-2 ring-amber-400"
              : "";

            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelected(isSelected ? null : c.code)}
                className={`cursor-pointer rounded-lg border-2 p-3 text-left transition ${statusStyle[c.status]} ${highlight}`}
              >
                <p className="text-xs font-bold text-gray-900">{c.code}</p>
                <p className="mt-0.5 truncate text-[11px] text-gray-500">{c.name}</p>
                <span
                  className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeStyle[c.status]}`}
                >
                  {statusLabel[c.status]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedCourse && (
          <div className="mt-5 rounded-lg border border-gray-200 bg-white px-5 py-4">
            <h2 className="text-sm font-bold">
              {selectedCourse.code} — {selectedCourse.name}
            </h2>
            <p className="mt-1 text-xs text-gray-500">{selectedCourse.credits} credits</p>

            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="mb-1 font-semibold text-gray-700">Prerequisites</p>
                {selectedCourse.prereqs.length === 0 ? (
                  <p className="text-gray-400">None</p>
                ) : (
                  <ul className="space-y-0.5">
                    {selectedCourse.prereqs.map((p) => {
                      const pc = courses.find((c) => c.code === p);
                      return (
                        <li key={p}>
                          <span className="font-medium">{p}</span>
                          {pc && (
                            <span
                              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${badgeStyle[pc.status]}`}
                            >
                              {statusLabel[pc.status]}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1 font-semibold text-gray-700">Unlocks</p>
                {dependents.length === 0 ? (
                  <p className="text-gray-400">Nothing directly</p>
                ) : (
                  <ul className="space-y-0.5">
                    {dependents.map((d) => (
                      <li key={d} className="font-medium">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
