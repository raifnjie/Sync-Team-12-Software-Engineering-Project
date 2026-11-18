import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TimelinePage from "./timelinepage";
import * as progressApi from "../lib/progress";
import type { Progress } from "../lib/progress";

vi.mock("../lib/progress", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/progress")>()),
  getProgress: vi.fn(),
}));

const progress = {
  credits: { earned: 95, inProgress: 9, required: 120, remaining: 21 },
  percent: 79,
  expectedGraduation: { season: "FALL", year: 2027, label: "Fall 2027" },
  targetGraduation: { season: "SPRING", year: 2027, label: "Spring 2027" },
  onTrack: false,
  timeline: [
    { id: "fall-2025", label: "Fall 2025", status: "completed", totalCredits: 3, courses: [{ code: "CSC 3320", name: "System-Level Programming", credits: 3, status: "completed" }] },
    { id: "fall-2026", label: "Fall 2026", status: "current", totalCredits: 3, courses: [{ code: "CSC 3350", name: "Software Development", credits: 3, status: "in-progress" }] },
    {
      id: "spring-2027",
      label: "Spring 2027",
      status: "upcoming",
      totalCredits: 6,
      courses: [
        { code: "CSC 4520", name: "Design and Analysis of Algorithms", credits: 3, status: "planned" },
        { code: "CSC 4330", name: "Programming Language Concepts", credits: 3, status: "recommended" },
      ],
    },
  ],
} as Progress;

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/timeline"]}>
      <Routes>
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TimelinePage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("sends the user to the log in page when nobody is logged in", () => {
    renderPage();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("shows the student's own terms, credits, and graduation projection", async () => {
    localStorage.setItem("sync_user", JSON.stringify({ name: "Jordan Lee", email: "jordan@gsu.edu" }));
    vi.mocked(progressApi.getProgress).mockResolvedValue(progress);
    renderPage();

    expect(await screen.findByText("Fall 2027")).toBeTruthy();
    expect(screen.getByText("Jordan's semester-by-semester plan to graduation")).toBeTruthy();
    expect(screen.getByText("Behind your Spring 2027 target")).toBeTruthy();
    // Default filter shows current and upcoming terms
    expect(screen.getByText("Software Development")).toBeTruthy();
    expect(screen.getByText("Design and Analysis of Algorithms")).toBeTruthy();
    expect(screen.queryByText("System-Level Programming")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Recommended" }));
    expect(screen.getByText("Programming Language Concepts")).toBeTruthy();
    expect(screen.queryByText("Design and Analysis of Algorithms")).toBeNull();
  });
});
