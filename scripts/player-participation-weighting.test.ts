import assert from "node:assert/strict";

import { buildExpectedOutcome } from "../analytics/index.ts";
import { buildEloChartState } from "../components/charts/ELO/buildEloChartState.ts";
import { filterGamesForFocusedPlayer } from "../utils/gameParticipation.ts";

const games = [
  {
    id: "g1",
    createdAt: 1,
    winnerId: "a",
    players: [{ id: "a" }, { id: "b" }],
    totals: {
      a: { totalPrestige: 20 },
      b: { totalPrestige: 15 },
    },
  },
  {
    id: "g2",
    createdAt: 2,
    winnerId: "c",
    players: [{ id: "c" }, { id: "d" }],
    totals: {
      c: { totalPrestige: 19 },
      d: { totalPrestige: 12 },
    },
  },
  {
    id: "g3",
    createdAt: 3,
    winnerId: "a",
    players: [{ id: "a" }, { id: "c" }],
    totals: {
      a: { totalPrestige: 18 },
      c: { totalPrestige: 17 },
    },
  },
];

const filteredGames = filterGamesForFocusedPlayer(games, "a");

assert.deepEqual(
  filteredGames.map((game) => game.id),
  ["g1", "g3"],
  "expected focused-player filtering to ignore games the player did not join",
);

const eloChartState = buildEloChartState({
  games,
  players: [
    { id: "a", name: "Astra" },
    { id: "b", name: "Bolt" },
    { id: "c", name: "Comet" },
    { id: "d", name: "Drift" },
  ],
  primaryPlayerId: "a",
});

assert.deepEqual(
  eloChartState.games.map((game) => game.id),
  ["g1", "g3"],
  "expected focused ELO history to ignore unrelated games",
);

const leaderboard = [
  {
    id: "a",
    name: "Astra",
    rating: 1040,
    gamesPlayed: 2,
    delta: 40,
    wins: 2,
    prestigeTotal: 38,
    winRate: 100,
    avgPrestige: 19,
    recentForm: 3,
    series: [
      { x: 1, y: 1012 },
      { x: 2, y: 1040 },
    ],
  },
  {
    id: "b",
    name: "Bolt",
    rating: 990,
    gamesPlayed: 1,
    delta: -10,
    wins: 0,
    prestigeTotal: 15,
    winRate: 0,
    avgPrestige: 15,
    recentForm: 1,
    series: [{ x: 1, y: 990 }],
  },
];

const expectedOutcome = buildExpectedOutcome({
  player: leaderboard[0] as any,
  leaderboard: leaderboard as any,
});

assert.equal(
  expectedOutcome.confidence,
  "low",
  "expected confidence to stay tied to the player's own sample instead of league-wide game count",
);

console.log("player-participation-weighting.test.ts passed");
