import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileView } from "./ProfileView";

describe("ProfileView", () => {
  it("keeps compare as a first-class action and shows recent games", () => {
    render(
      <ProfileView
        payload={{
          generatedAt: "2026-07-04T03:00:00.000Z",
          selectedPlayerId: "p1",
          selectedOpponentId: null,
          playerOptions: [{ id: "p1", name: "Nova", label: "Nova" }],
          hero: {
            id: "p1",
            name: "Nova",
            currentElo: 1150,
            peakElo: 1180,
            winRate: 0.61,
            totalWins: 11,
            totalGames: 18,
          },
          quickActions: { compareLabel: "Compare Nova" },
          topCards: [],
          activeInsight: null,
          profileInsight: null,
          tabs: {},
          moonrakersIntel: null,
          opponentOptions: [],
          topOpponentOptions: [],
          recentGames: [{ id: "g1", label: "Vs Vex", result: "Win" }],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /compare nova/i })).toBeInTheDocument();
    expect(screen.getByText(/Vs Vex/i)).toBeInTheDocument();
  });
});
