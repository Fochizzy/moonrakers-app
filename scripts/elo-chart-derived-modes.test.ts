import assert from "node:assert/strict";

import { buildEloChartState } from "../components/charts/ELO/buildEloChartState.ts";

const chartState = buildEloChartState({
  primaryPlayerId: "a",
  players: [
    { id: "a", name: "Astra", color: "#A855F7" },
    { id: "b", name: "Bolt", color: "#3B82F6" },
    { id: "c", name: "Comet", color: "#22C55E" },
    { id: "d", name: "Drift", color: "#F97316" },
  ],
  games: [
    {
      id: "g1",
      createdAt: 1,
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      eloSnapshot: { a: 1030, b: 1000, c: 980 },
    },
    {
      id: "g2",
      createdAt: 2,
      players: [{ id: "a" }, { id: "b" }],
      eloSnapshot: { a: 1048, b: 1005 },
    },
    {
      id: "g3",
      createdAt: 3,
      players: [{ id: "a" }, { id: "c" }, { id: "d" }],
      eloSnapshot: { a: 1036, c: 1012, d: 1008 },
    },
    {
      id: "g4",
      createdAt: 4,
      players: [{ id: "b" }, { id: "c" }],
      eloSnapshot: { b: 1020, c: 1002 },
    },
  ],
});

assert.deepEqual(
  chartState.games.map((game) => game.id),
  ["g1", "g2", "g3"],
  "expected focused-player ELO history to ignore games the player did not join",
);

assert.deepEqual(
  chartState.eloSeriesPaths.find((row) => row.id === "a")?.values,
  [1030, 1048, 1036],
  "expected the absolute ELO series to keep the focused player's post-game snapshots",
);

assert.deepEqual(
  chartState.focusedMetricValues.eloDelta,
  [0, 18, -12],
  "expected Delta mode to track game-to-game ELO movement",
);

assert.deepEqual(
  chartState.focusedMetricValues.matchupGap,
  [40, 43, 26],
  "expected Gap mode to subtract the average opponent ELO from the focused player's ELO",
);

assert.equal(
  chartState.modeRanges.matchupGap.minValue < 26,
  true,
  "expected matchup gap range padding to extend below the smallest gap",
);

assert.equal(
  chartState.modeRanges.matchupGap.maxValue > 43,
  true,
  "expected matchup gap range padding to extend above the largest gap",
);

console.log("elo-chart-derived-modes.test.ts passed");
