import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import { errorMessage } from "../lib/api";
import { logout } from "../lib/auth";
import { usePlan } from "../lib/usePlan";
import { getProgress, graduationStatus, type Progress } from "../lib/progress";
import { getRecommendations, type CourseRecommendation } from "../lib/recommendations";

/* Same key the log in page uses */
const USER_KEY = "sync_user";
/* How many recommended courses the dashboard shows (the rest are on /recs) */
const RECOMMENDED_COUNT = 4;

type SessionUser = { name: string; email: string };
/* date is "YYYY-MM-DD". "to" makes the item a link. */
type UpcomingItem = { label: string; title?: string; date?: string; to?: string; isDeadline?: boolean };

/* The announcements bar */
/* TODO: replace this sample data with registration dates and saved-opportunity deadlines from the backend */
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
  // The student's plan, saved on the server
  const { codes: added, toggle: toggleCourse, error: planError } = usePlan(Boolean(user));
  // Degree progress and recommended courses from the backend
  const [progressData, setProgressData] = useState<Progress | null>(null);
  const [recommended, setRecommended] = useState<CourseRecommendation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard · Sync";
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getProgress(), getRecommendations()])
      .then(([p, r]) => {
        if (cancelled) return;
        setProgressData(p);
        setRecommended(r.courses.slice(0, RECOMMENDED_COUNT));
      })
      .catch((e) => !cancelled && setLoadError(errorMessage(e, "Couldn't load your dashboard.")));
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Not logged in? Send them to the log in page instead of showing the dashboard
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // The Student's details
  const credits = progressData?.credits;
  const progress = progressData?.percent ?? 0;
  const studentName = user.name.split(" ")[0];

  // Show the closest deadline
  const nextDeadline = upcoming
    .filter((item): item is UpcomingItem & { date: string } => Boolean(item.isDeadline && item.date))
    .map((item) => ({ ...item, days: daysUntil(item.date) }))
    .filter((item) => item.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  // 
  const visibleUpcoming = upcoming.filter((item) => !item.date || daysUntil(item.date) >= 0);

  function logOut() {
    logout();
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

        {loadError && (
          <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
            {loadError}
          </p>
        )}

        <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Degree progress" value={progressData ? `${progress}%` : "–"}>
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
          <StatCard
            label="Expected graduation"
            value={progressData?.expectedGraduation.label ?? "–"}
            sub={progressData ? graduationStatus(progressData) : undefined}
          />
          <StatCard
            label="Next deadline"
            value={nextDeadline ? (nextDeadline.title ?? nextDeadline.label) : "No deadlines"}
            sub={nextDeadline ? dueText(nextDeadline.days) : "You're all caught up"}
          />
          <StatCard
            label="Credit hours"
            value={credits ? `${credits.earned} / ${credits.required}` : "–"}
            sub={credits ? `${Math.max(0, credits.required - credits.earned)} to go` : undefined}
          />
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
          <section className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1.5 text-[11px] text-gray-500">Recommended next courses</p>
            <p aria-live="polite" className="text-xs text-gray-500">
              {added.length} {added.length === 1 ? "course" : "courses"} added
            </p>

            {planError && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {planError}
              </p>
            )}

            {recommended === null && !loadError && <p className="mt-2 text-xs text-gray-500">Loading…</p>}
            {recommended?.length === 0 && (
              <p className="mt-2 text-xs text-gray-500">No courses to recommend right now.</p>
            )}

            {(recommended ?? []).map((course) => {
              const isAdded = added.includes(course.code);
              return (
                <div
                  key={course.code}
                  className="mt-2 flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block">
                      {course.code} - {course.name}
                    </span>
                    {course.reasons[0] && <span className="block text-[11px] text-gray-500">{course.reasons[0]}</span>}
                  </span>
                  {isAdded ? (
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      <span className="text-gray-500">Added to the plan!</span>
                      <button
                        type="button"
                        onClick={() => void toggleCourse(course.code)}
                        aria-label={`Remove ${course.code} from plan`}
                        className="cursor-pointer text-brand hover:underline"
                      >
                        Undo
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void toggleCourse(course.code)}
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
