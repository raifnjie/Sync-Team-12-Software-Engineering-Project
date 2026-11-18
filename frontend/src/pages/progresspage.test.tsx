// The different items to import
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProgressPage from "./progresspage";

function renderProgress() {
  render(
    <MemoryRouter initialEntries={["/progress"]}>
      <Routes>
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProgressPage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sends the user to the log in page when nobody is logged in", () => {
    renderProgress();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("shows overall progress and a bar for each requirement", () => {
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    renderProgress();

    const overall = screen.getByRole("progressbar", { name: "Overall degree progress" });
    expect(overall.getAttribute("aria-valuenow")).toBe("83");

    const majorCore = screen.getByRole("progressbar", { name: "Major Core progress" });
    expect(majorCore.getAttribute("aria-valuetext")).toBe("30 of 36 credits");
    expect(screen.getByText("Complete ✓")).toBeTruthy(); // General Education
  });
});
