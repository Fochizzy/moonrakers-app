import { useMemo } from "react";

export const TRAIT_KEYS = [
  "finisher",
  "starter",
  "supporter",
  "receiver",
  "stability",
  "efficiency",
  "risk",
  "conversion",
] as const;

export type RadarTraitKey = (typeof TRAIT_KEYS)[number];
export type RadarStats = Partial<Record<RadarTraitKey, number>>;

export type RadarEntry = {
  key: RadarTraitKey;
  label: string;
  shortLabel: string;
  meaning: string;
  value: number;
  comparisonValue: number;
  delta: number;
};

export type RadarPoint = RadarEntry & {
  angle: number;
  outerX: number;
  outerY: number;
  valueX: number;
  valueY: number;
  comparisonX: number;
  comparisonY: number;
};

export type RadarSummary = {
  averageStrength: number;
  topTrait: RadarEntry | null;
  weakestTrait: RadarEntry | null;
  largestEdge: RadarEntry | null;
};

export type RadarMetrics = {
  size: number;
  center: number;
  radius: number;
  hitBoxSize: number;
};

export type RadarModel = {
  entries: RadarEntry[];
  points: RadarPoint[];
  summary: RadarSummary;
  primaryPath: string;
  comparisonPath: string;
  metrics: RadarMetrics;
};

function safeNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(value: unknown): number {
  return Math.max(0, Math.min(1, safeNum(value, 0)));
}

function metaFor(key: RadarTraitKey): [string, string, string] {
  switch (key) {
    case "finisher":
      return ["Finisher", "Finish", "Converts chances into prestige and wins."];
    case "starter":
      return ["Starter", "Start", "Gets into strong positions early."];
    case "supporter":
      return ["Supporter", "Support", "Creates value for teammates."];
    case "receiver":
      return ["Receiver", "Receive", "Turns team support into personal value."];
    case "stability":
      return ["Stability", "Stable", "Produces repeatable outcomes."];
    case "efficiency":
      return ["Efficiency", "Eff", "Gets strong value per action."];
    case "risk":
      return ["Risk", "Risk", "Leans into volatile lines."];
    case "conversion":
      return ["Conversion", "Conv", "Turns opportunities into results."];
  }
}

function buildPath(points: Array<{ x: number; y: number }>) {
  const safePoints = points.filter(
    (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y)
  );
  if (safePoints.length < 3) return "";
  const d =
    safePoints
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${safeNum(point.x).toFixed(2)} ${safeNum(point.y).toFixed(2)}`
      )
      .join(" ") + " Z";

  return /NaN|Infinity|undefined|null/.test(d) ? "" : d;
}

export function buildRadarChartModel(
  primary: RadarStats,
  comparison?: RadarStats,
  size = 280,
): RadarModel {
  const safeSize = Math.max(160, safeNum(size, 280));
  const center = safeSize / 2;
  const radius = safeSize * 0.32;

  const entries: RadarEntry[] = TRAIT_KEYS.map((key) => {
    const [label, shortLabel, meaning] = metaFor(key);
    const value = clamp01(primary?.[key]);
    const comparisonValue = clamp01(comparison?.[key]);

    return {
      key,
      label,
      shortLabel,
      meaning,
      value,
      comparisonValue,
      delta: value - comparisonValue,
    };
  });

  const points: RadarPoint[] = entries.map((entry, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, entries.length);
    const cos = safeNum(Math.cos(angle));
    const sin = safeNum(Math.sin(angle));
    const outerX = center + cos * radius;
    const outerY = center + sin * radius;
    const valueX = center + cos * radius * entry.value;
    const valueY = center + sin * radius * entry.value;
    const comparisonX = center + cos * radius * entry.comparisonValue;
    const comparisonY = center + sin * radius * entry.comparisonValue;

    return {
      ...entry,
      angle,
      outerX: safeNum(outerX, center),
      outerY: safeNum(outerY, center),
      valueX: safeNum(valueX, center),
      valueY: safeNum(valueY, center),
      comparisonX: safeNum(comparisonX, center),
      comparisonY: safeNum(comparisonY, center),
    };
  });

  const averageStrength =
    entries.length > 0
      ? entries.reduce((sum, entry) => sum + safeNum(entry.value), 0) / entries.length
      : 0;

  const topTrait = [...entries].sort((a, b) => b.value - a.value)[0] ?? null;
  const weakestTrait = [...entries].sort((a, b) => a.value - b.value)[0] ?? null;
  const largestEdge =
    [...entries].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null;

  return {
    entries,
    points,
    summary: {
      averageStrength: safeNum(averageStrength),
      topTrait,
      weakestTrait,
      largestEdge,
    },
    primaryPath: buildPath(points.map((point) => ({ x: point.valueX, y: point.valueY }))),
    comparisonPath: buildPath(
      points.map((point) => ({ x: point.comparisonX, y: point.comparisonY }))
    ),
    metrics: {
      size: safeSize,
      center,
      radius,
      hitBoxSize: 26,
    },
  };
}

export function useRadarChartModel(
  primary: RadarStats,
  comparison?: RadarStats,
  size = 280
): RadarModel {
  return useMemo(
    () => buildRadarChartModel(primary, comparison, size),
    [primary, comparison, size],
  );
}
