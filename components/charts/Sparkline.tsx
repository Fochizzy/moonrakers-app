import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type SparkDatum = number | { value: number; label?: string };

type NormalizedSparkDatum = {
  value: number;
  label?: string;
};

type SparkPoint = {
  index: number;
  value: number;
  label?: string;
  x: number;
  y: number;
};

type SparklineGeometry = {
  path: string;
  points: SparkPoint[];
  baselineY: number;
};

type TrendDirection = 'rising' | 'falling' | 'flat';
type VolatilityLevel = 'low' | 'medium' | 'high';

type SparklineMetrics = {
  current: number;
  previous: number | null;
  first: number;
  min: number;
  minIndex: number;
  max: number;
  maxIndex: number;
  average: number;
  median: number;
  range: number;
  sum: number;
  changeFromStart: number;
  percentChangeFromStart: number | null;
  changeFromPrevious: number | null;
  percentChangeFromPrevious: number | null;
  trendDirection: TrendDirection;
  slope: number;
  volatilityValue: number;
  volatilityLevel: VolatilityLevel;
  distanceFromPeak: number;
  percentBelowPeak: number | null;
  currentVsAverage: number;
  currentPercentVsAverage: number | null;
  risingSteps: number;
  fallingSteps: number;
  directionChanges: number;
  latestPercentile: number;
  recentAverage: number;
  recentChange: number;
  recentTrendDirection: TrendDirection;
};

type SparklineNarrative = {
  headline: string;
  bullets: string[];
  tags: string[];
};

type ComparisonNarrative = {
  headline: string;
  bullets: string[];
  tags: string[];
};

type SelectionPoint = {
  index: number;
  value: number;
  label?: string;
};

export type SparkMetricOption = {
  key: string;
  label: string;
  shortLabel?: string;
};

export const DEFAULT_SPARK_METRIC_OPTIONS: SparkMetricOption[] = [
  { key: 'prestige', shortLabel: 'Prestige', label: 'Total Prestige' },
  { key: 'score', shortLabel: 'Score', label: 'Score' },
  { key: 'assists', shortLabel: 'Assists', label: 'Assists' },
  { key: 'contracts', shortLabel: 'Contracts', label: 'Contracts' },
  { key: 'failures', shortLabel: 'Failures', label: 'Failures' },
  { key: 'efficiency', shortLabel: 'Efficiency', label: 'Efficiency' },
  { key: 'winRate', shortLabel: 'Win %', label: 'Win Rate' },
  { key: 'directPrestige', shortLabel: 'Direct', label: 'Direct Prestige' },
  { key: 'assistPrestige', shortLabel: 'Assist', label: 'Assisted Prestige' },
  { key: 'objectivePrestige', shortLabel: 'Objective', label: 'Objective Prestige' },
];

type SparklineProps = Readonly<{
  data?: readonly SparkDatum[];
  comparisonData?: readonly SparkDatum[];

  metricOptions?: readonly SparkMetricOption[];
  metricSeriesMap?: Record<string, readonly SparkDatum[] | undefined>;
  comparisonMetricSeriesMap?: Record<string, readonly SparkDatum[] | undefined>;
  activeMetricKey?: string;
  defaultMetricKey?: string;
  onChangeMetric?: (metricKey: string) => void;
  showMetricSelector?: boolean;
  metricTitle?: string;

  color?: string;
  comparisonColor?: string;
  primaryLabel?: string;
  comparisonLabel?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  padding?: number;
  pointRadius?: number;
  selectedPointRadius?: number;
  pointHitRadius?: number;
  recentWindow?: number;
  showBaseline?: boolean;
  showLatestButton?: boolean;
  hideLatestWhenSelected?: boolean;
  showValueLabel?: boolean;
  showSummary?: boolean;
  showStatsRow?: boolean;
  showNarrative?: boolean;
  showHowItWorks?: boolean;
  selectedIndex?: number | null;
  defaultSelectedIndex?: number | null;
  onSelectIndex?: (index: number, point: { value: number; label?: string }) => void;
  valueFormatter?: (value: number) => string;
  compactValueFormatter?: (value: number) => string;
  percentFormatter?: (value: number) => string;
  selectionFormatter?: (point: SelectionPoint, metrics: SparklineMetrics) => string;
  latestButtonLabel?: string;
  emptyLabel?: string;
  narrativeTitle?: string;
}>;

