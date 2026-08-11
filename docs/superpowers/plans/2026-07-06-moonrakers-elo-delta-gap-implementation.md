# Moonrakers ELO Delta And Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ELO`, `Delta`, and `Gap` modes to the Moonrakers ELO chart so the focused player can inspect absolute rating, game-by-game rating change, and matchup gap against each game's average opponent ELO without leaving the chart.

**Architecture:** Keep `components/charts/ELO/buildEloChartState.ts` as the derivation boundary for focused-game filtering, snapshot normalization, and mode-specific values. Let `components/charts/ELO/EloChart.tsx` own the selected mode and choose the active rendered series, while `components/charts/ELO/EloChartPlot.tsx` stays presentation-focused by rendering the mode rail, plotting the chosen data, and updating legend and inspector copy.

**Tech Stack:** React Native, TypeScript, `react-native-svg`, repo-local Node script tests, `npm.cmd`

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-chart-derived-modes.test.ts`
  - Runtime regression for focused-game filtering, delta derivation, and matchup-gap averaging.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-chart-mode-rail.test.cjs`
  - Source guard for local selected-mode state, mode tabs, and mode-aware plot handling.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ELO\buildEloChartState.ts`
  - Add focused-player delta/gap derivation, per-mode ranges, and chart-mode metadata.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ELO\EloChart.tsx`
  - Add local selected-mode state and choose the correct rendered series/range for the plot.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ELO\EloChartPlot.tsx`
  - Render the `ELO` / `Delta` / `Gap` rail and switch legend/inspector behavior by mode.

## Task 1: Lock The ELO Delta And Gap Behavior With Failing Tests

**Files:**
- Create: `scripts/elo-chart-derived-modes.test.ts`
- Create: `scripts/elo-chart-mode-rail.test.cjs`

- [ ] **Step 1: Write the failing derived-series test**

```ts
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
```

- [ ] **Step 2: Write the failing mode-rail source guard**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

const eloChartSource = read(path.join("components", "charts", "ELO", "EloChart.tsx"));
const eloChartPlotSource = read(
  path.join("components", "charts", "ELO", "EloChartPlot.tsx"),
);

assert.match(
  eloChartSource,
  /const \[selectedMode,\s*setSelectedMode\] = useState<[^>]+>\(DEFAULT_ELO_MODE\);/,
  "expected the ELO chart container to own local selected-mode state",
);

assert.match(
  eloChartSource,
  /selectedMode === "elo"[\s\S]*chartState\.eloSeriesPaths[\s\S]*chartState\.focusedMetricValues\.eloDelta[\s\S]*chartState\.focusedMetricValues\.matchupGap/,
  "expected the ELO chart container to map ELO, Delta, and Gap onto the rendered series",
);

assert.match(
  eloChartPlotSource,
  /ChartUnderlineTabs/,
  "expected the ELO plot to render an in-chart mode rail",
);

assert.match(
  eloChartPlotSource,
  /label:\s*"ELO"[\s\S]*label:\s*"Delta"[\s\S]*label:\s*"Gap"/,
  "expected the mode rail to expose ELO, Delta, and Gap tabs",
);

assert.match(
  eloChartPlotSource,
  /selectedMode === "eloDelta"|case "eloDelta"/,
  "expected the ELO plot to branch on Delta mode",
);

assert.match(
  eloChartPlotSource,
  /selectedMode === "matchupGap"|case "matchupGap"/,
  "expected the ELO plot to branch on Gap mode",
);

console.log("elo-chart-mode-rail.test.cjs passed");
```

- [ ] **Step 3: Run the new tests and confirm they fail for the right reason**

Run: `node scripts/elo-chart-derived-modes.test.ts`
Expected: FAIL because `eloSeriesPaths`, `focusedMetricValues`, or `modeRanges.matchupGap` are not implemented yet

Run: `node scripts/elo-chart-mode-rail.test.cjs`
Expected: FAIL because `EloChart.tsx` does not yet own selected-mode state and `EloChartPlot.tsx` does not yet render the mode rail

- [ ] **Step 4: Commit the failing-test guard**

```bash
git add scripts/elo-chart-derived-modes.test.ts scripts/elo-chart-mode-rail.test.cjs
git commit -m "test: guard elo delta and matchup gap modes"
```

