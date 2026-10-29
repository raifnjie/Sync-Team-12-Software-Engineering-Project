import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SignInPage from "./signinpage";

/* Opens the log in page, with a stand-in dashboard page to land on after logging in */
function renderLoginPage() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<SignInPage />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Log In" }));
}

describe("SignInPage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("shows an error and does not log in when the email is invalid", () => {
    /* Test that a badly formatted email is rejected */
    renderLoginPage();
    fillAndSubmit("not-an-email", "password123");

    expect(screen.getByText("Enter a valid email, like you@gsu.edu.")).toBeTruthy();
    expect(localStorage.getItem("sync_user")).toBeNull();
  });

  it("logs the user in and opens the dashboard when the form is valid", async () => {
    /* Test that valid details save the user and go to the dashboard */
    renderLoginPage();
    fillAndSubmit("mike.smith@gsu.edu", "password123");

    expect(await screen.findByText("Dashboard page")).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem("sync_user") ?? "{}");
    expect(saved.name).toBe("Mike");
    expect(saved.email).toBe("mike.smith@gsu.edu");
  });
});
