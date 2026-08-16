import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AuthPanel } from "./AuthPanel";

describe("AuthPanel", () => {
  it("shows create-account controls alongside sign-in and recovery actions", () => {
    render(<AuthPanel />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
  });

  it("marks only the active mode as pressed and switches on click", async () => {
    render(<AuthPanel />);

    const signIn = screen.getByRole("button", { name: "Sign In" });
    const createAccount = screen.getByRole("button", { name: "Create Account" });

    expect(signIn).toHaveAttribute("aria-pressed", "true");
    expect(createAccount).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(createAccount);

    expect(createAccount).toHaveAttribute("aria-pressed", "true");
    expect(signIn).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Join the crew")).toBeInTheDocument();
  });

  it("explains why the guard sent the visitor back to the sign-in form", () => {
    window.history.replaceState({}, "", "/auth?reason=session-expired");

    render(<AuthPanel />);

    expect(screen.getByRole("status")).toHaveTextContent(/session expired/i);

    window.history.replaceState({}, "", "/auth");
  });

  it("asks for an email before requesting a reset link", async () => {
    render(<AuthPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: /send reset link/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Enter your email address first/i,
    );
  });
});
