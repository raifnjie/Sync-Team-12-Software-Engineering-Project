import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/navbar";
import { ApiError } from "../lib/api";
import {
  dismiss,
  getRecommendations,
  restore,
  updatePreferences,
  type CourseRecommendation,
  type DismissKind,
  type Goal,
  type OpportunityRecommendation,
  type Recommendations,
} from "../lib/recommendations";

/* Same keys the dashboard uses, so "Add to plan" shows up there too */
const USER_KEY = "sync_user";
const PLAN_KEY = "sync_plan";
/* TODO: move saved opportunities to the backend with application tracking (FR-10.2, FR-10.3) */
const SAVED_KEY = "sync_saved_opportunities";

type Tab = "courses" | "postGrad" | "experiences";

const GOAL_LABEL: Record<Goal, string> = {
  "grad-school": "Graduate school",
  industry: "Job in industry",
  undecided: "Undecided",
};

const INTEREST_LABEL: Record<string, string> = {
  ai: "AI",
  data: "Data",
  security: "Security",
  web: "Web",
  systems: "Systems",
  theory: "Theory",
  software: "Software engineering",
};

const KIND_LABEL: Record<OpportunityRecommendation["kind"], string> = {
  "grad-program": "Graduate program",
  job: "Full-time job",
  internship: "Internship",
  research: "Research & teaching",
  certification: "Certification",
  club: "Club & events",
};

/* Safely read a list of strings from localStorage */
function readList(key: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // If the browser blocks storage, the list just won't be remembered
  }
}

function isLoggedIn() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
    return Boolean(user && typeof user.name === "string");
  } catch {
    return false;
  }
}

function formatDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* [["CSC 4520"], ["MATH 3020", "MATH 4751"]] -> "CSC 4520 and either MATH 3020 or MATH 4751" */
function describeMissing(missing: string[][]) {
  const parts = missing.map((group) => (group.length > 1 ? `either ${group.join(" or ")}` : group[0]));
  if (parts.length <= 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-gray-200 bg-white px-4 py-3.5">{children}</div>;
}

function Reasons({ reasons }: { reasons: string[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {reasons.map((reason) => (
        <li key={reason} className="flex gap-1.5 text-xs text-gray-600">
          <span aria-hidden="true" className="text-brand">
            •
          </span>
          {reason}
        </li>
      ))}
    </ul>
  );
}

function ToggleChip({ pressed, onClick, disabled, children }: { pressed: boolean; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={
        "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-60 " +
        (pressed ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-600 hover:border-brand")
      }
    >
      {children}
    </button>
  );
}

function TextButton({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="cursor-pointer text-xs text-brand hover:underline disabled:cursor-wait disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function CourseCard({
  course,
  rank,
  added,
  busy,
  onToggle,
  onDismiss,
}: {
  course: CourseRecommendation;
  rank: number;
  added: boolean;
  busy: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">
              #{rank} · {course.category} · {course.credits} credits
            </p>
            <h3 className="font-bold">
              {course.code} – {course.name}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand" title="Higher means a stronger fit for you right now">
            Fit {course.score}
          </span>
        </div>

        <Reasons reasons={course.reasons} />

        {!course.fitsLoad && (
          <p className="mt-2 text-xs text-amber-700">Over your credit limit for this term if you take the courses above it.</p>
        )}

        <div className="mt-3 flex items-center gap-4">
          {added ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Added to your plan</span>
              <TextButton onClick={onToggle} label={`Remove ${course.code} from plan`}>
                Undo
              </TextButton>
            </span>
          ) : (
            <TextButton onClick={onToggle} label={`Add ${course.code} to plan`}>
              Add to plan
            </TextButton>
          )}
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            aria-label={`Dismiss ${course.code}`}
            className="cursor-pointer text-xs text-gray-500 hover:text-gray-900 hover:underline disabled:cursor-wait"
          >
            Not interested
          </button>
        </div>
      </Card>
    </li>
  );
}

function OpportunityCard({
  opp,
  saved,
  busy,
  onToggleSave,
  onDismiss,
}: {
  opp: OpportunityRecommendation;
  saved: boolean;
  busy: boolean;
  onToggleSave: () => void;
  onDismiss: () => void;
}) {
  const { taken, total } = opp.readiness;
  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">
              {KIND_LABEL[opp.kind]} · {opp.organization}
            </p>
            <h3 className="font-bold">{opp.title}</h3>
          </div>
          {opp.deadline && opp.daysUntilDeadline !== undefined && (
            <span
              className={
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                (opp.daysUntilDeadline <= 30 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600")
              }
            >
              Apply by {formatDate(opp.deadline)}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-600">{opp.description}</p>
        <Reasons reasons={opp.reasons} />

        {total > 0 && (
          <div className="mt-3">
            <p className="text-[11px] text-gray-500">
              Related courses taken: {taken} of {total}
            </p>
            <div
              role="progressbar"
              aria-label={`Readiness for ${opp.title}`}
              aria-valuenow={taken}
              aria-valuemin={0}
              aria-valuemax={total}
              className="mt-1 h-1.5 overflow-hidden rounded-sm bg-gray-200"
            >
              <div className="h-full bg-brand" style={{ width: `${Math.round((taken / total) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-4">
          <TextButton onClick={onToggleSave} label={saved ? `Unsave ${opp.title}` : `Save ${opp.title}`}>
            {saved ? "Saved ✓ (undo)" : "Save to my goals"}
          </TextButton>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            aria-label={`Dismiss ${opp.title}`}
            className="cursor-pointer text-xs text-gray-500 hover:text-gray-900 hover:underline disabled:cursor-wait"
          >
            Not interested
          </button>
        </div>
      </Card>
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
  const [loggedIn] = useState(isLoggedIn);
  const [data, setData] = useState<Recommendations | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("courses");
  const [plan, setPlan] = useState<string[]>(() => readList(PLAN_KEY));
  const [saved, setSaved] = useState<string[]>(() => readList(SAVED_KEY));

  useEffect(() => {
    document.title = "Recommendations · Sync";
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await getRecommendations());
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Something went wrong loading recommendations.");
    }
  }, []);

  useEffect(() => {
    if (loggedIn) void load();
  }, [loggedIn, load]);

  useEffect(() => writeList(PLAN_KEY, plan), [plan]);
  useEffect(() => writeList(SAVED_KEY, saved), [saved]);

  if (!loggedIn) return <Navigate to="/login" replace />;

  /* Runs a change on the server and swaps in the re-ranked results */
  async function run(action: () => Promise<Recommendations>) {
    setBusy(true);
    setActionError(null);
    try {
      setData(await action());
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  function toggleInterest(interest: string) {
    if (!data) return;
    void run(() => updatePreferences({ interests: toggleIn(data.preferences.interests, interest) }));
  }

  const tabs: { id: Tab; label: string; count: number }[] = data
    ? [
        { id: "courses", label: "Courses", count: data.courses.length },
        { id: "postGrad", label: "After graduation", count: data.postGrad.length },
        { id: "experiences", label: "Experiences", count: data.experiences.length },
      ]
    : [];

  const dismissedCount = data ? data.dismissed.courses.length + data.dismissed.opportunities.length : 0;

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold">Recommendations</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {data
              ? `For ${data.term.label} · ${data.program.name} · based on your courses, remaining requirements, and goals`
              : "Courses, post-grad options, and experiences picked for you"}
          </p>
        </div>

        {!data && !loadError && <p className="text-xs text-gray-500">Loading recommendations…</p>}

        {loadError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3.5 text-xs text-red-700">
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 cursor-pointer font-medium underline">
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            {/* ── Preferences: goal and interests drive the ranking ── */}
            <section aria-label="Your preferences" className="mb-4">
              <Card>
                <div className="flex flex-col gap-3 md:flex-row md:gap-8">
                  <div>
                    <p className="mb-1.5 text-[11px] text-gray-500">After graduation I want</p>
                    <div className="flex flex-wrap gap-2">
                      {data.options.goals.map((goal) => (
                        <ToggleChip
                          key={goal}
                          pressed={data.preferences.goal === goal}
                          disabled={busy}
                          onClick={() => data.preferences.goal !== goal && void run(() => updatePreferences({ goal }))}
                        >
                          {GOAL_LABEL[goal]}
                        </ToggleChip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] text-gray-500">I'm interested in</p>
                    <div className="flex flex-wrap gap-2">
                      {data.options.interests.map((interest) => (
                        <ToggleChip
                          key={interest}
                          pressed={data.preferences.interests.includes(interest)}
                          disabled={busy}
                          onClick={() => toggleInterest(interest)}
                        >
                          {INTEREST_LABEL[interest] ?? interest}
                        </ToggleChip>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {actionError && (
              <p role="alert" className="mb-3 text-xs text-red-600">
                {actionError}
              </p>
            )}

            {/* ── Tabs ── */}
            <div role="tablist" aria-label="Recommendation type" className="mb-4 flex gap-5 border-b border-gray-200">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={
                    "-mb-px cursor-pointer border-b-2 py-2 text-xs " +
                    (tab === t.id ? "border-brand font-bold text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900")
                  }
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {tab === "courses" && (
              <section id="panel-courses" role="tabpanel" aria-labelledby="tab-courses">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <p>
                    Suggested load: <strong className="text-gray-900">{data.suggestedCredits} credits</strong> of your{" "}
                    {data.preferences.maxCreditsPerTerm}-credit limit
                  </p>
                  <p>
                    <span aria-live="polite">
                      {plan.length} {plan.length === 1 ? "course" : "courses"} in your plan
                    </span>
                    {plan.length > 0 && (
                      <>
                        {" · "}
                        <Link to="/plan" className="text-brand hover:underline">
                          View my plan
                        </Link>
                      </>
                    )}
                  </p>
                </div>

                {data.courses.length === 0 ? (
                  <Card>
                    <p className="text-xs text-gray-500">
                      No courses to recommend for {data.term.label}. You may have finished your requirements, or the
                      remaining ones aren't offered this term.
                    </p>
                  </Card>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {data.courses.map((course, i) => (
                      <CourseCard
                        key={course.code}
                        course={course}
                        rank={i + 1}
                        added={plan.includes(course.code)}
                        busy={busy}
                        onToggle={() => setPlan((p) => toggleIn(p, course.code))}
                        onDismiss={() => void run(() => dismiss("course", course.code))}
                      />
                    ))}
                  </ol>
                )}

                {data.blocked.length > 0 && (
                  <div className="mt-5">
                    <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Coming up later</h2>
                    <Card>
                      <ul className="divide-y divide-gray-100">
                        {data.blocked.map((b) => (
                          <li key={b.code} className="flex flex-wrap justify-between gap-2 py-2 text-xs first:pt-0 last:pb-0">
                            <span>
                              <span className="font-medium">{b.code}</span> <span className="text-gray-500">{b.name}</span>
                            </span>
                            <span className="text-gray-500">Needs {describeMissing(b.missing)}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                )}
              </section>
            )}

            {(tab === "postGrad" || tab === "experiences") && (
              <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
                <p className="mb-3 text-xs text-gray-500">
                  {tab === "postGrad"
                    ? "Graduate programs and jobs that fit your goal, ranked by how ready you are."
                    : "Things to do while you're in school that build toward your goal."}
                </p>
                {data[tab].length === 0 ? (
                  <Card>
                    <p className="text-xs text-gray-500">Nothing matches right now. Try a different goal or more interests.</p>
                  </Card>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data[tab].map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        saved={saved.includes(opp.id)}
                        busy={busy}
                        onToggleSave={() => setSaved((s) => toggleIn(s, opp.id))}
                        onDismiss={() => void run(() => dismiss("opportunity", opp.id))}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* ── Dismissed items can be brought back ── */}
            {dismissedCount > 0 && (
              <details className="mt-5 text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-900">Hidden ({dismissedCount})</summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {(
                    [
                      ...data.dismissed.courses.map((d) => ({ ...d, kind: "course" as DismissKind })),
                      ...data.dismissed.opportunities.map((d) => ({ ...d, kind: "opportunity" as DismissKind })),
                    ]
                  ).map((d) => (
                    <li key={`${d.kind}-${d.id}`} className="flex items-center gap-3">
                      <span>{d.title}</span>
                      <TextButton onClick={() => void run(() => restore(d.kind, d.id))} disabled={busy} label={`Restore ${d.title}`}>
                        Restore
                      </TextButton>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>
    </>
  );
}