## Task 2: Extend The ELO State Builder With Delta And Matchup Gap Derivation

**Files:**
- Modify: `components/charts/ELO/buildEloChartState.ts`
- Test: `scripts/elo-chart-derived-modes.test.ts`

- [ ] **Step 1: Add explicit chart-mode metadata and state fields**

```ts
export const ELO_CHART_MODE_OPTIONS = [
  { key: "elo", label: "ELO" },
  { key: "eloDelta", label: "Delta" },
  { key: "matchupGap", label: "Gap" },
] as const;

export type EloChartMode =
  | "elo"
  | "eloDelta"
  | "matchupGap";

export type EloChartState = {
  games: EloChartGame[];
  players: EloChartPlayer[];
  eloSeriesPaths: EloChartSeries[];
  focusedPlayerId: string | null;
  focusedSeries: EloChartSeries | null;
  focusedMetricValues: {
    eloValues: number[];
    eloDelta: number[];
    matchupGap: number[];
  };
  modeRanges: Record<EloChartMode, { minValue: number; maxValue: number }>;
  selectedIndex: number;
  selectedMode: EloChartMode;
};
```

- [ ] **Step 2: Add helpers for opponent averaging and focused-mode derivation**

```ts
function average(values: number[]) {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (!safeValues.length) return 0;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function buildFocusedMetricValues(args: {
  games: EloChartGame[];
  focusedPlayerId: string | null;
  eloSeriesPaths: EloChartSeries[];
  playerIds: string[];
}) {
  const focusedSeries =
    args.eloSeriesPaths.find((row) => row.id === args.focusedPlayerId) ?? null;
  const eloValues = focusedSeries?.values ?? [];

  const eloDelta = eloValues.map((value, index) =>
    index === 0 ? 0 : value - (eloValues[index - 1] ?? 0),
  );

  const matchupGap = args.games.map((game, index) => {
    if (!args.focusedPlayerId) {
      return 0;
    }

    const participantIds = getGameParticipantIds(game, args.playerIds).filter(
      (playerId) => playerId !== args.focusedPlayerId,
    );

    const opponentElos = participantIds.map((playerId) =>
      getEloValue(game?.eloSnapshot?.[playerId]),
    );

    const focusedElo =
      eloValues[index] ?? getEloValue(game?.eloSnapshot?.[args.focusedPlayerId]);

    return focusedElo - average(opponentElos);
  });

  return {
    focusedSeries,
    focusedMetricValues: {
      eloValues,
      eloDelta,
      matchupGap,
    },
  };
}
```

- [ ] **Step 3: Return per-mode ranges from the main state builder**

```ts
const eloSeriesPaths = players.map((player, index) => ({
  id: player.id,
  name: normalizeName(player.name, `Player ${index + 1}`),
  colorValue: getColorValue(player.color, index),
  values: games.map((game) => getEloValue(game?.eloSnapshot?.[player.id])),
  isFocused: player.id === focusedPlayerId,
}));

const { focusedSeries, focusedMetricValues } = buildFocusedMetricValues({
  games,
  focusedPlayerId,
  eloSeriesPaths,
  playerIds: players.map((player) => player.id),
});

const modeRanges = {
  elo: buildRange(eloSeriesPaths.flatMap((row) => row.values)),
  eloDelta: buildRange(focusedMetricValues.eloDelta),
  matchupGap: buildRange(focusedMetricValues.matchupGap),
};

return {
  games,
  players,
  eloSeriesPaths,
  focusedPlayerId,
  focusedSeries,
  focusedMetricValues,
  modeRanges,
  selectedIndex: games.length > 0 ? games.length - 1 : 0,
  selectedMode: DEFAULT_ELO_MODE,
};
```

- [ ] **Step 4: Run the derived-series test and make it pass**

Run: `node scripts/elo-chart-derived-modes.test.ts`
Expected: PASS with `elo-chart-derived-modes.test.ts passed`

- [ ] **Step 5: Commit the state-builder slice**

```bash
git add components/charts/ELO/buildEloChartState.ts scripts/elo-chart-derived-modes.test.ts
git commit -m "feat: derive elo delta and matchup gap series"
```

## Task 3: Add Local Selected-Mode State In The ELO Chart Container

**Files:**
- Modify: `components/charts/ELO/EloChart.tsx`
- Test: `scripts/elo-chart-mode-rail.test.cjs`

