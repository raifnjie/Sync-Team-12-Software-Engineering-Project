import { useState } from "react";
import Navbar from "../components/navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseStatus = "completed" | "in-progress" | "planned" | "recommended";
type SemesterStatus = "completed" | "current" | "upcoming";

// Course Type
type Course = {
  code: string;
  name: string;
  credits: number;
  status: CourseStatus;
};

// Semester Type
type Semester = {
  id: string;
  label: string;
  status: SemesterStatus;
  totalCredits: number;
  courses: Course[];
};

// ─── Mock data ────────────────────────────────────────────────────────────────

// Semester Mock Data
const semesters: Semester[] = [
  {
    id: "fall-2023",
    label: "Fall 2023",
    status: "completed",
    totalCredits: 15,
    courses: [
      { code: "CSC 1301", name: "Introduction to Computer Science", credits: 3, status: "completed" },
      { code: "MATH 1113", name: "Pre-Calculus", credits: 3, status: "completed" },
      { code: "ENGL 1101", name: "English Composition I", credits: 3, status: "completed" },
      { code: "HIST 2110", name: "Survey of U.S. History", credits: 3, status: "completed" },
      { code: "CSC 1010", name: "Computers and Society", credits: 3, status: "completed" },
    ],
  },
  {
    id: "spring-2024",
    label: "Spring 2024",
    status: "completed",
    totalCredits: 16,
    courses: [
      { code: "CSC 1302", name: "Computer Science II", credits: 3, status: "completed" },
      { code: "MATH 2211", name: "Calculus of One Variable I", credits: 4, status: "completed" },
      { code: "ENGL 1102", name: "English Composition II", credits: 3, status: "completed" },
      { code: "CSC 2010", name: "Discrete Structures", credits: 3, status: "completed" },
      { code: "POLS 1101", name: "American Government", credits: 3, status: "completed" },
    ],
  },
  {
    id: "fall-2024",
    label: "Fall 2024",
    status: "completed",
    totalCredits: 16,
    courses: [
      { code: "CSC 2310", name: "Data Structures", credits: 3, status: "completed" },
      { code: "MATH 2212", name: "Calculus of One Variable II", credits: 4, status: "completed" },
      { code: "CSC 2610", name: "Digital Logic", credits: 3, status: "completed" },
      { code: "CSC 3210", name: "Computer Organization", credits: 3, status: "completed" },
      { code: "ENGL 2130", name: "American Literature", credits: 3, status: "completed" },
    ],
  },
  {
    id: "spring-2025",
    label: "Spring 2025",
    status: "completed",
    totalCredits: 15,
    courses: [
      { code: "CSC 3310", name: "Design and Analysis of Algorithms", credits: 3, status: "completed" },
      { code: "CSC 3410", name: "Systems Programming", credits: 3, status: "completed" },
      { code: "MATH 3670", name: "Probability & Statistics", credits: 3, status: "completed" },
      { code: "CSC 4720", name: "Database Systems", credits: 3, status: "completed" },
      { code: "CSC 4510", name: "Theory of Computation", credits: 3, status: "completed" },
    ],
  },
  {
    id: "fall-2025",
    label: "Fall 2025",
    status: "completed",
    totalCredits: 15,
    courses: [
      { code: "CSC 4350", name: "Software Engineering", credits: 3, status: "completed" },
      { code: "CSC 4330", name: "Programming Languages", credits: 3, status: "completed" },
      { code: "CSC 4730", name: "Operating Systems", credits: 3, status: "completed" },
      { code: "CSC 4810", name: "Computer Networks", credits: 3, status: "completed" },
      { code: "CSC 4900", name: "Technical Elective I", credits: 3, status: "completed" },
    ],
  },
  {
    id: "spring-2026",
    label: "Spring 2026",
    status: "current",
    totalCredits: 12,
    courses: [
      { code: "CSC 4910", name: "Technical Elective II", credits: 3, status: "in-progress" },
      { code: "CSC 3320", name: "Systems Programming", credits: 3, status: "in-progress" },
      { code: "MATH 2420", name: "Discrete Math", credits: 3, status: "in-progress" },
      { code: "CSC 4920", name: "Senior Seminar", credits: 3, status: "in-progress" },
    ],
  },
  {
    id: "fall-2026",
    label: "Fall 2026",
    status: "upcoming",
    totalCredits: 12,
    courses: [
      { code: "MATH 3350", name: "Software Engineering Math", credits: 3, status: "planned" },
      { code: "MATH 3020", name: "Applied Probability & Stats for CS", credits: 3, status: "planned" },
      { code: "CSC 4930", name: "Technical Elective III", credits: 3, status: "planned" },
      { code: "CSC 4140", name: "Artificial Intelligence", credits: 3, status: "recommended" },
    ],
  },
  {
    id: "spring-2027",
    label: "Spring 2027",
    status: "upcoming",
    totalCredits: 9,
    courses: [
      { code: "CSC 4950", name: "Senior Capstone I", credits: 3, status: "planned" },
      { code: "CSC 4960", name: "Senior Capstone II", credits: 3, status: "recommended" },
      { code: "CSC 4970", name: "Technical Elective IV", credits: 3, status: "recommended" },
    ],
  },
];

