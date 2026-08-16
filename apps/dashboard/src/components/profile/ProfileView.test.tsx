import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileView } from "./ProfileView";

const basePayload = {
  generatedAt: "2026-07-04T03:00:00.000Z",
  selectedPlayerId: "p1",
  selectedOpponentId: null,
  playerOptions: [{ id: "p1", name: "Nova", label: "Nova" }],
  hero: {
    id: "p1",
    name: "Nova",
    currentElo: 1150.333333,
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
  recentGames: [],
};

const recentGame = {
  id: "g1",
  gameId: "g1",
  groupName: "Wake Up!",
  finishedAt: "2026-08-16T08:14:47.855035+00:00",
  winnerId: "p1",
  players: [
    {
      id: "p1",
      name: "Nova",
      color: "purple",
      isWinner: true,
      totalPrestige: 14,
    },
    {
      id: "p2",
      name: "Vex",
      color: "blue",
      isWinner: false,
      totalPrestige: 9,
    },
  ],
};

describe("ProfileView", () => {
  it("keeps compare as a first-class action", () => {
    render(<ProfileView payload={basePayload} />);

    expect(screen.getByRole("link", { name: /compare nova/i })).toBeInTheDocument();
  });

  it("rounds the rating rather than printing the raw payload float", () => {
    render(<ProfileView payload={basePayload} />);

    expect(screen.getByText("1,150")).toBeInTheDocument();
    expect(screen.queryByText(/1150\.33/)).not.toBeInTheDocument();
  });

  it("renders the roster and result of each recent game", () => {
    render(
      <ProfileView payload={{ ...basePayload, recentGames: [recentGame] }} />,
    );

    expect(screen.getByText("Won with 14")).toBeInTheDocument();
    expect(screen.getByText("Vex")).toBeInTheDocument();
    expect(
      screen.queryByText(/Published recent-game detail/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Summary" })).toHaveAttribute(
      "href",
      "/summary/g1",
    );
  });

  it("hides sections that only repeat the hero metrics", () => {
    render(
      <ProfileView
        payload={{
          ...basePayload,
          tabs: {
            rating: {
              title: "Rating Profile",
              cards: [
                { key: "current-elo", label: "Current ELO", value: "1150" },
                { key: "peak-elo", label: "Peak ELO", value: "1180" },
              ],
            },
            projection: {
              title: "Projection Window",
              cards: [
                { key: "next-win", label: "Next Win ELO", value: "1170" },
              ],
            },
          },
        }}
      />,
    );

    expect(screen.queryByText("Rating Profile")).not.toBeInTheDocument();
    expect(screen.getByText("Projection Window")).toBeInTheDocument();
    expect(screen.getByText("Next Win ELO")).toBeInTheDocument();
  });
});
