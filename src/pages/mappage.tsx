import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/navbar";
import { catalog, type CatalogCourse, type CourseStatus } from "../lib/mockdata";
import { availability, missingPrereqs, prereqChain, prereqsOf, unlocks, type Availability } from "../lib/prerequisites";
import { loadUser } from "../lib/session";

/* TODO: replace the sample catalog in ../lib/mockdata with GET /api/courses and
   GET /api/courses/:id/prerequisites */

type FilterKey = "all" | Availability;

const filterOrder: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All courses" },
  { key: "ready", label: "Ready to take" },
  { key: "locked", label: "Locked" },
  { key: "in-progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

const stateLabel: Record<Availability, string> = {
  completed: "Done",
  "in-progress": "In Progress",
  ready: "Ready to take",
  locked: "Locked",
};

const stateStyle: Record<Availability, string> = {
  completed: "bg-green-100 text-green-700",
  "in-progress": "bg-brand/10 text-brand",
  ready: "bg-amber-100 text-amber-700",
  locked: "bg-gray-100 text-gray-600",
};

/* A small chip for one prerequisite. The mark and the hidden text mean it does not rely on color alone. */
const chipStyle: Record<CourseStatus, { cls: string; mark: string; text: string }> = {
  completed: { cls: "bg-green-50 text-green-700", mark: "✓", text: "completed" },
  "in-progress": { cls: "bg-brand/10 text-brand", mark: "…", text: "in progress" },
  "not-taken": { cls: "bg-gray-100 text-gray-600", mark: "○", text: "not taken yet" },
};

function PrereqChip({ course }: { course: CatalogCourse }) {
  const s = chipStyle[course.status];
  return (
    <span className={`inline-block rounded px-2 py-1 text-[11px] font-medium ${s.cls}`}>
      <span aria-hidden="true">{s.mark} </span>
      {course.code}
      <span className="sr-only"> ({s.text})</span>
    </span>
  );
}

function CourseCard({
  course,
  open,
  onToggle,
}: {
  course: CatalogCourse;
  open: boolean;
  onToggle: () => void;
}) {
  const state = availability(course);
  const direct = prereqsOf(course);
  const missing = missingPrereqs(course);
  const chain = prereqChain(course.code);
  const next = unlocks(course.code);
  const panelId = `panel-${course.code.replace(/\s+/g, "-")}`;

  return (
    <li className="rounded-md border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">{course.code}</span>
          <span className="block text-xs text-gray-500">{course.name}</span>
          {state === "locked" && (
            <span className="mt-1 block text-[11px] text-gray-500">
              Needs {missing.map((m) => m.code).join(", ")}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${stateStyle[state]}`}>
            {stateLabel[state]}
          </span>
          <span className="text-[11px] text-gray-400">{course.credits} cr</span>
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-gray-100 px-4 py-3 text-xs">
          <p className="mb-1.5 text-[11px] text-gray-500">Requires</p>
          {direct.length === 0 ? (
            <p className="text-gray-500">No prerequisites.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {direct.map((p) => (
                <li key={p.code}>
                  <PrereqChip course={p} />
                </li>
              ))}
            </ul>
          )}

          {/* The whole path, in the order the courses would be taken */}
          {chain.length > direct.length && (
            <>
              <p className="mb-1.5 mt-3 text-[11px] text-gray-500">Full path, in order</p>
              <ol className="flex flex-wrap items-center gap-1.5">
                {chain.map((p) => (
                  <li key={p.code} className="flex items-center gap-1.5">
                    <PrereqChip course={p} />
                    <span aria-hidden="true" className="text-gray-300">
                      →
                    </span>
                  </li>
                ))}
                <li className="rounded bg-gray-800 px-2 py-1 text-[11px] font-medium text-white">{course.code}</li>
              </ol>
            </>
          )}

          <p className="mb-1.5 mt-3 text-[11px] text-gray-500">Unlocks</p>
          {next.length === 0 ? (
            <p className="text-gray-500">Nothing else depends on this course.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {next.map((n) => (
                <li key={n.code} className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                  {n.code}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function MapPage() {
  const [user] = useState(loadUser);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Prerequisite Map · Sync";
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const counts: Record<FilterKey, number> = {
    all: catalog.length,
    completed: 0,
    "in-progress": 0,
    ready: 0,
    locked: 0,
  };
  for (const course of catalog) counts[availability(course)] += 1;

  /* Courses the student can act on come first, finished ones last */
  const order: Record<Availability, number> = { ready: 0, locked: 1, "in-progress": 2, completed: 3 };
  const visible = catalog
    .filter((c) => filter === "all" || availability(c) === filter)
    .sort((a, b) => order[availability(a)] - order[availability(b)] || a.code.localeCompare(b.code));

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold">Prerequisite Map</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            See what each course needs, what it unlocks, and which courses you can take now.
          </p>
        </div>

        <div role="group" aria-label="Filter courses" className="mb-4 flex flex-wrap items-center gap-2">
          {filterOrder.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={`min-h-9 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-500"
                }`}
              >
                {label} ({counts[key]})
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
            <p className="text-sm font-medium text-gray-500">No courses match this filter.</p>
          </div>
        ) : (
          <ul aria-label="Courses" className="grid items-start gap-3 md:grid-cols-2">
            {visible.map((course) => (
              <CourseCard
                key={course.code}
                course={course}
                open={openCode === course.code}
                onToggle={() => setOpenCode(openCode === course.code ? null : course.code)}
              />
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs">
          <Link to="/progress" className="text-brand hover:underline">
            Back to degree progress
          </Link>
        </p>
      </main>
    </>
  );
}
