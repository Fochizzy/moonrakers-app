import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GameEntryPreview } from "./GameEntryPreview";

/**
 * The mock opens on a real turn — the 20th of the most recent four-player game
 * — and the numbers must move the way the app's engine moves them: prestige is
 * direct + objectives + assists received, and score adds 5 a contract, 3 an
 * assist, and subtracts 4 a failure.
 */
describe("GameEntryPreview", () => {
  function totalsFor(name: string) {
    return screen.getByLabelText(`${name} prestige and score`);
  }

  it("opens on the recorded turn with every seat already totalled", () => {
    render(<GameEntryPreview />);

    // Lurker's 11 prestige and 54 score are what the finished game recorded.
    expect(totalsFor("Lurker")).toHaveTextContent("P: 11");
    expect(totalsFor("Lurker")).toHaveTextContent("S: 54");
    expect(totalsFor("GregMtG")).toHaveTextContent("P: 12");
    expect(totalsFor("Fochizzy")).toHaveTextContent("P: 11");
    expect(totalsFor("RevLoki")).toHaveTextContent("P: 12");
  });

  it("moves the active player's totals as direct prestige is entered", async () => {
    render(<GameEntryPreview />);

    await userEvent.click(
      screen.getByRole("button", { name: "Increase Direct prestige" }),
    );

    expect(totalsFor("Lurker")).toHaveTextContent("P: 12");
    expect(totalsFor("Lurker")).toHaveTextContent("S: 55");
  });

  it("charges the score for a failed contract instead of crediting it", async () => {
    render(<GameEntryPreview />);

    await userEvent.click(
      screen.getByRole("button", { name: /contract failed/i }),
    );

    // Prestige is untouched; the swing is 5 lost plus 4 charged.
    expect(totalsFor("Lurker")).toHaveTextContent("P: 11");
    expect(totalsFor("Lurker")).toHaveTextContent("S: 45");
  });

  it("moves assist prestige to the player who was helped", async () => {
    render(<GameEntryPreview />);

    await userEvent.click(
      screen.getByRole("button", { name: "RevLoki assisted" }),
    );

    expect(totalsFor("RevLoki")).toHaveTextContent("P: 13");
    // Lurker banks the assist itself, worth 3 score.
    expect(totalsFor("Lurker")).toHaveTextContent("S: 57");
  });

  it("clears every assist row when None is used", async () => {
    render(<GameEntryPreview />);

    const assistsPanel = screen
      .getByRole("heading", { name: "Assists" })
      .closest("section") as HTMLElement;

    await userEvent.click(
      within(assistsPanel).getByRole("button", { name: "None" }),
    );

    expect(totalsFor("Fochizzy")).toHaveTextContent("P: 10");
    expect(totalsFor("Lurker")).toHaveTextContent("S: 51");
  });

  it("awards objective prestige to any seat at the table", async () => {
    render(<GameEntryPreview />);

    await userEvent.click(
      screen.getByRole("button", { name: "Increase Objectives for RevLoki" }),
    );

    expect(totalsFor("RevLoki")).toHaveTextContent("P: 13");
  });

  it("keeps the standings strip in leaderboard order", async () => {
    render(<GameEntryPreview />);

    await userEvent.click(
      screen.getByRole("button", { name: "Increase Direct prestige" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Increase Direct prestige" }),
    );

    // Lurker reaches 13 prestige and should overtake the seats sitting on 12.
    const names = screen
      .getAllByLabelText(/prestige and score$/)
      .map((node) => node.getAttribute("aria-label"));

    expect(names[0]).toBe("Lurker prestige and score");
  });
});
