import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MapPage from "./mappage";

function renderMap() {
  render(
    <MemoryRouter initialEntries={["/map"]}>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("MapPage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sends the user to the log in page when nobody is logged in", () => {
    renderMap();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("filters to locked courses and says what is missing", () => {
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    renderMap();

    fireEvent.click(screen.getByRole("button", { name: /^Locked/ }));

    expect(screen.getByText("Needs MATH 2420")).toBeTruthy();
    expect(screen.queryByText("CSC 1301")).toBeNull();
  });

  it("opens a course to show its full prerequisite path and what it unlocks", () => {
    localStorage.setItem("sync_user", JSON.stringify({ name: "Mike Smith", email: "mike@gsu.edu" }));
    renderMap();

    const card = screen.getByRole("button", { name: /CSC 4730/ });
    expect(card.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(card);

    expect(card.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Full path, in order")).toBeTruthy();
    expect(screen.getByText("Nothing else depends on this course.")).toBeTruthy();
  });
});
