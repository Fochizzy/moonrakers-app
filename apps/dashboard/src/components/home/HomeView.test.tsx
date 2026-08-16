import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeView } from "./HomeView";

const payload = {
  generatedAt: "2026-07-04T03:00:00.000Z",
  hero: { players: 4, games: 18, views: 5 },
  cards: [
    {
      key: "win-rate",
      label: "Win Rate",
      value: "61%",
      detail: "Share of finished games won.",
    },
  ],
};

const recentGames = [
  {
    createdAt: 1751598000000,
    groupName: "Wake Up!",
    id: "game-1",
    includesSignedInPlayer: true,
    margin: 3,
    ordinal: 18,
    players: [
      {
        color: "purple",
        id: "nova",
        isWinner: true,
        name: "Nova",
        totalPrestige: 15,
      },
      {
        color: "blue",
        id: "vex",
        isWinner: false,
        name: "Vex",
        totalPrestige: 11,
      },
    ],
    roundCount: 22,
    winnerName: "Nova",
    winnerPrestige: 15,
  },
];

describe("HomeView", () => {
  it("labels the analytics hero cards published by the server payload", () => {
    render(
      <HomeView
        focusName="Nova"
        leaderboardRows={[]}
        payload={payload}
        recentGames={[]}
        summary={null}
        totalGames={0}
      />,
    );

    expect(screen.getByText("Nova")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
    expect(screen.getByText("Share of finished games won.")).toBeInTheDocument();
  });

  it("leads with the latest saved game instead of a second hub tile list", () => {
    render(
      <HomeView
        focusName="Nova"
        leaderboardRows={[]}
        payload={payload}
        recentGames={recentGames}
        summary={null}
        totalGames={18}
      />,
    );

    expect(
      screen.getByText(/Nova took the last table with 15 prestige/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Nova won with 15")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /all games/i })).toBeInTheDocument();
  });

  it("marks the newest result in the recent-form run", () => {
    render(
      <HomeView
        focusName="Nova"
        leaderboardRows={[]}
        payload={payload}
        recentGames={[]}
        summary={{
          playerId: "nova",
          name: "Nova",
          currentElo: 819,
          peakElo: 1000,
          confidence: 1,
          gamesPlayed: 19,
          wins: 2,
          losses: 17,
          avgDelta: -9.5,
          bestDelta: 21,
          worstDelta: -16,
          recentForm: "LLLLW",
        }}
        totalGames={19}
      />,
    );

    expect(screen.getByText("2W–17L lifetime")).toBeInTheDocument();
    expect(screen.getByText(/Most recent game on the right/i)).toBeInTheDocument();
  });
});
