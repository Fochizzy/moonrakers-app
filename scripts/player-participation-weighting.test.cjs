const assert = require("node:assert/strict");

require("./support/ts-require.cjs");

const {
  buildEloChartState,
} = require("../components/charts/ELO/buildEloChartState.ts");

// This used to also cover analytics/index.ts and utils/gameParticipation.ts.
// Both were unreachable from every screen and have been removed, so the live
// contract that remains is the ELO chart's own focused-player filtering.
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

console.log("player-participation-weighting.test.cjs passed");
