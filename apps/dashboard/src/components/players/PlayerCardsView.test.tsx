import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RosterPlayer } from "@/lib/data/loadPlayerRoster";

import { PlayerCardsView } from "./PlayerCardsView";

function player(overrides: Partial<RosterPlayer> & { id: string; name: string }) {
  return {
    assignedCardArtIndex: null,
    avgPrestige: 0,
    color: null,
    currentElo: 1000,
    gamesPlayed: 0,
    losses: 0,
    peakElo: 1000,
    prestige: 0,
    rank: 99,
    score: 0,
    wins: 0,
    ...overrides,
  } satisfies RosterPlayer;
}

const PLAYERS: RosterPlayer[] = [
  player({ id: "p1", name: "Alix", currentElo: 1040, gamesPlayed: 10, wins: 6, losses: 4 }),
  player({ id: "p2", name: "Bo", currentElo: 1120, gamesPlayed: 8, wins: 5, losses: 3 }),
];

describe("PlayerCardsView", () => {
  it("ranks cards by rating regardless of the rank the server sent", () => {
    render(
      <PlayerCardsView
        focusPlayerId={null}
        players={PLAYERS}
        signedInPlayerId="p1"
      />,
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.queryByText("#99")).not.toBeInTheDocument();
  });

  it("focuses the requested player and shows their record", () => {
    render(
      <PlayerCardsView
        focusPlayerId="p1"
        players={PLAYERS}
        signedInPlayerId="p2"
      />,
    );

    expect(screen.getByText("Rank #2")).toBeInTheDocument();
    expect(
      screen.getByText("6 wins · 60% win rate across 10 games"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute(
      "href",
      "/player-profile/p1",
    );
  });

  it("falls back to the signed-in player when no card is requested", () => {
    render(
      <PlayerCardsView
        focusPlayerId={null}
        players={PLAYERS}
        signedInPlayerId="p1"
      />,
    );

    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute(
      "href",
      "/player-profile/p1",
    );
  });

  it("shows an empty state when there is no roster", () => {
    render(
      <PlayerCardsView focusPlayerId={null} players={[]} signedInPlayerId="p1" />,
    );

    expect(screen.getByText("No cards to show yet")).toBeInTheDocument();
  });
});
