import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DashboardPage from "./dashboardpage";
import * as planApi from "../lib/plan";
import * as progressApi from "../lib/progress";
import * as recsApi from "../lib/recommendations";
import type { Progress } from "../lib/progress";
import type { Recommendations } from "../lib/recommendations";

// Replace server calls with test doubles (the real usePlan hook still runs)
vi.mock("../lib/plan", () => ({ getPlan: vi.fn(), addToPlan: vi.fn(), removeFromPlan: vi.fn() }));
vi.mock("../lib/progress", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/progress")>()),
  getProgress: vi.fn(),
}));
vi.mock("../lib/recommendations", () => ({ getRecommendations: vi.fn() }));

const term = { season: "SPRING", year: 2027, label: "Spring 2027" };
const planWith = (...codes: string[]) => ({
  defaultTerm: term,
  totalCredits: codes.length * 3,
  courses: codes.map((code) => ({ code, name: code, credits: 3, term, missing: [] })),
});

const progress = {
  credits: { earned: 95, inProgress: 9, required: 120, remaining: 21 },
  percent: 79,
  expectedGraduation: { season: "FALL", year: 2027, label: "Fall 2027" },
  targetGraduation: { season: "FALL", year: 2027, label: "Fall 2027" },
  onTrack: true,
} as Progress;

const recommendations = {
  courses: [
    { code: "CSC 4520", name: "Design and Analysis of Algorithms", reasons: ["Required for Upper-Division Core"] },
    { code: "CSC 4330", name: "Programming Language Concepts", reasons: [] },
  ],
} as unknown as Recommendations;

// Opens the dashboard page with a log-in page automatically if someone hasn't logged in
function renderDashboard() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(planApi.getPlan).mockResolvedValue(planWith());
    vi.mocked(progressApi.getProgress).mockResolvedValue(progress);
    vi.mocked(recsApi.getRecommendations).mockResolvedValue(recommendations);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("sends the user to the log in page when nobody is logged in", () => {
    // Testing that the dashboard is protected
    renderDashboard();

    expect(screen.getByText("Login page")).toBeTruthy();
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(progressApi.getProgress).not.toHaveBeenCalled();
  });

  it("shows the student's real progress, credits, and expected graduation", async () => {
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    renderDashboard();

    expect(screen.getByText("Welcome back, Mike!")).toBeTruthy();
    expect(await screen.findByText("79%")).toBeTruthy();
    expect(screen.getByText("95 / 120")).toBeTruthy();
    expect(screen.getByText("25 to go")).toBeTruthy();
    expect(screen.getByText("Fall 2027")).toBeTruthy();
    expect(screen.getByText("On track")).toBeTruthy();
    // Recommended courses come from the API, with their top reason
    expect(screen.getByText("CSC 4520 - Design and Analysis of Algorithms")).toBeTruthy();
    expect(screen.getByText("Required for Upper-Division Core")).toBeTruthy();
  });

  it("adds a recommended course to the saved plan and counts it", async () => {
    // Testing that adding the recommended course updates the count and is saved on the server
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    vi.mocked(planApi.addToPlan).mockResolvedValue(planWith("CSC 4520"));
    renderDashboard();

    expect(await screen.findByText("0 courses added")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Add CSC 4520 to plan" }));

    expect(await screen.findByText("1 course added")).toBeTruthy();
    expect(planApi.addToPlan).toHaveBeenCalledWith("CSC 4520");
  });
});
