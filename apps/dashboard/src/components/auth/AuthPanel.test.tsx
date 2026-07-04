import { render, screen } from "@testing-library/react";
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
});
