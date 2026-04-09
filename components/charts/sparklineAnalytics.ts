import type {
  ComparisonNarrative,
  NormalizedSparkDatum,
  SelectionPoint,
  SparkDatum,
  SparklineGeometry,
  SparklineMetrics,
  SparklineNarrative,
  TrendDirection,
  VolatilityLevel,
} from "./sparklineTypes";

export function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeData(data: readonly SparkDatum[]): NormalizedSparkDatum[] {
  return data.map((entry) =>
    typeof entry === "number"
      ? { value: toFiniteNumber(entry) }
      : {
          value: toFiniteNumber(entry?.value),
          label: entry?.label,
        }
  );
}

export function average(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function standardDeviation(values: readonly number[]): number {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function getDomain(values: readonly number[]): { min: number; max: number } {
  if (!values.length) {
    return { min: -1, max: 1 };
  }

  let min = values[0];
  let max = values[0];

  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (min === max) {
    const pad = min === 0 ? 1 : Math.max(1, Math.abs(min) * 0.15);
    return { min: min - pad, max: max + pad };
  }

  return { min, max };
}

export function mergeDomain(
  first: readonly number[],
  second: readonly number[]
): { min: number; max: number } {
  return getDomain([...first, ...second]);
}

export function buildGeometry(args: {
  values: readonly NormalizedSparkDatum[];
  width: number;
  height: number;
  padding: number;
  domain: { min: number; max: number };
}): SparklineGeometry {
  const { values, width, height, padding, domain } = args;

  if (!values.length) {
    return {
      path: "",
      baselineY: height / 2,
      points: [],
    };
  }

  const left = padding;
  const right = Math.max(left + 1, width - padding);
  const top = padding;
  const bottom = Math.max(top + 1, height - padding);
  const innerWidth = Math.max(1, right - left);
  const innerHeight = Math.max(1, bottom - top);
  const range = Math.max(1e-9, domain.max - domain.min);

  const getX = (index: number) =>
    values.length <= 1
      ? left + innerWidth / 2
      : left + (index / (values.length - 1)) * innerWidth;

  const getY = (value: number) => bottom - ((value - domain.min) / range) * innerHeight;

  const points = values.map((entry, index) => ({
    index,
    value: entry.value,
    label: entry.label,
    x: getX(index),
    y: getY(entry.value),
  }));

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const baselineValue = domain.min <= 0 && domain.max >= 0 ? 0 : domain.min;

  return {
    path,
    baselineY: getY(baselineValue),
    points,
  };
}

export function defaultValueFormatter(value: number): string {
  return value.toFixed(2);
}

export function defaultCompactValueFormatter(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function defaultPercentFormatter(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getInitialIndex(
  length: number,
  defaultSelectedIndex?: number | null
): number | null {
  if (!length) return null;
  if (defaultSelectedIndex != null) return clamp(defaultSelectedIndex, 0, length - 1);
  return length - 1;
}

export function getTrendDirection(
  change: number,
  rangeReference: number
): TrendDirection {
  const threshold = Math.max(1e-9, rangeReference * 0.05);
  if (change > threshold) return "rising";
  if (change < -threshold) return "falling";
  return "flat";
}

export function getVolatilityLevel(
  stdDev: number,
  avgAbsValue: number
): VolatilityLevel {
  const denominator = Math.max(1, avgAbsValue);
  const ratio = stdDev / denominator;

  if (ratio < 0.12) return "low";
  if (ratio < 0.3) return "medium";
  return "high";
}

export function percentileRank(values: readonly number[], value: number): number {
  if (!values.length) return 0;
  const belowOrEqual = values.filter((entry) => entry <= value).length;
  return (belowOrEqual / values.length) * 100;
}

export function computeMetrics(
  values: readonly number[],
  recentWindow: number
): SparklineMetrics | null {
  if (!values.length) return null;

  let min = values[0];
  let max = values[0];
  let minIndex = 0;
  let maxIndex = 0;
  let risingSteps = 0;
  let fallingSteps = 0;
  let directionChanges = 0;
  let previousStepDirection = 0;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value < min) {
      min = value;
      minIndex = index;
    }

    if (value > max) {
      max = value;
      maxIndex = index;
    }

    if (index > 0) {
      const delta = value - values[index - 1];
      const stepDirection = delta > 0 ? 1 : delta < 0 ? -1 : 0;

      if (delta > 0) risingSteps += 1;
      if (delta < 0) fallingSteps += 1;

      if (
        stepDirection !== 0 &&
        previousStepDirection !== 0 &&
        stepDirection !== previousStepDirection
      ) {
        directionChanges += 1;
      }

      if (stepDirection !== 0) {
        previousStepDirection = stepDirection;
      }
    }
  }

  const current = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : null;
  const first = values[0];
  const avg = average(values);
  const med = median(values);
  const sum = values.reduce((acc, value) => acc + value, 0);
  const range = max - min;
  const changeFromStart = current - first;
  const percentChangeFromStart =
    Math.abs(first) > 1e-9 ? (changeFromStart / first) * 100 : null;
  const changeFromPrevious = previous == null ? null : current - previous;
  const percentChangeFromPrevious =
    previous != null && Math.abs(previous) > 1e-9
      ? ((current - previous) / previous) * 100
      : null;
  const slope = values.length <= 1 ? 0 : (current - first) / (values.length - 1);
  const volatilityValue = standardDeviation(values);
  const avgAbsValue = average(values.map((value) => Math.abs(value)));
  const volatilityLevel = getVolatilityLevel(volatilityValue, avgAbsValue);
  const distanceFromPeak = max - current;
  const percentBelowPeak =
    Math.abs(max) > 1e-9 ? ((max - current) / Math.abs(max)) * 100 : null;
  const currentVsAverage = current - avg;
  const currentPercentVsAverage =
    Math.abs(avg) > 1e-9 ? ((current - avg) / Math.abs(avg)) * 100 : null;
  const latestPercentile = percentileRank(values, current);

  const safeRecentWindow = Math.max(2, Math.min(recentWindow, values.length));
  const recentValues = values.slice(-safeRecentWindow);
  const recentAverage = average(recentValues);
  const recentChange = recentValues[recentValues.length - 1] - recentValues[0];
  const recentTrendDirection = getTrendDirection(
    recentChange,
    range || Math.abs(current) || 1
  );

  const trendDirection = getTrendDirection(
    changeFromStart,
    range || Math.abs(current) || 1
  );

  return {
    current,
    previous,
    first,
    min,
    minIndex,
    max,
    maxIndex,
    average: avg,
    median: med,
    range,
    sum,
    changeFromStart,
    percentChangeFromStart,
    changeFromPrevious,
    percentChangeFromPrevious,
    trendDirection,
    slope,
    volatilityValue,
    volatilityLevel,
    distanceFromPeak,
    percentBelowPeak,
    currentVsAverage,
    currentPercentVsAverage,
    risingSteps,
    fallingSteps,
    directionChanges,
    latestPercentile,
    recentAverage,
    recentChange,
    recentTrendDirection,
  };
}

export function formatSignedValue(
  value: number,
  formatter: (value: number) => string
): string {
  return `${value >= 0 ? "+" : "-"}${formatter(Math.abs(value))}`;
}

export function quickTrendLabel(direction: TrendDirection): string {
  if (direction === "rising") return "Going Up";
  if (direction === "falling") return "Going Down";
  return "Mostly Flat";
}

export function quickMovementLabel(level: VolatilityLevel): string {
  if (level === "low") return "Steady";
  if (level === "medium") return "Moves Around";
  return "Up and Down";
}

export function defaultSelectionFormatter(
  point: SelectionPoint,
  metrics: SparklineMetrics
): string {
  const pointLabel = point.label ?? `Point ${point.index + 1}`;

  if (point.index === metrics.maxIndex) {
    return `${pointLabel}: Best at ${defaultValueFormatter(point.value)}`;
  }

  if (point.index === metrics.minIndex) {
    return `${pointLabel}: Lowest at ${defaultValueFormatter(point.value)}`;
  }

  return `${pointLabel}: ${defaultValueFormatter(point.value)}`;
}

export function buildNarrative(
  metrics: SparklineMetrics,
  compactValueFormatter: (value: number) => string,
  percentFormatter: (value: number) => string
): SparklineNarrative {
  const tags: string[] = [];
  const bullets: string[] = [];

  const tolerance = Math.max(1e-9, metrics.range * 0.03);
  const aboveAverage = metrics.currentVsAverage > tolerance;
  const belowAverage = metrics.currentVsAverage < -tolerance;
  const nearPeak = metrics.distanceFromPeak <= Math.max(1e-9, metrics.range * 0.15);

  if (aboveAverage) tags.push("Above Usual");
  if (belowAverage) tags.push("Below Usual");
  if (metrics.trendDirection === "rising") tags.push("Going Up");
  if (metrics.trendDirection === "falling") tags.push("Going Down");
  if (metrics.recentTrendDirection === "rising") tags.push("Up Lately");
  if (metrics.recentTrendDirection === "falling") tags.push("Down Lately");
  if (metrics.volatilityLevel === "low") tags.push("Steady");
  if (metrics.volatilityLevel === "high") tags.push("Up and Down");
  if (nearPeak) tags.push("Near Best");
  if (metrics.current === metrics.max) tags.push("Best So Far");

  let headline = "This is about normal right now.";

  if (aboveAverage && nearPeak) {
    headline = "This is doing better than usual and is close to its best point.";
  } else if (aboveAverage) {
    headline = "This is doing better than usual right now.";
  } else if (belowAverage) {
    headline = "This is a little below its usual level right now.";
  }

  if (metrics.current === metrics.max) {
    headline = "This is at its best point so far.";
  } else if (metrics.current === metrics.min) {
    headline = "This is at its lowest point so far.";
  }

  bullets.push(
    metrics.percentChangeFromStart == null
      ? `From start to now, it moved ${formatSignedValue(
          metrics.changeFromStart,
          compactValueFormatter
        )}.`
      : `From start to now, it moved ${formatSignedValue(
          metrics.changeFromStart,
          compactValueFormatter
        )} (${percentFormatter(metrics.percentChangeFromStart)}).`
  );

  if (metrics.changeFromPrevious != null) {
    bullets.push(
      metrics.percentChangeFromPrevious == null
        ? `From the previous point, it moved ${formatSignedValue(
            metrics.changeFromPrevious,
            compactValueFormatter
          )}.`
        : `From the previous point, it moved ${formatSignedValue(
            metrics.changeFromPrevious,
            compactValueFormatter
          )} (${percentFormatter(metrics.percentChangeFromPrevious)}).`
    );
  }

  bullets.push(
    `The average is ${compactValueFormatter(metrics.average)}, with the latest point at the ${Math.round(
      metrics.latestPercentile
    )}th percentile of the series.`
  );

  bullets.push(
    `The overall pattern looks ${quickTrendLabel(metrics.trendDirection).toLowerCase()} and ${quickMovementLabel(
      metrics.volatilityLevel
    ).toLowerCase()}.`
  );

  return { headline, bullets, tags };
}

export function buildComparisonNarrative(args: {
  primaryMetrics: SparklineMetrics;
  comparisonMetrics: SparklineMetrics;
  primaryLabel: string;
  comparisonLabel: string;
  compactValueFormatter: (value: number) => string;
  percentFormatter: (value: number) => string;
}): ComparisonNarrative {
  const {
    primaryMetrics,
    comparisonMetrics,
    primaryLabel,
    comparisonLabel,
    compactValueFormatter,
    percentFormatter,
  } = args;

  const currentDelta = primaryMetrics.current - comparisonMetrics.current;
  const avgDelta = primaryMetrics.average - comparisonMetrics.average;
  const trendDelta = primaryMetrics.changeFromStart - comparisonMetrics.changeFromStart;
  const strongerRecent =
    Math.abs(primaryMetrics.recentChange) >= Math.abs(comparisonMetrics.recentChange)
      ? primaryLabel
      : comparisonLabel;

  const tags: string[] = [];

  if (currentDelta > 0) tags.push(`${primaryLabel} Higher Now`);
  if (currentDelta < 0) tags.push(`${comparisonLabel} Higher Now`);
  if (avgDelta > 0) tags.push(`${primaryLabel} Higher Average`);
  if (avgDelta < 0) tags.push(`${comparisonLabel} Higher Average`);
  if (primaryMetrics.volatilityValue < comparisonMetrics.volatilityValue) {
    tags.push(`${primaryLabel} Steadier`);
  } else if (comparisonMetrics.volatilityValue < primaryMetrics.volatilityValue) {
    tags.push(`${comparisonLabel} Steadier`);
  }

  let headline = `${primaryLabel} and ${comparisonLabel} are fairly close right now.`;

  if (Math.abs(currentDelta) > Math.max(1e-9, Math.max(primaryMetrics.range, comparisonMetrics.range) * 0.15)) {
    headline =
      currentDelta > 0
        ? `${primaryLabel} is ahead right now.`
        : `${comparisonLabel} is ahead right now.`;
  }

  const bullets = [
    `${primaryLabel} is ${formatSignedValue(currentDelta, compactValueFormatter)} versus ${comparisonLabel} on the latest point.`,
    `${primaryLabel} average vs ${comparisonLabel} average differs by ${formatSignedValue(
      avgDelta,
      compactValueFormatter
    )}.`,
    `${strongerRecent} has the stronger recent move.`,
    primaryMetrics.percentChangeFromStart != null && comparisonMetrics.percentChangeFromStart != null
      ? `${primaryLabel} changed ${percentFormatter(
          primaryMetrics.percentChangeFromStart
        )} from the start, while ${comparisonLabel} changed ${percentFormatter(
          comparisonMetrics.percentChangeFromStart
        )}.`
      : `${primaryLabel} changed ${formatSignedValue(
          primaryMetrics.changeFromStart,
          compactValueFormatter
        )} from the start, while ${comparisonLabel} changed ${formatSignedValue(
          comparisonMetrics.changeFromStart,
          compactValueFormatter
        )}.`,
  ];

  void trendDelta;

  return { headline, bullets, tags };
}