- [ ] **Step 1: Import the mode metadata and create local selected-mode state**

```ts
import {
  DEFAULT_ELO_MODE,
  ELO_CHART_MODE_OPTIONS,
  buildEloChartState,
  type EloChartGame,
  type EloChartMode,
  type EloChartPlayer,
} from "./buildEloChartState";

const [selectedMode, setSelectedMode] = useState<EloChartMode>(DEFAULT_ELO_MODE);
```

- [ ] **Step 2: Compute the active rendered series and range from the selected mode**

```ts
const activeSeriesPaths = useMemo(() => {
  if (selectedMode === "elo") {
    return chartState.eloSeriesPaths;
  }

  if (!chartState.focusedSeries) {
    return [];
  }

  return [
    {
      ...chartState.focusedSeries,
      values:
        selectedMode === "eloDelta"
          ? chartState.focusedMetricValues.eloDelta
          : chartState.focusedMetricValues.matchupGap,
    },
  ];
}, [chartState, selectedMode]);

const activeRange = chartState.modeRanges[selectedMode];
```

- [ ] **Step 3: Pass the selected mode, mode options, and active series to the plot**

```tsx
<EloChartPlot
  games={chartState.games as any}
  seriesPaths={activeSeriesPaths as any}
  selectedIndex={selectedIndex}
  selectedMode={selectedMode}
  modeOptions={ELO_CHART_MODE_OPTIONS as any}
  onChangeMode={setSelectedMode}
  minValue={activeRange.minValue}
  maxValue={activeRange.maxValue}
  onSelectGame={setSelectedIndex}
  focusedPlayerId={chartState.focusedPlayerId ?? undefined}
/>
```

- [ ] **Step 4: Run the source guard to confirm the container owns the mode**

Run: `node scripts/elo-chart-mode-rail.test.cjs`
Expected: PASS for the selected-mode state and active-series mapping assertions

- [ ] **Step 5: Commit the container slice**

```bash
git add components/charts/ELO/EloChart.tsx scripts/elo-chart-mode-rail.test.cjs
git commit -m "feat: add local elo chart mode selection"
```

## Task 4: Render The Mode Rail And Mode-Aware Plot Behavior

**Files:**
- Modify: `components/charts/ELO/EloChartPlot.tsx`
- Test: `scripts/elo-chart-mode-rail.test.cjs`
- Test: `scripts/multi-player-line-legend-focus.test.cjs`
- Test: `scripts/line-series-identity-wiring.test.cjs`

- [ ] **Step 1: Update the plot props and import the shared tabs**

```ts
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import Text from "@/components/ui/Text";
import {
  type EloChartMode,
} from "./buildEloChartState";

type Props = {
  games?: Game[];
  seriesPaths?: RenderSeries[];
  selectedIndex: number;
  selectedMode: EloChartMode;
  modeOptions?: Array<{ key: EloChartMode; label: string }>;
  onChangeMode?: (mode: EloChartMode) => void;
  minValue: number;
  maxValue: number;
  onSelectGame?: (index: number) => void;
  focusedPlayerId?: string;
  glowColor?: string;
};
```

- [ ] **Step 2: Add a mode-aware formatter and inspector copy**

```ts
function formatModeValue(value: number, mode: EloChartMode) {
  if (mode === "matchupGap") {
    return `${value > 0 ? "+" : ""}${value.toFixed(0)}`;
  }

  return formatValue(value, mode === "eloDelta" ? "eloDelta" : "elo");
}

function buildInspectorStory(args: {
  selectedMode: EloChartMode;
  focusedPeakValue: number;
  focusedDeltaValue: number;
  selectedFocusedValue: number;
}) {
  if (args.selectedMode === "eloDelta") {
    return `Game change ${formatModeValue(args.selectedFocusedValue, "eloDelta")} | Peak ${formatModeValue(args.focusedPeakValue, "elo")}`;
  }

  if (args.selectedMode === "matchupGap") {
    return `Gap vs opponents ${formatModeValue(args.selectedFocusedValue, "matchupGap")} | Peak ${formatModeValue(args.focusedPeakValue, "elo")}`;
  }

  return `Peak ${formatModeValue(args.focusedPeakValue, "elo")} | Delta ${formatModeValue(args.focusedDeltaValue, "eloDelta")}`;
}
```

