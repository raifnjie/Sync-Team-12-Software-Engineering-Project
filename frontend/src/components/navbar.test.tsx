import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { test, expect } from "vitest";
import Navbar from "./navbar";

// Test: Verify that the navigation bar renders its essential elements
test("renders sync brand and dashboard link", () => {
  // Render the Navbar wrapped in a router (needed because it uses NavLink/Link)
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  // Check that the "Sync" logo/title text is visible on the screen
  expect(screen.getByText("Sync")).toBeInTheDocument();

  // Check that the "Dashboard" navigation link is rendered
  expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
});
