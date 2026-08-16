import { describe, expect, it } from "vitest";

import { toGameArchive } from "./gameArchive";

describe("toGameArchive", () => {
  it("orders games newest first and players alphabetically", () => {
    const archive = toGameArchive({
      games: [
        { id: "older", createdAt: 100, players: [], totals: {}, rounds: [] },
        { id: "newer", createdAt: 900, players: [], totals: {}, rounds: [] },
      ],
      players: [
        { id: "p2", name: "Zara" },
        { id: "p1", name: "Alix" },
      ],
      groups: [{ id: "g1", name: "Crew", playerIds: ["p1", "p2"] }],
    });

    expect(archive.games.map((game) => game.id)).toEqual(["newer", "older"]);
    expect(archive.players.map((player) => player.name)).toEqual([
      "Alix",
      "Zara",
    ]);
    expect(archive.groups[0]?.playerIds).toEqual(["p1", "p2"]);
  });

  it("keeps totals numeric and falls back to prestige when totalPrestige is absent", () => {
    const [game] = toGameArchive({
      games: [
        {
          id: "game-1",
          createdAt: 5,
          winnerId: "p1",
          players: [{ id: "p1", name: "Alix", startOrder: 0 }],
          totals: {
            p1: { prestige: 42, assists: "3", assistPrestigeBySource: { p2: "4" } },
          },
          rounds: [{ id: "r1", playerId: "p1", prestige: 7 }],
        },
      ],
    }).games;

    expect(game?.totals.p1?.totalPrestige).toBe(42);
    expect(game?.totals.p1?.assists).toBe(3);
    expect(game?.totals.p1?.assistPrestigeBySource).toEqual({ p2: 4 });
    expect(game?.roundCount).toBe(1);
    expect(game?.winnerId).toBe("p1");
  });

  it("drops rows that cannot be identified", () => {
    const archive = toGameArchive({
      games: [{ id: "" }, null, { id: "kept", players: [], totals: {} }],
      players: [{ id: "" }, { id: "p1", name: "" }],
      groups: [{ name: "No id" }],
    });

    expect(archive.games.map((game) => game.id)).toEqual(["kept"]);
    expect(archive.players).toEqual([
      { assignedCardArtIndex: null, color: null, id: "p1", name: "Player" },
    ]);
    expect(archive.groups).toEqual([]);
  });

  it("resolves the winner from legacy selected and manual winner fields", () => {
    const [game] = toGameArchive({
      games: [
        {
          id: "game-legacy",
          players: [],
          totals: {},
          selectedWinnerId: "p9",
        },
      ],
    }).games;

    expect(game?.winnerId).toBe("p9");
  });
});
