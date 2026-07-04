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
});