- [ ] **Step 3: Render the in-chart mode rail and keep ELO-only legend breadth**

```tsx
{modeOptions?.length ? (
  <ChartUnderlineTabs
    items={modeOptions.map((option) => ({
      key: option.key,
      label: option.label,
    }))}
    activeKey={selectedMode}
    onChange={(key) => onChangeMode?.(key as EloChartMode)}
  />
) : null}
```

```ts
const legendRows =
  selectedMode === "elo"
    ? selectedValues
    : selectedValues.filter((entry) => entry.id === focusedRow?.id);
```

- [ ] **Step 4: Swap the visible formatter calls to the mode-aware helper**

```tsx
{formatModeValue(tick, selectedMode)}
```

```tsx
{formatModeValue(
  asArray(focusedRow.points)[safeSelectedIndex]?.value ?? 0,
  selectedMode,
)}
```

```tsx
<Text style={styles.inspectorStory}>
  {buildInspectorStory({
    selectedMode,
    focusedPeakValue,
    focusedDeltaValue,
    selectedFocusedValue:
      asArray(focusedRow.points)[safeSelectedIndex]?.value ?? 0,
  })}
</Text>
```

- [ ] **Step 5: Run the touched plot guards**

Run: `node scripts/elo-chart-mode-rail.test.cjs`
Expected: PASS with `elo-chart-mode-rail.test.cjs passed`

Run: `node scripts/multi-player-line-legend-focus.test.cjs`
Expected: PASS with `multi-player-line-legend-focus.test.cjs passed`

Run: `node scripts/line-series-identity-wiring.test.cjs`
Expected: PASS with `line-series-identity-wiring.test.cjs passed`

- [ ] **Step 6: Commit the plot slice**

```bash
git add components/charts/ELO/EloChartPlot.tsx scripts/elo-chart-mode-rail.test.cjs
git commit -m "feat: add elo chart delta and gap tabs"
```

## Task 5: Final Verification

**Files:**
- Modify: `components/charts/ELO/buildEloChartState.ts` only if a focused regression appears
- Modify: `components/charts/ELO/EloChart.tsx` only if mode-state wiring regresses
- Modify: `components/charts/ELO/EloChartPlot.tsx` only if legend or inspector output regresses

- [ ] **Step 1: Run the new focused ELO tests**

Run: `node scripts/elo-chart-derived-modes.test.ts`
Expected: PASS with `elo-chart-derived-modes.test.ts passed`

Run: `node scripts/elo-chart-mode-rail.test.cjs`
Expected: PASS with `elo-chart-mode-rail.test.cjs passed`

- [ ] **Step 2: Run the touched source guards**

Run: `node scripts/multi-player-line-legend-focus.test.cjs`
Expected: PASS with `multi-player-line-legend-focus.test.cjs passed`

Run: `node scripts/line-series-identity-wiring.test.cjs`
Expected: PASS with `line-series-identity-wiring.test.cjs passed`

- [ ] **Step 3: Run lint and typecheck for the touched TypeScript chart files**

Run: `npm.cmd run lint`
Expected: exit `0` with no warnings printed for the touched files

Run: `npm.cmd run typecheck`
Expected: exit `0`

- [ ] **Step 4: Fix any focused failures inline and re-run the exact failing command**

If `node scripts/elo-chart-derived-modes.test.ts` fails, repair only `components/charts/ELO/buildEloChartState.ts` and rerun that exact command.

If `node scripts/elo-chart-mode-rail.test.cjs` fails, repair only `components/charts/ELO/EloChart.tsx` or `components/charts/ELO/EloChartPlot.tsx` and rerun that exact command.

If `node scripts/multi-player-line-legend-focus.test.cjs` or `node scripts/line-series-identity-wiring.test.cjs` fails, keep the fix inside `components/charts/ELO/EloChartPlot.tsx` unless the assertion proves another chart helper contract changed.

- [ ] **Step 5: Commit the verified end-to-end slice**

```bash
git add components/charts/ELO/buildEloChartState.ts components/charts/ELO/EloChart.tsx components/charts/ELO/EloChartPlot.tsx scripts/elo-chart-derived-modes.test.ts scripts/elo-chart-mode-rail.test.cjs
git commit -m "feat: add elo delta and matchup gap chart modes"
```
