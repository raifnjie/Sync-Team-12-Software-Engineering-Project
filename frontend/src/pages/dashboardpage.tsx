import { useState, type ReactNode } from "react";
import Navbar from "../components/navbar";

// A "type" describes the shape of our data
type Course = { code: string; name: string };

// Fake data for now. Later this will come from the backend.
const recommended: Course[] = [
  { code: "CSC 3320", name: "Systems Programming" },
  { code: "MATH 2420", name: "Discrete Math" },
  { code: "MATH 3350", name: "Software Engineering" },
  { code: "MATH 3020", name: "Applied Probability and Statistics for Computer Science" },
];

const upcoming = [
  "Registration opens - Oct 20",
  "Advisor commented on your plan",
  "Internship deadline - Oct 18",
];

// A small reusable card. "Props" are the values we pass in, like HTML attributes.
type StatCardProps = {
  label: string;
  value: string;
  sub?: string; // the ? means this one is optional
  children?: ReactNode; // anything placed between the card's tags
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
  const progress = 80; // percent
  const studentName = "Mike";
  // List of course codes the user clicked "Add to plan" on
  const [added, setAdded] = useState<string[]>([]);

  function addToPlan(code: string) {
    setAdded([...added, code]); // make a new list with the new code at the end
  }

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-250 p-6">
        <h1 className="mb-4 text-lg font-bold">Welcome back, {studentName}!</h1>

        {/* 2 columns on phones, 4 on bigger screens (md:) */}
        <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Degree progress" value={`${progress}%`}>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2.5 h-1.5 overflow-hidden rounded-sm bg-gray-200"
            >
              <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </StatCard>
          <StatCard label="Expected graduation" value="Spring 2027" sub="On track" />
          <StatCard label="Next deadline" value="Internship application" sub="Due in 9 days" />
          <StatCard label="Credit hours" value="100 / 120" />
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
          <section className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1.5 text-[11px] text-gray-500">Recommended next courses</p>
            <p className="text-xs text-gray-500">{added.length} courses added</p>

            {/* .map() makes one row for every course in the list */}
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
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => addToPlan(course.code)}
                    className={
                      "text-xs " +
                      (isAdded
                        ? "text-gray-500"
                        : "cursor-pointer text-brand hover:underline")
                    }
                  >
                    {isAdded ? "Added To The Plan!" : "Add to plan"}
                  </button>
                </div>
              );
            })}
          </section>

          <section className="rounded-md border border-gray-200 bg-white px-4 py-3.5">
            <p className="mb-1.5 text-[11px] text-gray-500">Upcoming</p>
            <ul>
              {upcoming.map((item) => (
                <li key={item} className="mt-2 text-xs">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
