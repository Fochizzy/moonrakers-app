import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EloView } from "./EloView";

describe("EloView", () => {
  it("renders leaderboard rows and visible filter controls", () => {
    render(
      <EloView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          sortKey: "elo",
          playerOptions: [
            { id: "p1", name: "Nova", label: "Nova", currentElo: 1150 },
            { id: "p2", name: "Vex", label: "Vex", currentElo: 1110 },
          ],
          selectedPlayerId: "p1",
          selectedOpponentId: null,
          leaderboardRows: [
            {
              rank: 1,
              playerId: "p1",
              name: "Nova",
              currentElo: 1150,
              peakElo: 1180,
              confidence: 0.7,
              gamesPlayed: 12,
              wins: 8,
              losses: 4,
              score: 240,
              prestige: 160,
              efficiency: 0.62,
              avgPrestige: 13.3,
            },
          ],
          summary: null,
          topCards: [],
          sections: {},
          insights: {},
        }}
      />,
    );

    expect(screen.getByLabelText(/focus player/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/opponent/i)).toBeInTheDocument();
    expect(screen.getByText("Nova")).toBeInTheDocument();
  });

  it("uses leaderboard-backed ELO values for the visible player filters", () => {
    render(
      <EloView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          sortKey: "elo",
          playerOptions: [
            { id: "p1", name: "Nova", label: "Nova", currentElo: 1111 },
            { id: "p2", name: "Vex", label: "Vex", currentElo: 999 },
          ],
          selectedPlayerId: "p1",
          selectedOpponentId: "p2",
          leaderboardRows: [
            {
              rank: 1,
              playerId: "p1",
              name: "Nova",
              currentElo: 1150,
              peakElo: 1180,
              confidence: 0.7,
              gamesPlayed: 12,
              wins: 8,
              losses: 4,
              score: 240,
              prestige: 160,
              efficiency: 0.62,
              avgPrestige: 13.3,
            },
            {
              rank: 2,
              playerId: "p2",
              name: "Vex",
              currentElo: 1110,
              peakElo: 1120,
              confidence: 0.6,
              gamesPlayed: 10,
              wins: 6,
              losses: 4,
              score: 210,
              prestige: 143,
              efficiency: 0.59,
              avgPrestige: 12.1,
            },
          ],
          summary: {
            playerId: "p1",
            name: "Nova",
            currentElo: 1150,
            peakElo: 1180,
            confidence: 0.7,
            gamesPlayed: 12,
            wins: 8,
            losses: 4,
            avgDelta: 6.4,
            bestDelta: 18,
            worstDelta: -12,
            recentForm: "WWWLW",
          },
          topCards: [],
          sections: {},
          insights: {},
        }}
      />,
    );

    expect(
      screen.getByRole("option", { name: "Nova — 1,150 ELO" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", { name: "Vex — 1,110 ELO" }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("option", { name: "Nova — 1,111 ELO" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("option", { name: "Vex — 999 ELO" }),
    ).toHaveLength(0);
  });

  it("rounds the summary rating instead of printing the raw payload float", () => {
    render(
      <EloView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          sortKey: "elo",
          playerOptions: [],
          selectedPlayerId: "p1",
          selectedOpponentId: null,
          leaderboardRows: [],
          summary: {
            playerId: "p1",
            name: "Nova",
            currentElo: 1487.3333333333333,
            peakElo: 1502.5,
            confidence: 0.7,
            gamesPlayed: 12,
            wins: 8,
            losses: 4,
            avgDelta: 6.4,
            bestDelta: 18,
            worstDelta: -12,
            recentForm: "LLLLW",
          },
          topCards: [],
          sections: {},
          insights: {},
        }}
      />,
    );

    expect(screen.getByText("1,487")).toBeInTheDocument();
    expect(screen.queryByText(/1487\.33/)).not.toBeInTheDocument();
    expect(screen.getByText("8W–4L")).toBeInTheDocument();
  });

  it("states the reading direction of the recent-form run", () => {
    render(
      <EloView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          sortKey: "elo",
          playerOptions: [],
          selectedPlayerId: "p1",
          selectedOpponentId: null,
          leaderboardRows: [],
          summary: {
            playerId: "p1",
            name: "Nova",
            currentElo: 1150,
            peakElo: 1180,
            confidence: 0.7,
            gamesPlayed: 12,
            wins: 8,
            losses: 4,
            avgDelta: 6.4,
            bestDelta: 18,
            worstDelta: -12,
            recentForm: "LLLLW",
          },
          topCards: [],
          sections: {},
          insights: {},
        }}
      />,
    );

    expect(screen.getByText(/most recent game is highlighted/i)).toBeInTheDocument();
    expect(screen.getByText("Last 5 games")).toBeInTheDocument();
  });
});
