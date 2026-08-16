import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { StatsView } from "./StatsView";

const basePayload = {
  generatedAt: "2026-07-04T03:00:00.000Z",
  overview: {
    hero: { players: 4, games: 10, takeaway: "Nova leads" },
    cards: [],
    topSignals: [],
  },
  players: { options: [], selectedPlayerId: null, detail: null },
  playstyle: {},
  correlations: {},
  games: {},
};

describe("StatsView", () => {
  it("shows one section at a time and starts on the overview", async () => {
    render(
      <StatsView
        payload={{
          ...basePayload,
          correlations: { entries: [{ key: "assist", label: "Assist density" }] },
        }}
      />,
    );

    expect(screen.queryByText("Assist density")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Correlations" }));

    expect(screen.getByText("Assist density")).toBeInTheDocument();
  });

  it("renders each published game with its real result instead of filler", async () => {
    render(
      <StatsView
        payload={{
          ...basePayload,
          games: {
            items: [
              {
                gameId: "9e91ff35",
                winnerName: "Nova",
                isWinner: true,
                prestige: 14,
                contracts: 5,
                assists: 2,
                failures: 0,
                playerCount: 3,
                prestigeSpread: 8,
                groupName: "Wake Up!",
                finishedAt: "2026-08-16T08:14:47.855035+00:00",
              },
            ],
          },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Games" }));

    expect(screen.getByText(/Nova won/i)).toBeInTheDocument();
    expect(screen.getByText("Your prestige")).toBeInTheDocument();
    expect(screen.queryByText(/Tracked game/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Summary" })).toHaveAttribute(
      "href",
      "/summary/9e91ff35",
    );
  });

  it("renders the focused player's stats without leaking the profile id", async () => {
    render(
      <StatsView
        payload={{
          ...basePayload,
          players: {
            options: [],
            selectedPlayerId: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
            detail: {
              label: "Fochizzy",
              playerId: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
              summary: "Server-authored player detail across 19 finished games.",
              stats: { wins: 2, games: 19, winRate: "11%", avgPrestige: 9.2 },
            },
          },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Player" }));

    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("11%")).toBeInTheDocument();
    expect(
      screen.queryByText(/ff4d1f2b-5b12-4b38-90a6-469257356d7e/),
    ).not.toBeInTheDocument();
  });

  it("renders the pace, prestige-source, and round-phase sections the payload publishes", async () => {
    render(
      <StatsView
        payload={{
          ...basePayload,
          paceProfile: {
            description: "Avg prestige: 1.2 (first half) -> 3.3 (second half).",
            avgFirstHalf: 1.2,
            avgSecondHalf: 3.3,
          },
          prestigeSources: { directPct: 66.3, objectivePct: 13.7 },
          roundPhaseStats: {
            early: {
              label: "Early (rounds 0-6)",
              avgPrestigePerRound: 0.27,
              avgContractsPerRound: 0.32,
              avgFailuresPerRound: 0.14,
            },
          },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Playstyle" }));

    expect(screen.getByText("First half versus second half")).toBeInTheDocument();
    expect(screen.getByText("Where prestige comes from")).toBeInTheDocument();
    expect(screen.getByText("Early (rounds 0-6)")).toBeInTheDocument();
  });

  it("labels shared games a third player won rather than calling them draws", async () => {
    render(
      <StatsView
        payload={{
          ...basePayload,
          headToHead: [
            {
              opponentId: "rival",
              opponentName: "RevLoki",
              gamesTogether: 19,
              wins: 2,
              losses: 7,
              draws: 10,
            },
          ],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Rivals" }));

    expect(screen.getByText("Others won")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Draws" })).not.toBeInTheDocument();
  });
});
