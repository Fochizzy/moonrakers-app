import { describe, expect, it } from "vitest";

import type { ArchiveGame } from "@/lib/data/gameArchiveTypes";

import {
  buildHistoryRows,
  filterHistoryRows,
  listHistoryGroupNames,
  sortHistoryRows,
} from "./historyRows";

function game(overrides: Partial<ArchiveGame> & { id: string }): ArchiveGame {
  return {
    createdAt: 0,
    groupId: null,
    groupName: null,
    hostProfileId: null,
    players: [],
    roundCount: 0,
    rounds: [],
    totals: {},
    winnerId: null,
    ...overrides,
  };
}

const GAMES: ArchiveGame[] = [
  game({
    id: "g-old",
    createdAt: 100,
    groupName: "Crew",
    roundCount: 6,
    winnerId: "p1",
    players: [
      { id: "p1", name: "Alix", color: "#f00", assignedCardArtIndex: null, startOrder: 0 },
      { id: "p2", name: "Bo", color: null, assignedCardArtIndex: null, startOrder: 1 },
    ],
    totals: {
      p1: {
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
        totalPrestige: 31,
      },
    },
  }),
  game({
    id: "g-new",
    createdAt: 900,
    roundCount: 9,
    winnerId: "p2",
    players: [
      { id: "p2", name: "Bo", color: null, assignedCardArtIndex: null, startOrder: 0 },
      { id: "p3", name: "Cy", color: null, assignedCardArtIndex: null, startOrder: 1 },
    ],
  }),
];

describe("buildHistoryRows", () => {
  it("numbers games oldest-first so archive ordinals stay stable", () => {
    const rows = buildHistoryRows(GAMES, "p1");

    expect(rows.map((row) => [row.id, row.ordinal])).toEqual([
      ["g-old", 1],
      ["g-new", 2],
    ]);
  });

  it("marks the winner and reads their prestige from game totals", () => {
    const [oldest] = buildHistoryRows(GAMES, "p1");

    expect(oldest?.winnerName).toBe("Alix");
    expect(oldest?.winnerPrestige).toBe(31);
    expect(oldest?.players.find((player) => player.id === "p1")?.isWinner).toBe(
      true,
    );
  });

  it("flags which archived games the signed-in player took part in", () => {
    const rows = buildHistoryRows(GAMES, "p3");

    expect(
      rows.map((row) => [row.id, row.includesSignedInPlayer]),
    ).toEqual([
      ["g-old", false],
      ["g-new", true],
    ]);
  });
});

describe("history filtering and sorting", () => {
  const rows = buildHistoryRows(GAMES, "p1");

  it("lists only named groups", () => {
    expect(listHistoryGroupNames(rows)).toEqual(["Crew"]);
  });

  it("keeps only grouped games under the group filter", () => {
    const filtered = filterHistoryRows({
      dateLabelFor: () => "",
      filter: "group",
      groupName: "all",
      query: "",
      rows,
    });

    expect(filtered.map((row) => row.id)).toEqual(["g-old"]);
  });

  it("keeps only the signed-in player's games under the mine filter", () => {
    const filtered = filterHistoryRows({
      dateLabelFor: () => "",
      filter: "mine",
      groupName: "all",
      query: "",
      rows,
    });

    expect(filtered.map((row) => row.id)).toEqual(["g-old"]);
  });

  it("searches across winner, participants, group, and date text", () => {
    const byParticipant = filterHistoryRows({
      dateLabelFor: () => "",
      filter: "all",
      groupName: "all",
      query: "cy",
      rows,
    });
    const byDate = filterHistoryRows({
      dateLabelFor: (row) => (row.id === "g-new" ? "Aug 13, 2026" : ""),
      filter: "all",
      groupName: "all",
      query: "aug 13",
      rows,
    });

    expect(byParticipant.map((row) => row.id)).toEqual(["g-new"]);
    expect(byDate.map((row) => row.id)).toEqual(["g-new"]);
  });

  it("orders rows by each supported sort", () => {
    expect(sortHistoryRows(rows, "newest").map((row) => row.id)).toEqual([
      "g-new",
      "g-old",
    ]);
    expect(sortHistoryRows(rows, "oldest").map((row) => row.id)).toEqual([
      "g-old",
      "g-new",
    ]);
    expect(sortHistoryRows(rows, "winner").map((row) => row.id)).toEqual([
      "g-old",
      "g-new",
    ]);
    expect(sortHistoryRows(rows, "rounds").map((row) => row.id)).toEqual([
      "g-new",
      "g-old",
    ]);
  });
});
