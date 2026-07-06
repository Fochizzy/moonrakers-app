import assert from "node:assert/strict";

import { buildEloChartState } from "../components/charts/ELO/buildEloChartState.ts";

const modeHelpers = await import("../components/charts/ELO/eloChartModeHelpers.ts").catch(
  () => ({})
);

assert.equal(
  typeof modeHelpers.deriveActiveEloChartView,
  "function",
  "expected ELO mode helpers to export deriveActiveEloChartView",
);

assert.equal(
  typeof modeHelpers.buildEloModeInspectorCopy,
  "function",
  "expected ELO mode helpers to export buildEloModeInspectorCopy",
);

const chartState = buildEloChartState({
  primaryPlayerId: "a",
  players: [
    { id: "a", name: "Astra", color: "#A855F7" },
    { id: "b", name: "Bolt", color: "#3B82F6" },
    { id: "c", name: "Comet", color: "#22C55E" },
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
      players: [{ id: "a" }, { id: "c" }],
      eloSnapshot: { a: 1036, c: 1012 },
    },
  ],
});

const deltaView = modeHelpers.deriveActiveEloChartView(chartState, "eloDelta");
assert.equal(
  deltaView.seriesPaths.length,
  1,
  "expected Delta mode to render only the focused series",
);
assert.deepEqual(
  deltaView.seriesPaths[0]?.values,
  chartState.focusedMetricValues.eloDelta,
  "expected Delta mode to swap in focused delta values",
);
assert.deepEqual(
  deltaView.activeRange,
  chartState.modeRanges.eloDelta,
  "expected Delta mode to use the delta-specific range",
);

const gapView = modeHelpers.deriveActiveEloChartView(chartState, "matchupGap");
assert.equal(
  gapView.seriesPaths.length,
  1,
  "expected Gap mode to render only the focused series",
);
assert.deepEqual(
  gapView.seriesPaths[0]?.values,
  chartState.focusedMetricValues.matchupGap,
  "expected Gap mode to swap in focused matchup-gap values",
);
assert.deepEqual(
  gapView.activeRange,
  chartState.modeRanges.matchupGap,
  "expected Gap mode to use the matchup-gap range",
);

const deltaBaselineCopy = modeHelpers.buildEloModeInspectorCopy({
  selectedMode: "eloDelta",
  selectedIndex: 0,
  totalGames: chartState.games.length,
  focusedPeakValue: 1048,
  focusedDeltaValue: 0,
  selectedValue: 0,
});

assert.match(
  deltaBaselineCopy.helperText,
  /baseline/i,
  "expected the first Delta helper copy to mention the baseline state",
);
assert.match(
  deltaBaselineCopy.storyText,
  /no prior game/i,
  "expected the first Delta story copy to explain there is no prior game",
);
assert.doesNotMatch(
  deltaBaselineCopy.helperText,
  /prior result/i,
  "expected the first Delta helper copy not to imply a prior result exists",
);
assert.doesNotMatch(
  deltaBaselineCopy.storyText,
  /prior result/i,
  "expected the first Delta story copy not to imply a prior result exists",
);

const deltaFollowupCopy = modeHelpers.buildEloModeInspectorCopy({
  selectedMode: "eloDelta",
  selectedIndex: 1,
  totalGames: chartState.games.length,
  focusedPeakValue: 1048,
  focusedDeltaValue: 18,
  selectedValue: 18,
});

assert.match(
  deltaFollowupCopy.helperText,
  /prior result/i,
  "expected later Delta helper copy to compare against the prior result",
);
assert.match(
  deltaFollowupCopy.storyText,
  /prior result/i,
  "expected later Delta story copy to compare against the prior result",
);

console.log("elo-chart-mode-runtime.test.ts passed");
