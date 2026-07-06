import type { EloChartMode, EloChartSeries, EloChartState } from "./buildEloChartState";

type EloModeRange = {
  minValue: number;
  maxValue: number;
};

type ActiveEloChartView = {
  seriesPaths: EloChartSeries[];
  activeRange: EloModeRange;
};

type EloModeInspectorCopyArgs = {
  selectedMode: EloChartMode;
  selectedIndex: number;
  totalGames: number;
  focusedPeakValue: number;
  focusedDeltaValue: number;
  selectedValue: number;
};

function toSignedFixed(value: number, digits: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue > 0 ? "+" : ""}${safeValue.toFixed(digits)}`;
}

function formatModeValue(value: number, mode: EloChartMode) {
  switch (mode) {
    case "elo":
      return (Number.isFinite(value) ? value : 0).toFixed(0);
    case "eloDelta":
    case "matchupGap":
    default:
      return toSignedFixed(value, 1);
  }
}

export function deriveActiveEloChartView(
  chartState: Pick<
    EloChartState,
    "eloSeriesPaths" | "focusedSeries" | "focusedMetricValues" | "modeRanges"
  >,
  selectedMode: EloChartMode,
): ActiveEloChartView {
  if (selectedMode === "elo") {
    return {
      seriesPaths: chartState.eloSeriesPaths,
      activeRange: chartState.modeRanges.elo,
    };
  }

  if (!chartState.focusedSeries) {
    return {
      seriesPaths: [],
      activeRange: chartState.modeRanges[selectedMode],
    };
  }

  const values =
    selectedMode === "eloDelta"
      ? chartState.focusedMetricValues.eloDelta
      : chartState.focusedMetricValues.matchupGap;

  return {
    seriesPaths: [
      {
        ...chartState.focusedSeries,
        values,
        isFocused: true,
      },
    ],
    activeRange: chartState.modeRanges[selectedMode],
  };
}

export function buildEloModeInspectorCopy({
  selectedMode,
  selectedIndex,
  totalGames,
  focusedPeakValue,
  focusedDeltaValue,
  selectedValue,
}: EloModeInspectorCopyArgs) {
  if (selectedMode === "eloDelta" && selectedIndex === 0) {
    return {
      helperText: "Game 1 establishes the Delta baseline with no prior game to compare",
      storyText: `No prior game yet | Delta baseline ${formatModeValue(
        selectedValue,
        "eloDelta",
      )}`,
    };
  }

  switch (selectedMode) {
    case "eloDelta":
      return {
        helperText: `Game ${selectedIndex + 1} swing versus the prior result`,
        storyText: `Selected game change ${formatModeValue(
          selectedValue,
          "eloDelta",
        )} versus prior result`,
      };
    case "matchupGap":
      return {
        helperText: `Game ${selectedIndex + 1} gap versus average opponents`,
        storyText: `Selected matchup gap ${formatModeValue(
          selectedValue,
          "matchupGap",
        )}`,
      };
    case "elo":
    default:
      return {
        helperText: `Game ${selectedIndex + 1} of ${Math.max(totalGames, 1)}`,
        storyText: `Peak ${formatModeValue(focusedPeakValue, "elo")} | Delta ${formatModeValue(
          focusedDeltaValue,
          "eloDelta",
        )}`,
      };
  }
}
