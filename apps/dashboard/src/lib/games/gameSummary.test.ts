import { describe, expect, it } from "vitest";

import type {
  ArchiveGame,
  ArchivePlayerTotals,
} from "@/lib/data/gameArchiveTypes";

import { buildGameSummary } from "./gameSummary";
import { buildGameTrends } from "./gameTrends";

function totals(overrides: Partial<ArchivePlayerTotals>): ArchivePlayerTotals {
  return {
    assistPrestigeBySource: {},
    assistPrestigeReceived: 0,
    assistPrestigeSent: 0,
    assists: 0,
    contracts: 0,
    directPrestige: 0,
    efficiency: 0,
    failures: 0,
    objectiveCount: 0,
    objectivePrestige: 0,
    performance: 0,
    score: 0,
    totalPrestige: 0,
    ...overrides,
  };
}

const GAME: ArchiveGame = {
  createdAt: 1_000,
  groupId: null,
  groupName: "Crew",
  hostProfileId: "p1",
  id: "game-1",
  players: [
    { id: "p1", name: "Alix", color: "#f00", assignedCardArtIndex: null, startOrder: 1 },
    { id: "p2", name: "Bo", color: "#0f0", assignedCardArtIndex: null, startOrder: 0 },
  ],
  roundCount: 3,
  rounds: [
    {
      assistPrestigeRecipients: { p2: 2 },
      assistRecipients: { p2: 1 },
      contracts: 1,
      createdAt: 1,
      failures: 0,
      id: "r1",
      objectiveCount: 0,
      objectivePrestige: 0,
      playerId: "p1",
      prestige: 5,
    },
    {
      assistPrestigeRecipients: {},
      assistRecipients: {},
      contracts: 0,
      createdAt: 2,
      failures: 1,
      id: "r2",
      objectiveCount: 0,
      objectivePrestige: 0,
      playerId: "p2",
      prestige: 9,
    },
    {
      assistPrestigeRecipients: {},
      assistRecipients: {},
      contracts: 1,
      createdAt: 3,
      failures: 0,
      id: "r3",
      objectiveCount: 1,
      objectivePrestige: 1,
      playerId: "p1",
      prestige: 6,
    },
  ],
  totals: {
    p1: totals({ contracts: 2, assists: 1, totalPrestige: 12, score: 20, directPrestige: 11 }),
    p2: totals({ failures: 1, totalPrestige: 9, score: 9, directPrestige: 9 }),
  },
  winnerId: "p1",
};

describe("buildGameSummary", () => {
  it("ranks players by prestige and marks the winner", () => {
    const summary = buildGameSummary(GAME);

    expect(summary.standings.map((row) => [row.name, row.rank])).toEqual([
      ["Alix", 1],
      ["Bo", 2],
    ]);
    expect(summary.standings[0]?.isWinner).toBe(true);
    expect(summary.winnerName).toBe("Alix");
  });

  it("summarises highlights from the resolved totals", () => {
    const summary = buildGameSummary(GAME);

    expect(summary.highlights).toEqual([
      { label: "Top Prestige", name: "Alix", detail: "12 prestige" },
      { label: "Most Contracts", name: "Alix", detail: "2 contracts" },
      { label: "Most Assists", name: "Alix", detail: "1 assists" },
    ]);
  });

  it("builds replay rows in play order with assists summed from the round maps", () => {
    const summary = buildGameSummary(GAME);

    expect(summary.replayRows.map((row) => row.step)).toEqual([1, 2, 3]);
    expect(summary.replayRows[0]).toMatchObject({
      assistPrestigeSent: 2,
      assistsGiven: 1,
      playerName: "Alix",
      prestige: 5,
    });
  });

  it("flags a game that saved no winner instead of crowning the leader", () => {
    // History shows "No winner recorded" for this same game, so the summary
    // must not present the top-prestige player as the winner.
    const summary = buildGameSummary({
      ...GAME,
      winnerId: null,
      players: GAME.players.map((player) => ({ ...player })),
    });

    expect(summary.hasRecordedWinner).toBe(false);
    expect(summary.standings.every((row) => !row.isWinner)).toBe(true);
    expect(summary.winnerName).toBe("Alix");
    expect(summary.topPrestige).toBe(12);
  });

  it("reports a recorded winner alongside their prestige", () => {
    const summary = buildGameSummary(GAME);

    expect(summary.hasRecordedWinner).toBe(true);
    expect(summary.topPrestige).toBe(12);
  });
});

describe("buildGameTrends", () => {
  it("orders seat rows by start order", () => {
    const trends = buildGameTrends(GAME);

    expect(trends.seatRows.map((row) => [row.name, row.seat])).toEqual([
      ["Bo", 1],
      ["Alix", 2],
    ]);
  });

  it("derives contract success rates and leaves attempt-free players at zero", () => {
    const trends = buildGameTrends(GAME);
    const alix = trends.contractRows.find((row) => row.name === "Alix");
    const bo = trends.contractRows.find((row) => row.name === "Bo");

    expect(alix).toMatchObject({ attempts: 2, successRate: 1 });
    expect(bo).toMatchObject({ attempts: 1, successRate: 0 });
  });

  it("lists contract rows by name while seat rows keep turn order", () => {
    const trends = buildGameTrends(GAME);

    // Bo is seated first, so seat order and name order disagree here.
    expect(trends.seatRows.map((row) => row.name)).toEqual(["Bo", "Alix"]);
    expect(trends.contractRows.map((row) => row.name)).toEqual(["Alix", "Bo"]);
  });

  it("tracks the running leader after every round", () => {
    const trends = buildGameTrends(GAME);

    expect(trends.predictionRows.map((row) => row.projectedWinnerName)).toEqual([
      "Alix",
      "Bo",
      "Alix",
    ]);
    expect(trends.predictionRows.map((row) => row.correct)).toEqual([
      true,
      false,
      true,
    ]);
    expect(trends.prestigeTrend.at(-1)?.values).toEqual({ p1: 11, p2: 9 });
    expect(trends.predictionAccuracy).toBeCloseTo(2 / 3);
  });
});
