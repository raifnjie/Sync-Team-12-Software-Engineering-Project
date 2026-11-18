import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TimelinePage from "./timelinepage";

function renderTimeline() {
  return render(
    <MemoryRouter initialEntries={["/timeline"]}>
      <TimelinePage />
    </MemoryRouter>
  );
}

describe("TimelinePage Rendering Tests", () => {
  afterEach(() => {
    cleanup();
  });

  describe("All upcoming view (default)", () => {
    it("renders page header and graduation summary cards properly", () => {
      renderTimeline();

      // Heading and subtitle
      expect(screen.getByRole("heading", { name: "Degree Timeline" })).toBeInTheDocument();
      expect(screen.getByText("Mike's semester-by-semester plan to graduation")).toBeInTheDocument();

      // Summary section
      const summarySection = screen.getByLabelText("Graduation summary");
      expect(within(summarySection).getByText("Expected graduation")).toBeInTheDocument();
      expect(within(summarySection).getByText("Spring 2027")).toBeInTheDocument();
      expect(within(summarySection).getByText("On track ✓")).toBeInTheDocument();
      expect(within(summarySection).getByText("Credit hours")).toBeInTheDocument();
      expect(within(summarySection).getByText(/100/)).toBeInTheDocument();
      expect(within(summarySection).getByText(/\/ 120/)).toBeInTheDocument();
      expect(within(summarySection).getByText("Semesters completed")).toBeInTheDocument();
      expect(within(summarySection).getByText("Semesters remaining")).toBeInTheDocument();
    });

    it("renders the 'All upcoming' filter as active and displays all upcoming semesters", () => {
      renderTimeline();

      // Filter button is present and marked active
      const allUpcomingBtn = screen.getByRole("button", { name: "All upcoming" });
      expect(allUpcomingBtn).toBeInTheDocument();
      expect(allUpcomingBtn.className).toContain("bg-gray-800");

      // Section heading specifies 3 semesters for all upcoming
      expect(screen.getByText(/— 3 semesters/)).toBeInTheDocument();

      // Check all 3 upcoming/current semesters are rendered inside the semester list
      const semesterList = screen.getByLabelText("Semester list");
      expect(within(semesterList).getByText("Spring 2026")).toBeInTheDocument();
      expect(within(semesterList).getByText("Fall 2026")).toBeInTheDocument();
      expect(within(semesterList).getByText("Spring 2027")).toBeInTheDocument();

      // Completed semesters like Fall 2023 or Spring 2024 should not appear in upcoming
      expect(within(semesterList).queryByText("Fall 2023")).not.toBeInTheDocument();
      expect(within(semesterList).queryByText("Spring 2024")).not.toBeInTheDocument();
    });

    it("renders upcoming courses across the visible semesters", () => {
      renderTimeline();
      const semesterList = screen.getByLabelText("Semester list");

      // Current semester courses
      expect(within(semesterList).getByText("CSC 4910")).toBeInTheDocument();
      expect(within(semesterList).getByText("Technical Elective II")).toBeInTheDocument();

      // Future planned/recommended courses
      expect(within(semesterList).getByText("MATH 3350")).toBeInTheDocument();
      expect(within(semesterList).getByText("Software Engineering Math")).toBeInTheDocument();
      expect(within(semesterList).getByText("CSC 4140")).toBeInTheDocument();
      expect(within(semesterList).getByText("Artificial Intelligence")).toBeInTheDocument();
      expect(within(semesterList).getByText("CSC 4950")).toBeInTheDocument();
      expect(within(semesterList).getByText("Senior Capstone I")).toBeInTheDocument();
    });
  });

  describe("In Progress view", () => {
    it("switches to 'In Progress' filter and renders exactly 1 semester with all 4 courses", () => {
      renderTimeline();

      const inProgressBtn = screen.getByRole("button", { name: "In Progress" });
      expect(inProgressBtn).toBeInTheDocument();

      // Click to switch filter
      fireEvent.click(inProgressBtn);

      // Section heading shows 1 semester
      expect(screen.getByText(/— 1 semester$/)).toBeInTheDocument();

      // Only Spring 2026 is displayed inside the semester list
      const semesterList = screen.getByLabelText("Semester list");
      expect(within(semesterList).getByText("Spring 2026")).toBeInTheDocument();
      expect(within(semesterList).getByText("Current")).toBeInTheDocument();
      expect(within(semesterList).getByText("12 credits")).toBeInTheDocument();
      expect(within(semesterList).queryByText("Fall 2026")).not.toBeInTheDocument();
      expect(within(semesterList).queryByText("Spring 2027")).not.toBeInTheDocument();

      // Verify each in-progress course is rendered properly with credits and status pill
      expect(within(semesterList).getByText("CSC 4910")).toBeInTheDocument();
      expect(within(semesterList).getByText("Technical Elective II")).toBeInTheDocument();

      expect(within(semesterList).getByText("CSC 3320")).toBeInTheDocument();
      expect(within(semesterList).getByText("Systems Programming")).toBeInTheDocument();

      expect(within(semesterList).getByText("MATH 2420")).toBeInTheDocument();
      expect(within(semesterList).getByText("Discrete Math")).toBeInTheDocument();

      expect(within(semesterList).getByText("CSC 4920")).toBeInTheDocument();
      expect(within(semesterList).getByText("Senior Seminar")).toBeInTheDocument();

      // In-progress status pills inside the semester list
      const pills = within(semesterList).getAllByText("In Progress");
      expect(pills).toHaveLength(4);
    });

    it("toggles smoothly between 'All upcoming' and 'In Progress' views", () => {
      renderTimeline();

      const inProgressBtn = screen.getByRole("button", { name: "In Progress" });
      const allUpcomingBtn = screen.getByRole("button", { name: "All upcoming" });
      const semesterList = () => screen.getByLabelText("Semester list");

      // Initially All upcoming (3 semesters)
      expect(screen.getByText(/— 3 semesters/)).toBeInTheDocument();
      expect(within(semesterList()).getByText("Fall 2026")).toBeInTheDocument();

      // Switch to In Progress (1 semester)
      fireEvent.click(inProgressBtn);
      expect(screen.getByText(/— 1 semester$/)).toBeInTheDocument();
      expect(within(semesterList()).queryByText("Fall 2026")).not.toBeInTheDocument();

      // Switch back to All upcoming (3 semesters)
      fireEvent.click(allUpcomingBtn);
      expect(screen.getByText(/— 3 semesters/)).toBeInTheDocument();
      expect(within(semesterList()).getByText("Fall 2026")).toBeInTheDocument();
      expect(within(semesterList()).getByText("Spring 2027")).toBeInTheDocument();
    });
  });
});