const TOTAL_CREDITS_REQUIRED = 120;
const CREDITS_EARNED = 100;

// ─── Filter definitions ───────────────────────────────────────────────────────

// Each filter tag maps to a display label, visual style, and a predicate
// that decides which semesters to show.
type FilterKey = "default" | "done" | "in-progress" | "planned" | "recommended" | "current-semester" | "completed-semester";

type FilterDef = {
  label: string;
  activeCls: string;   // button style when selected
  inactiveCls: string; // button style when not selected
  // returns the semesters to display (may also narrow courses inside each semester)
  apply: (all: Semester[]) => Semester[];
};

const filters: Record<FilterKey, FilterDef> = {
  default: {
    label: "All upcoming",
    activeCls: "bg-gray-800 text-white border-gray-800",
    inactiveCls: "bg-white text-gray-600 border-gray-300 hover:border-gray-500",
    apply: (all) => all.filter((s) => s.status === "current" || s.status === "upcoming"),
  },
  done: {
    label: "Done",
    activeCls: "bg-green-600 text-white border-green-600",
    inactiveCls: "bg-white text-green-700 border-green-300 hover:border-green-500",
    // show completed semesters, narrowed to only completed courses
    apply: (all) =>
      all
        .filter((s) => s.status === "completed")
        .map((s) => ({ ...s, courses: s.courses.filter((c) => c.status === "completed") })),
  },
  "in-progress": {
    label: "In Progress",
    activeCls: "bg-brand text-white border-brand",
    inactiveCls: "bg-white text-brand border-brand/30 hover:border-brand",
    apply: (all) =>
      all
        .filter((s) => s.courses.some((c) => c.status === "in-progress"))
        .map((s) => ({ ...s, courses: s.courses.filter((c) => c.status === "in-progress") })),
  },
  planned: {
    label: "Planned",
    activeCls: "bg-gray-500 text-white border-gray-500",
    inactiveCls: "bg-white text-gray-600 border-gray-300 hover:border-gray-500",
    apply: (all) =>
      all
        .filter((s) => s.courses.some((c) => c.status === "planned"))
        .map((s) => ({ ...s, courses: s.courses.filter((c) => c.status === "planned") })),
  },
  recommended: {
    label: "Recommended",
    activeCls: "bg-amber-500 text-white border-amber-500",
    inactiveCls: "bg-white text-amber-700 border-amber-300 hover:border-amber-500",
    apply: (all) =>
      all
        .filter((s) => s.courses.some((c) => c.status === "recommended"))
        .map((s) => ({ ...s, courses: s.courses.filter((c) => c.status === "recommended") })),
  },
  "current-semester": {
    label: "Current semester",
    activeCls: "bg-brand text-white border-brand",
    inactiveCls: "bg-white text-brand border-brand/40 hover:border-brand",
    apply: (all) => all.filter((s) => s.status === "current"),
  },
  "completed-semester": {
    label: "Completed semester",
    activeCls: "bg-green-600 text-white border-green-600",
    inactiveCls: "bg-white text-green-700 border-green-300 hover:border-green-500",
    apply: (all) => all.filter((s) => s.status === "completed"),
  },
};

// The order they appear in the filter bar
const filterOrder: FilterKey[] = [
  "default",
  "done",
  "in-progress",
  "planned",
  "recommended",
];

// ─── Course pill ──────────────────────────────────────────────────────────────

const pillStyle: Record<CourseStatus, string> = {
  completed:    "bg-green-100 text-green-700",
  "in-progress":"bg-brand/10 text-brand",
  planned:      "bg-gray-100 text-gray-600",
  recommended:  "bg-amber-100 text-amber-700",
};

const pillLabel: Record<CourseStatus, string> = {
  completed:    "Done",
  "in-progress":"In Progress",
  planned:      "Planned",
  recommended:  "Recommended",
};

