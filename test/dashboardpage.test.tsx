import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "./dashboardpage";

describe("DashboardPage", () => {
  it("marks a recommended course as added when 'Add to plan' is clicked", async () => {
    // MemoryRouter is needed because the Navbar uses router links
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Before clicking: nothing has been added yet
    expect(screen.getByText("0 courses added")).toBeInTheDocument();

    // Click the first "Add to plan" button
    const addButtons = screen.getAllByRole("button", { name: "Add to plan" });
    await userEvent.click(addButtons[0]);

    // After clicking: the counter goes up and the button changes and locks
    expect(screen.getByText("1 courses added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Added To The Plan!" })).toBeDisabled();
  });
});