const DEFAULT_HEIGHT = 56;
const DEFAULT_WIDTH = 280;
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_PADDING = 10;
const DEFAULT_POINT_RADIUS = 3;
const DEFAULT_SELECTED_POINT_RADIUS = 4.5;
const DEFAULT_POINT_HIT_RADIUS = 14;
const DEFAULT_RECENT_WINDOW = 3;

function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeData(data: readonly SparkDatum[]): NormalizedSparkDatum[] {
  return data.map((entry) =>
    typeof entry === 'number'
      ? { value: toFiniteNumber(entry) }
      : {
          value: toFiniteNumber(entry?.value),
          label: entry?.label,
        }
  );
}

function average(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function standardDeviation(values: readonly number[]): number {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getDomain(values: readonly number[]): { min: number; max: number } {
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

function mergeDomain(
  first: readonly number[],
  second: readonly number[]
): { min: number; max: number } {
  return getDomain([...first, ...second]);
}

function buildGeometry(args: {
  values: readonly NormalizedSparkDatum[];
  width: number;
  height: number;
  padding: number;
  domain: { min: number; max: number };
}): SparklineGeometry {
  const { values, width, height, padding, domain } = args;

  if (!values.length) {
    return {
      path: '',
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
    values.length <= 1 ? left + innerWidth / 2 : left + (index / (values.length - 1)) * innerWidth;

  const getY = (value: number) =>
    bottom - ((value - domain.min) / range) * innerHeight;

  const points: SparkPoint[] = values.map((entry, index) => ({
    index,
    value: entry.value,
    label: entry.label,
    x: getX(index),
    y: getY(entry.value),
  }));

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const baselineValue = domain.min <= 0 && domain.max >= 0 ? 0 : domain.min;

  return {
    path,
    baselineY: getY(baselineValue),
    points,
  };
}

function defaultValueFormatter(value: number): string {
  return value.toFixed(2);
}

function defaultCompactValueFormatter(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function defaultPercentFormatter(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getInitialIndex(length: number, defaultSelectedIndex?: number | null): number | null {
  if (!length) return null;
  if (defaultSelectedIndex != null) return clamp(defaultSelectedIndex, 0, length - 1);
  return length - 1;
}

function getTrendDirection(change: number, rangeReference: number): TrendDirection {
  const threshold = Math.max(1e-9, rangeReference * 0.05);
  if (change > threshold) return 'rising';
  if (change < -threshold) return 'falling';
  return 'flat';
}

function getVolatilityLevel(stdDev: number, avgAbsValue: number): VolatilityLevel {
  const denominator = Math.max(1, avgAbsValue);
  const ratio = stdDev / denominator;

  if (ratio < 0.12) return 'low';
  if (ratio < 0.3) return 'medium';
  return 'high';
}

function percentileRank(values: readonly number[], value: number): number {
  if (!values.length) return 0;
  const belowOrEqual = values.filter((entry) => entry <= value).length;
  return (belowOrEqual / values.length) * 100;
}

function computeMetrics(values: readonly number[], recentWindow: number): SparklineMetrics | null {
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

function formatSignedValue(value: number, formatter: (value: number) => string): string {
  return `${value >= 0 ? '+' : '-'}${formatter(Math.abs(value))}`;
}

function quickTrendLabel(direction: TrendDirection): string {
  if (direction === 'rising') return 'Going Up';
  if (direction === 'falling') return 'Going Down';
  return 'Mostly Flat';
}

function quickMovementLabel(level: VolatilityLevel): string {
  if (level === 'low') return 'Steady';
  if (level === 'medium') return 'Moves Around';
  return 'Up and Down';
}

function defaultSelectionFormatter(point: SelectionPoint, metrics: SparklineMetrics): string {
  const pointLabel = point.label ?? `Point ${point.index + 1}`;

  if (point.index === metrics.maxIndex) {
    return `${pointLabel}: Best at ${defaultValueFormatter(point.value)}`;
  }

  if (point.index === metrics.minIndex) {
    return `${pointLabel}: Lowest at ${defaultValueFormatter(point.value)}`;
  }

  return `${pointLabel}: ${defaultValueFormatter(point.value)}`;
}

function buildNarrative(
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

  if (aboveAverage) tags.push('Above Usual');
  if (belowAverage) tags.push('Below Usual');
  if (metrics.trendDirection === 'rising') tags.push('Going Up');
  if (metrics.trendDirection === 'falling') tags.push('Going Down');
  if (metrics.recentTrendDirection === 'rising') tags.push('Up Lately');
  if (metrics.recentTrendDirection === 'falling') tags.push('Down Lately');
  if (metrics.volatilityLevel === 'low') tags.push('Steady');
  if (metrics.volatilityLevel === 'high') tags.push('Up and Down');
  if (nearPeak) tags.push('Near Best');
  if (metrics.current === metrics.max) tags.push('Best So Far');

  let headline = 'This is about normal right now.';

  if (aboveAverage && nearPeak) {
    headline = 'This is doing better than usual and is close to its best point.';
  } else if (aboveAverage) {
    headline = 'This is doing better than usual right now.';
  } else if (belowAverage) {
    headline = 'This is a little below its usual level right now.';
  }

  if (metrics.current === metrics.max) {
    headline = 'This is at its best point so far.';
  } else if (metrics.current === metrics.min) {
    headline = 'This is at its lowest point so far.';
  }

  bullets.push(
    metrics.trendDirection === 'rising'
      ? 'It has been going up overall.'
      : metrics.trendDirection === 'falling'
      ? 'It has been going down overall.'
      : 'It has stayed mostly flat overall.'
  );

  bullets.push(
    metrics.recentTrendDirection === 'rising'
      ? 'Lately, it has been moving up.'
      : metrics.recentTrendDirection === 'falling'
      ? 'Lately, it has been moving down.'
      : 'Lately, it has stayed fairly steady.'
  );

  bullets.push(
    metrics.volatilityLevel === 'low'
      ? 'It has been very steady.'
      : metrics.volatilityLevel === 'medium'
      ? 'It has moved around a little.'
      : 'It has moved up and down a lot.'
  );

  if (metrics.percentChangeFromStart != null) {
    bullets.push(
      `It is ${percentFormatter(metrics.percentChangeFromStart)} compared with the start.`
    );
  } else {
    bullets.push(
      `It is ${metrics.changeFromStart >= 0 ? 'up' : 'down'} ${compactValueFormatter(
        Math.abs(metrics.changeFromStart)
      )} from the start.`
    );
  }

  return {
    headline,
    bullets: bullets.slice(0, 4),
    tags: Array.from(new Set(tags)).slice(0, 5),
  };
}

function buildComparisonNarrative(args: {
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

  const tags: string[] = [];
  const bullets: string[] = [];

  const currentGap = primaryMetrics.current - comparisonMetrics.current;
  const peakGap = primaryMetrics.max - comparisonMetrics.max;
  const growthGap = primaryMetrics.changeFromStart - comparisonMetrics.changeFromStart;
  const recentGap = primaryMetrics.recentChange - comparisonMetrics.recentChange;
  const steadierPrimary =
    primaryMetrics.volatilityValue < comparisonMetrics.volatilityValue;
  const steadierComparison =
    comparisonMetrics.volatilityValue < primaryMetrics.volatilityValue;

  let headline = `${primaryLabel} and ${comparisonLabel} are close right now.`;

  if (Math.abs(currentGap) < 1e-9) {
    headline = `${primaryLabel} and ${comparisonLabel} are tied right now.`;
    tags.push('Tied Now');
  } else if (currentGap > 0) {
    headline = `${primaryLabel} is ahead of ${comparisonLabel} right now.`;
    tags.push(`${primaryLabel} Ahead`);
  } else {
    headline = `${comparisonLabel} is ahead of ${primaryLabel} right now.`;
    tags.push(`${comparisonLabel} Ahead`);
  }

  if (Math.abs(peakGap) > 1e-9) {
    if (peakGap > 0) {
      tags.push(`${primaryLabel} Better Best`);
    } else {
      tags.push(`${comparisonLabel} Better Best`);
    }
  }

  if (Math.abs(growthGap) > 1e-9) {
    if (growthGap > 0) {
      tags.push(`${primaryLabel} Grew More`);
    } else {
      tags.push(`${comparisonLabel} Grew More`);
    }
  }

  if (steadierPrimary) {
    tags.push(`${primaryLabel} Steadier`);
  } else if (steadierComparison) {
    tags.push(`${comparisonLabel} Steadier`);
  }

  bullets.push(
    Math.abs(currentGap) < 1e-9
      ? `${primaryLabel} and ${comparisonLabel} are at the same level right now.`
      : currentGap > 0
      ? `${primaryLabel} is ahead of ${comparisonLabel} right now by ${compactValueFormatter(
          Math.abs(currentGap)
        )}.`
      : `${comparisonLabel} is ahead of ${primaryLabel} right now by ${compactValueFormatter(
          Math.abs(currentGap)
        )}.`
  );

  bullets.push(
    Math.abs(peakGap) < 1e-9
      ? `${primaryLabel} and ${comparisonLabel} reached the same best level.`
      : peakGap > 0
      ? `${primaryLabel} reached a higher best point than ${comparisonLabel}.`
      : `${comparisonLabel} reached a higher best point than ${primaryLabel}.`
  );

  bullets.push(
    Math.abs(growthGap) < 1e-9
      ? `${primaryLabel} and ${comparisonLabel} changed by about the same amount from the start.`
      : growthGap > 0
      ? `${primaryLabel} improved more from the start than ${comparisonLabel}.`
      : `${comparisonLabel} improved more from the start than ${primaryLabel}.`
  );

  bullets.push(
    Math.abs(recentGap) < 1e-9
      ? `Lately, ${primaryLabel} and ${comparisonLabel} have been moving about the same.`
      : recentGap > 0
      ? `Lately, ${primaryLabel} has been stronger than ${comparisonLabel}.`
      : `Lately, ${comparisonLabel} has been stronger than ${primaryLabel}.`
  );

  if (steadierPrimary) {
    bullets.push(`${primaryLabel} has been steadier overall than ${comparisonLabel}.`);
  } else if (steadierComparison) {
    bullets.push(`${comparisonLabel} has been steadier overall than ${primaryLabel}.`);
  } else {
    bullets.push(`${primaryLabel} and ${comparisonLabel} have moved around by about the same amount.`);
  }

  if (
    primaryMetrics.percentChangeFromStart != null &&
    comparisonMetrics.percentChangeFromStart != null
  ) {
    bullets.push(
      `From the start, ${primaryLabel} is ${percentFormatter(
        primaryMetrics.percentChangeFromStart
      )}, while ${comparisonLabel} is ${percentFormatter(
        comparisonMetrics.percentChangeFromStart
      )}.`
    );
  }

  return {
    headline,
    bullets: bullets.slice(0, 4),
    tags: Array.from(new Set(tags)).slice(0, 5),
  };
}

function Sparkline({
  data = [],
  comparisonData,

  metricOptions = DEFAULT_SPARK_METRIC_OPTIONS,
  metricSeriesMap,
  comparisonMetricSeriesMap,
  activeMetricKey,
  defaultMetricKey,
  onChangeMetric,
  showMetricSelector = true,
  metricTitle = 'Metric',

  color = chartColors.purple,
  comparisonColor = chartColors.blue ?? '#5aa9ff',
  primaryLabel = 'Series A',
  comparisonLabel = 'Series B',
  height = DEFAULT_HEIGHT,
  width = DEFAULT_WIDTH,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  padding = DEFAULT_PADDING,
  pointRadius = DEFAULT_POINT_RADIUS,
  selectedPointRadius = DEFAULT_SELECTED_POINT_RADIUS,
  pointHitRadius = DEFAULT_POINT_HIT_RADIUS,
  recentWindow = DEFAULT_RECENT_WINDOW,
  showBaseline = true,
  showLatestButton = true,
  hideLatestWhenSelected = false,
  showValueLabel = true,
  showSummary = true,
  showStatsRow = true,
  showNarrative = true,
  showHowItWorks = true,
  selectedIndex: controlledSelectedIndex,
  defaultSelectedIndex,
  onSelectIndex,
  valueFormatter = defaultValueFormatter,
  compactValueFormatter = defaultCompactValueFormatter,
  percentFormatter = defaultPercentFormatter,
  selectionFormatter = defaultSelectionFormatter,
  latestButtonLabel = 'Now',
  emptyLabel = 'No data',
  narrativeTitle = 'Quick Summary',
}: SparklineProps) {
  const metricKeys = useMemo(() => {
    if (metricSeriesMap) {
      const keys = Object.keys(metricSeriesMap).filter(
        (key) => Array.isArray(metricSeriesMap[key]) && (metricSeriesMap[key]?.length ?? 0) > 0
      );
      if (keys.length) return keys;
    }
    return [];
  }, [metricSeriesMap]);

  const hasMetricMap = metricKeys.length > 0;
  const isMetricControlled = activeMetricKey !== undefined;
  const resolvedInitialMetricKey =
    defaultMetricKey ??
    metricKeys[0] ??
    metricOptions[0]?.key ??
    'default';

  const [uncontrolledMetricKey, setUncontrolledMetricKey] = useState<string>(
    resolvedInitialMetricKey
  );

  useEffect(() => {
    if (isMetricControlled) return;
    if (hasMetricMap) {
      const currentExists = metricKeys.includes(uncontrolledMetricKey);
      if (!currentExists) {
        setUncontrolledMetricKey(resolvedInitialMetricKey);
      }
    }
  }, [
    hasMetricMap,
    isMetricControlled,
    metricKeys,
    resolvedInitialMetricKey,
    uncontrolledMetricKey,
  ]);

  const currentMetricKey = hasMetricMap
    ? isMetricControlled
      ? activeMetricKey && metricKeys.includes(activeMetricKey)
        ? activeMetricKey
        : metricKeys[0]
      : uncontrolledMetricKey
    : 'default';

  const resolvedData = useMemo(() => {
    if (!hasMetricMap) return data;
    return metricSeriesMap?.[currentMetricKey] ?? [];
  }, [currentMetricKey, data, hasMetricMap, metricSeriesMap]);

  const resolvedComparisonData = useMemo(() => {
    if (!hasMetricMap) return comparisonData;
    return comparisonMetricSeriesMap?.[currentMetricKey] ?? [];
  }, [comparisonData, comparisonMetricSeriesMap, currentMetricKey, hasMetricMap]);

  const currentMetricOption = useMemo(
    () => metricOptions.find((option) => option.key === currentMetricKey) ?? null,
    [currentMetricKey, metricOptions]
  );

  const normalizedData = useMemo(() => normalizeData(resolvedData), [resolvedData]);
  const normalizedComparisonData = useMemo(
    () => normalizeData(resolvedComparisonData ?? []),
    [resolvedComparisonData]
  );

  const values = useMemo(() => normalizedData.map((entry) => entry.value), [normalizedData]);
  const comparisonValues = useMemo(
    () => normalizedComparisonData.map((entry) => entry.value),
    [normalizedComparisonData]
  );

  const dataLength = normalizedData.length;
  const comparisonLength = normalizedComparisonData.length;
  const hasComparison = comparisonLength > 0;

  const isControlled = controlledSelectedIndex !== undefined;

  const [uncontrolledSelectedIndex, setUncontrolledSelectedIndex] = useState<number | null>(() =>
    getInitialIndex(dataLength, defaultSelectedIndex)
  );

  useEffect(() => {
    if (isControlled) return;

    if (!dataLength) {
      setUncontrolledSelectedIndex(null);
      return;
    }

    setUncontrolledSelectedIndex((current) => {
      if (current == null) {
        return getInitialIndex(dataLength, defaultSelectedIndex);
      }

      return clamp(current, 0, dataLength - 1);
    });
  }, [dataLength, defaultSelectedIndex, isControlled, currentMetricKey]);

  const activeSelectedIndex = useMemo(() => {
    if (!dataLength) return null;

    if (isControlled) {
      if (controlledSelectedIndex == null) return null;
      return clamp(controlledSelectedIndex, 0, dataLength - 1);
    }

    if (uncontrolledSelectedIndex == null) return null;
    return clamp(uncontrolledSelectedIndex, 0, dataLength - 1);
  }, [controlledSelectedIndex, dataLength, isControlled, uncontrolledSelectedIndex]);

  const metrics = useMemo(
    () => computeMetrics(values, recentWindow),
    [recentWindow, values]
  );

  const comparisonMetrics = useMemo(
    () => (hasComparison ? computeMetrics(comparisonValues, recentWindow) : null),
    [comparisonValues, hasComparison, recentWindow]
  );

  const domain = useMemo(
    () => mergeDomain(values, comparisonValues),
    [values, comparisonValues]
  );

  const geometry = useMemo(
    () =>
      buildGeometry({
        values: normalizedData,
        width,
        height,
        padding,
        domain,
      }),
    [domain, height, normalizedData, padding, width]
  );

  const comparisonGeometry = useMemo(
    () =>
      buildGeometry({
        values: normalizedComparisonData,
        width,
        height,
        padding,
        domain,
      }),
    [domain, height, normalizedComparisonData, padding, width]
  );

  const selectedPoint =
    activeSelectedIndex == null ? null : (geometry.points[activeSelectedIndex] ?? null);

  const selectionText = useMemo(() => {
    if (!showValueLabel || !selectedPoint || !metrics) return null;

    const seriesLabel = currentMetricOption?.label ?? primaryLabel;

    const parts = [
      `${seriesLabel}: ${selectionFormatter(
        {
          index: selectedPoint.index,
          value: selectedPoint.value,
          label: selectedPoint.label,
        },
        metrics
      )}`,
    ];

    if (hasComparison && activeSelectedIndex != null) {
      const otherPoint = normalizedComparisonData[activeSelectedIndex];
      if (otherPoint) {
        parts.push(
          `${comparisonLabel}: ${valueFormatter(otherPoint.value)}`
        );
      }
    }

    return parts.join(' · ');
  }, [
    activeSelectedIndex,
    comparisonLabel,
    currentMetricOption,
    hasComparison,
    metrics,
    normalizedComparisonData,
    primaryLabel,
    selectedPoint,
    selectionFormatter,
    showValueLabel,
    valueFormatter,
  ]);

  const summaryText = useMemo(() => {
    if (!showSummary || !metrics) return null;

    const metricLabel = currentMetricOption?.label ?? primaryLabel;

    if (hasComparison && comparisonMetrics) {
      const currentGap = metrics.current - comparisonMetrics.current;
      const primaryNow = compactValueFormatter(metrics.current);
      const comparisonNow = compactValueFormatter(comparisonMetrics.current);

      if (Math.abs(currentGap) < 1e-9) {
        return `${metricLabel} is tied right now at ${primaryNow}.`;
      }

      if (currentGap > 0) {
        return `${primaryLabel} is ahead in ${metricLabel.toLowerCase()} right now, ${primaryNow} to ${comparisonNow}.`;
      }

      return `${comparisonLabel} is ahead in ${metricLabel.toLowerCase()} right now, ${comparisonNow} to ${primaryNow}.`;
    }

    return `${metricLabel} is at ${compactValueFormatter(metrics.current)} right now and is ${quickTrendLabel(
      metrics.trendDirection
    ).toLowerCase()}, while overall movement has been ${quickMovementLabel(
      metrics.volatilityLevel
    ).toLowerCase()}.`;
  }, [
    compactValueFormatter,
    comparisonLabel,
    comparisonMetrics,
    currentMetricOption,
    hasComparison,
    metrics,
    primaryLabel,
    showSummary,
  ]);

  const stats = useMemo(() => {
    if (!showStatsRow || !metrics) return [];

    if (hasComparison && comparisonMetrics) {
      return [
        {
          label: `${primaryLabel} Now`,
          value: compactValueFormatter(metrics.current),
        },
        {
          label: `${comparisonLabel} Now`,
          value: compactValueFormatter(comparisonMetrics.current),
        },
        {
          label: 'Gap',
          value: compactValueFormatter(Math.abs(metrics.current - comparisonMetrics.current)),
        },
        {
          label: 'Steadier',
          value:
            metrics.volatilityValue < comparisonMetrics.volatilityValue
              ? primaryLabel
              : comparisonMetrics.volatilityValue < metrics.volatilityValue
              ? comparisonLabel
              : 'Same',
        },
        {
          label: 'Recent',
          value: compactValueFormatter(metrics.recentAverage),
        },
        {
          label: 'Range',
          value: compactValueFormatter(metrics.range),
        },
      ];
    }

    return [
      { label: 'Current', value: compactValueFormatter(metrics.current) },
      { label: 'Lowest', value: compactValueFormatter(metrics.min) },
      { label: 'Usual', value: compactValueFormatter(metrics.average) },
      { label: 'Best', value: compactValueFormatter(metrics.max) },
      { label: 'Range', value: compactValueFormatter(metrics.range) },
      { label: 'Recent Avg', value: compactValueFormatter(metrics.recentAverage) },
      { label: 'Median', value: compactValueFormatter(metrics.median) },
      {
        label: 'Since Start',
        value:
          metrics.percentChangeFromStart != null
            ? percentFormatter(metrics.percentChangeFromStart)
            : formatSignedValue(metrics.changeFromStart, compactValueFormatter),
      },
    ];
  }, [
    compactValueFormatter,
    comparisonMetrics,
    hasComparison,
    metrics,
    percentFormatter,
    primaryLabel,
    comparisonLabel,
    showStatsRow,
  ]);

  const narrative = useMemo(() => {
    if (!showNarrative || !metrics) return null;

    if (hasComparison && comparisonMetrics) {
      return buildComparisonNarrative({
        primaryMetrics: metrics,
        comparisonMetrics,
        primaryLabel,
        comparisonLabel,
        compactValueFormatter,
        percentFormatter,
      });
    }

    return buildNarrative(metrics, compactValueFormatter, percentFormatter);
  }, [
    compactValueFormatter,
    comparisonLabel,
    comparisonMetrics,
    hasComparison,
    metrics,
    percentFormatter,
    primaryLabel,
    showNarrative,
  ]);

  const selectIndex = useCallback(
    (index: number) => {
      if (!dataLength) return;

      const clampedIndex = clamp(index, 0, dataLength - 1);
      const point = normalizedData[clampedIndex];
      if (!point) return;

      if (!isControlled) {
        setUncontrolledSelectedIndex(clampedIndex);
      }

      onSelectIndex?.(clampedIndex, {
        value: point.value,
        label: point.label,
      });
    },
    [dataLength, isControlled, normalizedData, onSelectIndex]
  );

  const handleChangeMetric = useCallback(
    (metricKey: string) => {
      if (!hasMetricMap) return;
      if (!isMetricControlled) {
        setUncontrolledMetricKey(metricKey);
      }
      onChangeMetric?.(metricKey);
    },
    [hasMetricMap, isMetricControlled, onChangeMetric]
  );

  const latestIndex = dataLength > 0 ? dataLength - 1 : null;
  const shouldShowLatestButton =
    showLatestButton &&
    latestIndex != null &&
    (!hideLatestWhenSelected || activeSelectedIndex !== latestIndex);

  if (!dataLength) {
    return (
      <View style={[styles.wrap, { width }]}>
        <View style={[styles.emptyState, { width, height }]}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width }]}>
      {showMetricSelector && hasMetricMap ? (
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>
            {metricTitle}: <Text style={styles.metricValue}>{currentMetricOption?.label ?? currentMetricKey}</Text>
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metricPillsRow}
          >
            {metricOptions
              .filter((option) => metricKeys.includes(option.key))
              .map((option) => {
                const active = option.key === currentMetricKey;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleChangeMetric(option.key)}
                    style={[
                      styles.metricPill,
                      active && styles.metricPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.metricPillText,
                        active && styles.metricPillTextActive,
                      ]}
                    >
                      {option.shortLabel ?? option.label}
                    </Text>
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
      ) : null}

      {showHowItWorks ? (
        <View style={styles.explainerCard}>
          <Text style={styles.explainerTitle}>How this sparkline works</Text>
          <Text style={styles.explainerText}>
            A sparkline is a very small line chart. Each point shows one value in order, from left
            to right. Higher points mean bigger values, lower points mean smaller values. The line
            helps you quickly see whether something is going up, going down, staying steady, or
            moving around a lot.
          </Text>
        </View>
      ) : null}

      {summaryText ? <Text style={styles.summaryText}>{summaryText}</Text> : null}
      {selectionText ? <Text style={styles.valueText}>{selectionText}</Text> : null}

      <Svg width={width} height={height} accessible accessibilityLabel="Sparkline chart">
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={10}
          fill={chartColors.panelBg}
          stroke={chartColors.borderStrong}
        />

        {showBaseline ? (
          <Line
            x1={padding}
            y1={geometry.baselineY}
            x2={width - padding}
            y2={geometry.baselineY}
            stroke={chartColors.grid}
            strokeWidth={1}
          />
        ) : null}

        {hasComparison && comparisonGeometry.path ? (
          <Path
            d={comparisonGeometry.path}
            fill="none"
            stroke={comparisonColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        ) : null}

        <Path
          d={geometry.path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hasComparison
          ? comparisonGeometry.points.map((point) => (
              <Circle
                key={`comparison-${point.index}`}
                cx={point.x}
                cy={point.y}
                r={2}
                fill={comparisonColor}
                opacity={0.9}
                pointerEvents="none"
              />
            ))
          : null}

        {geometry.points.map((point) => {
          const isSelected = point.index === activeSelectedIndex;
          const isPeak = metrics?.maxIndex === point.index;
          const isLow = metrics?.minIndex === point.index;

          return (
            <React.Fragment key={point.index}>
              {isSelected ? (
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={selectedPointRadius + 4}
                  fill={withAlpha(color, 0.18)}
                  pointerEvents="none"
                />
              ) : null}

              <Circle
                cx={point.x}
                cy={point.y}
                r={pointHitRadius}
                fill="transparent"
                onPress={() => selectIndex(point.index)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${point.label ?? `point ${point.index + 1}`}`}
              />

              <Circle
                cx={point.x}
                cy={point.y}
                r={
                  isSelected
                    ? selectedPointRadius
                    : isPeak || isLow
                    ? pointRadius + 0.75
                    : pointRadius
                }
                fill={isSelected ? '#ffffff' : color}
                stroke={color}
                strokeWidth={isSelected ? 1.5 : isPeak || isLow ? 1 : 0}
                pointerEvents="none"
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {hasComparison ? (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{primaryLabel}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: comparisonColor }]} />
            <Text style={styles.legendText}>{comparisonLabel}</Text>
          </View>
        </View>
      ) : null}

      {stats.length ? (
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statPill}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {narrative ? (
        <View style={styles.narrativeCard}>
          <Text style={styles.narrativeTitle}>{narrativeTitle}</Text>
          <Text style={styles.narrativeHeadline}>{narrative.headline}</Text>

          {narrative.tags.length ? (
            <View style={styles.tagsRow}>
              {narrative.tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.bulletsWrap}>
            {narrative.bullets.map((bullet, index) => (
              <View key={`${index}-${bullet}`} style={styles.bulletRow}>
                <Text style={styles.bulletMarker}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {shouldShowLatestButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select ${latestButtonLabel.toLowerCase()} point`}
          onPress={() => {
            if (latestIndex != null) {
              selectIndex(latestIndex);
            }
          }}
          style={styles.reset}
        >
          <Text style={styles.resetText}>{latestButtonLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

Sparkline.displayName = 'Sparkline';

export default memo(Sparkline);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  metricCard: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 8,
  },
  metricTitle: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: chartColors.text,
  },
  metricPillsRow: {
    gap: 8,
    paddingRight: 8,
  },
  metricPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: withAlpha(chartColors.text, 0.04),
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metricPillActive: {
    borderColor: chartColors.purple,
    backgroundColor: withAlpha(chartColors.purple, 0.18),
  },
  metricPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  metricPillTextActive: {
    color: chartColors.text,
  },
  explainerCard: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 6,
  },
  explainerTitle: {
    color: chartColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  explainerText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  summaryText: {
    color: chartColors.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  valueText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  legendRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  statPill: {
    minWidth: 72,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    alignItems: 'center',
  },
  statLabel: {
    color: chartColors.subtext,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  statValue: {
    color: chartColors.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  narrativeCard: {
    width: '100%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 8,
  },
  narrativeTitle: {
    color: chartColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  narrativeHeadline: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: withAlpha(chartColors.purple, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.purple, 0.28),
  },
  tagText: {
    color: chartColors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  bulletsWrap: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletMarker: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  reset: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
  },
  resetText: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyState: {
    borderRadius: 10,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
});