function CoursePill({ status }: { status: CourseStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${pillStyle[status]}`}>
      {pillLabel[status]}
    </span>
  );
}

// ─── Semester card ────────────────────────────────────────────────────────────

function SemesterCard({ semester }: { semester: Semester }) {
  const borderColor =
    semester.status === "current"   ? "border-brand"
    : semester.status === "completed" ? "border-green-400"
    : "border-gray-200";

  const headerBg =
    semester.status === "current"   ? "bg-brand text-white"
    : semester.status === "completed" ? "bg-green-50 text-green-800"
    : "bg-gray-50 text-gray-700";

  const badge =
    semester.status === "current"
      ? { text: "Current", cls: "bg-white/20 text-white" }
      : semester.status === "completed"
      ? { text: "Completed", cls: "bg-green-200 text-green-800" }
      : null;

  return (
    <div className={`overflow-hidden rounded-lg border-2 ${borderColor} bg-white shadow-sm`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${headerBg}`}>
        <div>
          <span className="text-sm font-bold">{semester.label}</span>
          <span className="ml-2 text-xs opacity-75">{semester.totalCredits} credits</span>
        </div>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>

      <ul className="divide-y divide-gray-100">
        {semester.courses.map((course) => (
          <li key={course.code} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-900">{course.code}</span>
              <span className="ml-1.5 truncate text-xs text-gray-500">{course.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-gray-400">{course.credits} cr</span>
              <CoursePill status={course.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
      <p className="text-sm font-medium text-gray-500">No semesters match "{label}"</p>
      <p className="mt-1 text-xs text-gray-400">Try a different filter above.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("default");

  const creditsPercent = Math.round((CREDITS_EARNED / TOTAL_CREDITS_REQUIRED) * 100);
  const completedCount = semesters.filter((s) => s.status === "completed").length;
  const remainingCount = semesters.filter((s) => s.status === "upcoming").length;

  const visibleSemesters = filters[activeFilter].apply(semesters);

  // Split into two columns
  const left  = visibleSemesters.filter((_, i) => i % 2 === 0);
  const right = visibleSemesters.filter((_, i) => i % 2 === 1);

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        {/* ── Page heading ── */}
        <div className="mb-5">
          <h1 className="text-lg font-bold">Degree Timeline</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Mike's semester-by-semester plan to graduation
          </p>
        </div>

        {/* ── Summary cards ── */}
        <section aria-label="Graduation summary" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1 text-[11px] text-gray-500">Expected graduation</p>
            <p className="text-xl font-bold">Spring 2027</p>
            <p className="mt-0.5 text-xs font-medium text-green-600">On track ✓</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1 text-[11px] text-gray-500">Credit hours</p>
            <p className="text-xl font-bold">
              {CREDITS_EARNED}
              <span className="text-sm font-normal text-gray-400"> / {TOTAL_CREDITS_REQUIRED}</span>
            </p>
            <div
              role="progressbar"
              aria-valuenow={creditsPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-1.5 overflow-hidden rounded-sm bg-gray-200"
            >
              <div className="h-full bg-brand transition-all" style={{ width: `${creditsPercent}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">{creditsPercent}% complete</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1 text-[11px] text-gray-500">Semesters completed</p>
            <p className="text-xl font-bold">{completedCount}</p>
            <p className="mt-0.5 text-xs text-gray-500">of {semesters.length} total</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1 text-[11px] text-gray-500">Semesters remaining</p>
            <p className="text-xl font-bold">{remainingCount + 1}</p>
            <p className="mt-0.5 text-xs text-gray-500">including current</p>
          </div>
        </section>

        {/* ── Filter bar ── */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Show:</span>
          {filterOrder.map((key) => {
            const f = filters[key];
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? f.activeCls : f.inactiveCls
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Section heading ── */}
        <p className="mb-3 text-xs text-gray-400 uppercase tracking-wide font-semibold">
          {filters[activeFilter].label}
          <span className="ml-2 normal-case font-normal">
            — {visibleSemesters.length} semester{visibleSemesters.length !== 1 ? "s" : ""}
          </span>
        </p>

        {/* ── Semester grid or empty state ── */}
        {visibleSemesters.length === 0 ? (
          <EmptyState label={filters[activeFilter].label} />
        ) : (
          <section aria-label="Semester list">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                {left.map((sem) => <SemesterCard key={sem.id} semester={sem} />)}
              </div>
              <div className="flex flex-col gap-4 md:mt-8">
                {right.map((sem) => <SemesterCard key={sem.id} semester={sem} />)}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
