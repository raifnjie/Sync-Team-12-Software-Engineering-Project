import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DashboardPage from "./dashboardpage";
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
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sends the user to the log in page when nobody is logged in", () => {
    // Testing that the dashboard is protected/
    renderDashboard();

    expect(screen.getByText("Login page")).toBeTruthy();
    expect(screen.queryByText(/Welcome back/)).toBeNull();
  });

  it("greets the user by name and counts a course added to the plan", () => {
    // Testing that adding the recommended course would the updated on the count and the value is saved
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    renderDashboard();

    expect(screen.getByText("Welcome back, Mike!")).toBeTruthy();
    expect(screen.getByText("0 courses added")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add CSC 3320 to plan" }));

    expect(screen.getByText("1 course added")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sync_plan") ?? "[]")).toEqual(["CSC 3320"]);
  });
});
