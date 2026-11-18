import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RecommendationsPage from "./recommendationspage";
import * as api from "../lib/recommendations";
import * as planApi from "../lib/plan";
import { ApiError } from "../lib/api";
import type { Recommendations } from "../lib/recommendations";

// Replace the real network calls with test doubles
vi.mock("../lib/recommendations", () => ({
  getRecommendations: vi.fn(),
  updatePreferences: vi.fn(),
  dismiss: vi.fn(),
  restore: vi.fn(),
  saveOpportunity: vi.fn(),
  unsaveOpportunity: vi.fn(),
}));
// The real usePlan hook runs; only its server calls are replaced
vi.mock("../lib/plan", () => ({ getPlan: vi.fn(), addToPlan: vi.fn(), removeFromPlan: vi.fn() }));

const term = { season: "SPRING", year: 2027, label: "Spring 2027" };
const planWith = (...codes: string[]) => ({
  defaultTerm: term,
  totalCredits: codes.length * 3,
  courses: codes.map((code) => ({ code, name: code, credits: 3, term, missing: [] })),
});

function sample(overrides: Partial<Recommendations> = {}): Recommendations {
  return {
    term: { season: "SPRING", year: 2027, label: "Spring 2027" },
    program: { id: "bs-cs", name: "B.S. Computer Science" },
    preferences: { goal: "grad-school", interests: ["ai"], maxCreditsPerTerm: 15 },
    options: { goals: ["grad-school", "industry", "undecided"], interests: ["ai", "data", "security"] },
    suggestedCredits: 6,
    courses: [
      {
        code: "CSC 4520",
        name: "Design and Analysis of Algorithms",
        credits: 3,
        tags: ["theory"],
        category: "Upper-Division Core",
        score: 69,
        reasons: ["Required for Upper-Division Core", "Unlocks 2 courses you still need: CSC 4810 and CSC 4850"],
        unlocks: ["CSC 4810", "CSC 4850"],
        fitsLoad: true,
      },
      {
        code: "CSC 4350",
        name: "Software Engineering",
        credits: 3,
        tags: ["software"],
        category: "Upper-Division Core",
        score: 53,
        reasons: ["Required for Upper-Division Core"],
        unlocks: ["CSC 4351"],
        fitsLoad: true,
      },
    ],
    blocked: [{ code: "CSC 4850", name: "Machine Learning", category: "CS Electives", missing: [["CSC 4520"], ["MATH 3020", "MATH 4751"]] }],
    postGrad: [
      {
        id: "pg-ms-cs",
        category: "post-grad",
        kind: "grad-program",
        title: "M.S. in Computer Science",
        organization: "Graduate program",
        description: "Two-year master's degree.",
        deadline: "2027-02-01",
        daysUntilDeadline: 77,
        score: 52,
        reasons: ["Fits your goal: graduate school"],
        readiness: { taken: 1, total: 3 },
        suggestedCourses: [{ code: "CSC 4520", name: "Design and Analysis of Algorithms" }],
      },
    ],
    experiences: [],
    saved: [],
    dismissed: { courses: [], opportunities: [] },
    ...overrides,
  };
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/recs"]}>
      <Routes>
        <Route path="/recs" element={<RecommendationsPage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RecommendationsPage", () => {
  beforeEach(() => {
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    vi.mocked(api.getRecommendations).mockResolvedValue(sample());
    vi.mocked(planApi.getPlan).mockResolvedValue(planWith());
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("sends the user to the log in page when nobody is logged in", () => {
    localStorage.clear();
    renderPage();
    expect(screen.getByText("Login page")).toBeTruthy();
    expect(api.getRecommendations).not.toHaveBeenCalled();
  });

  it("shows ranked courses with the reasons for each one", async () => {
    renderPage();

    expect(await screen.findByText("CSC 4520 – Design and Analysis of Algorithms")).toBeTruthy();
    expect(screen.getByText("Unlocks 2 courses you still need: CSC 4810 and CSC 4850")).toBeTruthy();
    expect(screen.getByText(/For Spring 2027/)).toBeTruthy();
    // Locked courses explain what they're waiting on
    expect(screen.getByText("Needs CSC 4520 and either MATH 3020 or MATH 4751")).toBeTruthy();
  });

  it("adds a recommended course to the saved plan", async () => {
    vi.mocked(planApi.addToPlan).mockResolvedValue(planWith("CSC 4520"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add CSC 4520 to plan" }));

    expect(await screen.findByText("1 course in your plan")).toBeTruthy();
    expect(planApi.addToPlan).toHaveBeenCalledWith("CSC 4520");
    expect(screen.getByRole("button", { name: "Remove CSC 4520 from plan" })).toBeTruthy();
  });

  it("shows courses already in the plan and explains when the server refuses an add", async () => {
    vi.mocked(planApi.getPlan).mockResolvedValue(planWith("CSC 4350"));
    vi.mocked(planApi.addToPlan).mockRejectedValue(new ApiError(409, "CSC 4520 needs CSC 2720 first."));
    renderPage();

    expect(await screen.findByRole("button", { name: "Remove CSC 4350 from plan" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add CSC 4520 to plan" }));

    expect(await screen.findByText("CSC 4520 needs CSC 2720 first.")).toBeTruthy();
    // The optimistic add is undone
    expect(screen.getByRole("button", { name: "Add CSC 4520 to plan" })).toBeTruthy();
  });

  it("dismisses a course and lets the student restore it", async () => {
    vi.mocked(api.dismiss).mockResolvedValue(
      sample({ courses: [sample().courses[1]], dismissed: { courses: [{ id: "CSC 4520", title: "CSC 4520 Design and Analysis of Algorithms" }], opportunities: [] } })
    );
    vi.mocked(api.restore).mockResolvedValue(sample());
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Dismiss CSC 4520" }));

    expect(await screen.findByText("Hidden (1)")).toBeTruthy();
    expect(api.dismiss).toHaveBeenCalledWith("course", "CSC 4520");
    expect(screen.queryByText("CSC 4520 – Design and Analysis of Algorithms")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Restore CSC 4520 Design and Analysis of Algorithms" }));
    expect(await screen.findByText("CSC 4520 – Design and Analysis of Algorithms")).toBeTruthy();
    expect(api.restore).toHaveBeenCalledWith("course", "CSC 4520");
  });

  it("shows post-grad options on their own tab and saves one", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "After graduation (1)" }));

    expect(screen.getByText("M.S. in Computer Science")).toBeTruthy();
    expect(screen.getByText("Related courses taken: 1 of 3")).toBeTruthy();

    vi.mocked(api.saveOpportunity).mockResolvedValue(["pg-ms-cs"]);
    fireEvent.click(screen.getByRole("button", { name: "Save M.S. in Computer Science" }));
    expect(await screen.findByRole("button", { name: "Unsave M.S. in Computer Science" })).toBeTruthy();
    expect(api.saveOpportunity).toHaveBeenCalledWith("pg-ms-cs");
  });

  it("re-ranks when the student changes their goal or interests", async () => {
    vi.mocked(api.updatePreferences).mockResolvedValue(
      sample({ preferences: { goal: "industry", interests: ["ai", "security"], maxCreditsPerTerm: 15 } })
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Job in industry" }));
    expect(api.updatePreferences).toHaveBeenCalledWith({ goal: "industry" });
    expect(await screen.findByRole("button", { name: "Job in industry", pressed: true })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Data" }));
    expect(api.updatePreferences).toHaveBeenLastCalledWith({ interests: ["ai", "security", "data"] });
  });

  it("shows a helpful error and retries when the server can't be reached", async () => {
    vi.mocked(api.getRecommendations).mockRejectedValueOnce(new ApiError(0, "Can't reach the Sync server."));
    renderPage();

    expect(await screen.findByText("Can't reach the Sync server.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("CSC 4520 – Design and Analysis of Algorithms")).toBeTruthy();
  });
});
