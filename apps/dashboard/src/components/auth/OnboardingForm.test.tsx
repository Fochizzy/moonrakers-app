import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./OnboardingForm";

describe("OnboardingForm", () => {
  it("requires a player name before submission", () => {
    render(
      <OnboardingForm initialProfile={null} action={async () => ({ ok: true })} />,
    );

    expect(screen.getByLabelText("Player Name")).toBeRequired();
  });

  it("offers the accent palette as swatches instead of free text", async () => {
    const action = vi.fn(async () => ({ ok: true }));

    render(<OnboardingForm initialProfile={null} action={action} />);

    const purple = screen.getByRole("button", { name: "purple" });
    expect(purple).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(purple);

    expect(purple).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "blue" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows a save failure inline rather than in a browser dialog", async () => {
    render(
      <OnboardingForm
        initialProfile={{
          id: "p1",
          player_name: "Nova",
          display_name: null,
          favorite_color: "blue",
          assigned_card_art_index: null,
        }}
        action={async () => ({ ok: false, message: "Player name is taken." })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Player name is taken.",
    );
  });
});
