import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

/* Same keys the log in page uses */
const USER_KEY = "sync_user";
const PLAN_KEY = "sync_plan";

/* set the type of values for the course code and the course name */
type Course = { code: string; name: string };
type SessionUser = { name: string; email: string };
/* date is "YYYY-MM-DD". "to" makes the item a link. */
type UpcomingItem = { label: string; title?: string; date?: string; to?: string; isDeadline?: boolean };

/* The following list of courses on the dashboard */
const recommended: Course[] = [
  { code: "CSC 3320", name: "Systems Programming" },
  { code: "MATH 2420", name: "Discrete Math" },
  { code: "MATH 3350", name: "Software Engineering" },
  { code: "MATH 3020", name: "Applied Probability and Statistics for Computer Science" },
];

/* The announcements bar */
/* TODO: replace this sample data with the student's real data from the backend */
const upcoming: UpcomingItem[] = [
  { label: "Registration opens", date: "2026-11-02", to: "/plan" },
  { label: "Advisor commented on your plan", to: "/plan" },
  {
    label: "Internship deadline",
    title: "Internship application",
    date: "2026-11-07",
    isDeadline: true,
  },
];

/* TODO: replace with the student's real credit hours */
const credits = { earned: 100, required: 120 };

/* Safely read JSON from localStorage (returns the fallback if anything goes wrong) */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadUser(): SessionUser | null {
  const user = readJson<SessionUser | null>(USER_KEY, null);
  return user && typeof user.name === "string" ? user : null;
}

function loadPlan(): string[] {
  const saved = readJson<unknown>(PLAN_KEY, []);
  return Array.isArray(saved) ? saved.filter((c): c is string => typeof c === "string") : [];
}

/* Whole days from today until the given "YYYY-MM-DD" date */
function daysUntil(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueText(days: number) {
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  children?: ReactNode;
};

function StatCard({ label, value, sub, children }: StatCardProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
      <p className="mb-1.5 text-[11px] text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  // Who is logged in (set by the log in page)
  const [user] = useState<SessionUser | null>(loadUser);
  // The courses the student added to their plan (kept after a refresh)
  const [added, setAdded] = useState<string[]>(loadPlan);

  useEffect(() => {
    document.title = "Dashboard · Sync";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(added));
    } catch {
      // If the browser blocks storage, the plan just won't be remembered
    }
  }, [added]);

  // Not logged in? Send them to the log in page instead of showing the dashboard
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // The Student's details
  const progress = Math.round((credits.earned / credits.required) * 100);
  const studentName = user.name.split(" ")[0];

  // Show the closest deadline
  const nextDeadline = upcoming
    .filter((item): item is UpcomingItem & { date: string } => Boolean(item.isDeadline && item.date))
    .map((item) => ({ ...item, days: daysUntil(item.date) }))
    .filter((item) => item.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  // 
  const visibleUpcoming = upcoming.filter((item) => !item.date || daysUntil(item.date) >= 0);

  function toggleCourse(code: string) {
    setAdded((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
  }

  function logOut() {
    localStorage.removeItem(USER_KEY);
    // "replace" so the Back button can't return to the dashboard after logging out
    navigate("/login", { replace: true });
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold">Welcome back, {studentName}!</h1>
          <button
            type="button"
            onClick={logOut}
            className="cursor-pointer text-xs text-gray-500 hover:text-gray-900 hover:underline"
          >
            Log out
          </button>
        </div>

        <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Degree progress" value={`${progress}%`}>
            <div
              role="progressbar"
              aria-label="Degree progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2.5 h-1.5 overflow-hidden rounded-sm bg-gray-200"
            >
              <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </StatCard>
          {/* Add the different expected graduation, and the current credit hours */}
          <StatCard label="Expected graduation" value="Spring 2027" sub="On track" />
          <StatCard
            label="Next deadline"
            value={nextDeadline ? (nextDeadline.title ?? nextDeadline.label) : "No deadlines"}
            sub={nextDeadline ? dueText(nextDeadline.days) : "You're all caught up"}
          />
          <StatCard
            label="Credit hours"
            value={`${credits.earned} / ${credits.required}`}
            sub={`${credits.required - credits.earned} to go`}
          />
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
          <section className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1.5 text-[11px] text-gray-500">Recommended next courses</p>
            <p aria-live="polite" className="text-xs text-gray-500">
              {added.length} {added.length === 1 ? "course" : "courses"} added
            </p>

            {recommended.map((course) => {
              const isAdded = added.includes(course.code);
              return (
                <div
                  key={course.code}
                  className="mt-2 flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2.5"
                >
                  <span>
                    {course.code} - {course.name}
                  </span>
                  {isAdded ? (
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      <span className="text-gray-500">Added to the plan!</span>
                      <button
                        type="button"
                        onClick={() => toggleCourse(course.code)}
                        aria-label={`Remove ${course.code} from plan`}
                        className="cursor-pointer text-brand hover:underline"
                      >
                        Undo
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleCourse(course.code)}
                      aria-label={`Add ${course.code} to plan`}
                      className="shrink-0 cursor-pointer text-xs text-brand hover:underline"
                    >
                      Add to plan
                    </button>
                  )}
                </div>
              );
            })}

            {/* Links to the other pages */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <Link to="/recs" className="text-brand hover:underline">
                See all recommendations
              </Link>
              {added.length > 0 && (
                <Link to="/plan" className="text-brand hover:underline">
                  View my plan
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1.5 text-[11px] text-gray-500">Upcoming</p>
            <ul>
              {visibleUpcoming.map((item) => {
                const text = item.date ? `${item.label} - ${formatDate(item.date)}` : item.label;
                return (
                  <li key={item.label} className="mt-2 text-xs">
                    {item.to ? (
                      <Link to={item.to} className="hover:text-brand hover:underline">
                        {text}
                      </Link>
                    ) : (
                      text
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
