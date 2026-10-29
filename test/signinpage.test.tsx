import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SignInPage from "./signinpage";

describe("SignInPage", () => {
  it("switches from Log In to Create Account and shows the full name field", async () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    // Starts in log-in mode: no name field
    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();

    // Click "Create an account"
    await userEvent.click(screen.getByRole("button", { name: "Create an account" }));

    // Now in sign-up mode: the name field and the new button text appear
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });
});
