import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { test, expect } from "vitest";
import SignInPage from "./signinpage";

// Test 1: Verify the sign-in form is displayed when the page first loads
test("renders sign in form by default", () => {
  // Render the SignInPage wrapped in a router (needed because it uses useNavigate)
  render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>
  );

  // Check that the "Log In" submit button exists on the screen
  expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
});

// Test 2: Verify switching from Sign In mode to Sign Up mode
test("shows full name field when clicking create account", () => {
  // Render the component
  render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>
  );

  // Simulate user clicking the "Create an account" toggle button
  fireEvent.click(screen.getByRole("button", { name: /create an account/i }));

  // Check that the "Full name" input (placeholder "Jordan Smith") now appears
  expect(screen.getByPlaceholderText(/jordan smith/i)).toBeInTheDocument();
});
