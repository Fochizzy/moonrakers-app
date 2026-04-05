import { useMemo } from 'react';

export const GRID_RATIOS = [0.25, 0.5, 0.75, 1] as const;

export const TRAIT_KEYS = [
  'finisher',
  'starter',
  'supporter',
  'receiver',
  'stability',
  'efficiency',
  'risk',
  'conversion',
] as const;

export type RadarTraitKey = (typeof TRAIT_KEYS)[number];
export type Stats = Partial<Record<RadarTraitKey, number>>;
export type SizeVariant = 'sm' | 'md' | 'lg';

export type ChartMetrics = {
  size: number;
  center: number;
  radius: number;
  labelOffset: number;
  centerBadgeRadius: number;
  hitBoxSize: number;
};

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

export type PlaystyleResult = {
  label: string;
  score: number;
  reason: string;
};

export type RadarSummary = {
  averageStrength: number;
  hasAnyData: boolean;
  topTrait: RadarEntry | null;
  topTraits: RadarEntry[];
  largestEdge: RadarEntry | null;
  playstyle: PlaystyleResult | null;
};

export type RadarModel = {
  entries: RadarEntry[];
  points: RadarPoint[];
  summary: RadarSummary;
  primaryPath: string;
  comparisonPath: string;
  metrics: ChartMetrics;
};

function clamp01(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(n, 1));
}

function prettifyLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getShortLabel(key: RadarTraitKey): string {
  switch (key) {
    case 'finisher':
      return 'Finish';
    case 'starter':
      return 'Start';
    case 'supporter':
      return 'Support';
    case 'receiver':
      return 'Receive';
    case 'stability':
      return 'Stable';
    case 'efficiency':
      return 'Eff';
    case 'risk':
      return 'Risk';
    case 'conversion':
      return 'Conv';
    default:
      return prettifyLabel(key);
  }
}

function getTraitMeaning(key: RadarTraitKey): string {
  switch (key) {
    case 'finisher':
      return 'Endgame gain rate';
    case 'starter':
      return 'Early lead frequency';
    case 'supporter':
      return 'Assists given rate';
    case 'receiver':
      return 'Assist prestige received rate';
    case 'stability':
      return 'Low variance in per-game prestige';
    case 'efficiency':
      return 'Prestige per contract';
    case 'risk':
      return 'Low failure pressure';
    case 'conversion':
      return 'Contracts per opportunity';
    default:
      return '';
  }
}

export function getChartMetrics(sizeVariant: SizeVariant): ChartMetrics {
  switch (sizeVariant) {
    case 'sm':
      return {
        size: 260,
        center: 130,
        radius: 76,
        labelOffset: 14,
        centerBadgeRadius: 16,
        hitBoxSize: 42,
      };
    case 'lg':
      return {
        size: 392,
        center: 196,
        radius: 122,
        labelOffset: 18,
        centerBadgeRadius: 20,
        hitBoxSize: 48,
      };
    case 'md':
    default:
      return {
        size: 320,
        center: 160,
        radius: 98,
        labelOffset: 16,
        centerBadgeRadius: 18,
        hitBoxSize: 44,
      };
  }
}

function classifyPlaystyle(stats: Record<RadarTraitKey, number>): PlaystyleResult {
  const ranked: PlaystyleResult[] = [
    {
      label: 'Aggressor',
      score: stats.starter * 0.3 + stats.conversion * 0.28 + stats.efficiency * 0.22 + stats.risk * 0.2,
      reason: 'Fast starts, strong conversion, and pressure creation.',
    },
    {
      label: 'Support Engine',
      score: stats.supporter * 0.45 + stats.receiver * 0.12 + stats.stability * 0.18 + stats.efficiency * 0.25,
      reason: 'Generates value for others and stabilizes team output.',
    },
    {
      label: 'Opportunist',
      score: stats.stability * 0.3 + stats.efficiency * 0.25 + stats.risk * 0.2 + stats.finisher * 0.25,
      reason: 'Efficient, stable, and strongest when timing matters.',
    },
    {
      label: 'Closer',
      score: stats.finisher * 0.45 + stats.efficiency * 0.18 + stats.stability * 0.17 + stats.risk * 0.2,
      reason: 'Best at late conversion and decisive finishing.',
    },
  ].sort((a, b) => b.score - a.score);

  return ranked[0];
}

function buildEntries(stats: Stats, comparisonStats?: Stats): RadarEntry[] {
  return TRAIT_KEYS.map((key) => {
    const value = clamp01(stats[key]);
    const comparisonValue = clamp01(comparisonStats?.[key]);

    return {
      key,
      label: prettifyLabel(key),
      shortLabel: getShortLabel(key),
      meaning: getTraitMeaning(key),
      value,
      comparisonValue,
      delta: value - comparisonValue,
    };
  });
}

function toStatsMap(entries: RadarEntry[]): Record<RadarTraitKey, number> {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.value])) as Record<RadarTraitKey, number>;
}

function summarizeEntries(entries: RadarEntry[], chipCount: number): RadarSummary {
  if (!entries.length) {
    return {
      averageStrength: 0,
      hasAnyData: false,
      topTrait: null,
      topTraits: [],
      largestEdge: null,
      playstyle: null,
    };
  }

  const byValue = [...entries].sort((a, b) => b.value - a.value);
  const byEdge = [...entries].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const averageStrength = entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
  const hasAnyData = entries.some((entry) => entry.value > 0 || entry.comparisonValue > 0);

  return {
    averageStrength,
    hasAnyData,
    topTrait: byValue[0] ?? null,
    topTraits: byValue.slice(0, Math.max(1, chipCount)),
    largestEdge: byEdge[0] ?? null,
    playstyle: hasAnyData ? classifyPlaystyle(toStatsMap(entries)) : null,
  };
}

function buildPoints(entries: RadarEntry[], metrics: ChartMetrics): RadarPoint[] {
  const count = Math.max(entries.length, 1);

  return entries.map((entry, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
      ...entry,
      angle,
      outerX: metrics.center + cos * metrics.radius,
      outerY: metrics.center + sin * metrics.radius,
      valueX: metrics.center + cos * metrics.radius * entry.value,
      valueY: metrics.center + sin * metrics.radius * entry.value,
      comparisonX: metrics.center + cos * metrics.radius * entry.comparisonValue,
      comparisonY: metrics.center + sin * metrics.radius * entry.comparisonValue,
    };
  });
}

function buildPolygonPath(points: RadarPoint[], mode: 'primary' | 'comparison'): string {
  if (!points.length) return '';

  return `${points
    .map((point, index) => {
      const x = mode === 'primary' ? point.valueX : point.comparisonX;
      const y = mode === 'primary' ? point.valueY : point.comparisonY;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ')} Z`;
}

export function getDefaultTrait(entries: RadarEntry[]): RadarTraitKey | null {
  return [...entries].sort((a, b) => b.value - a.value)[0]?.key ?? null;
}

export function getLabelAnchor(point: RadarPoint, center: number): 'start' | 'middle' | 'end' {
  if (point.outerX < center - 20) return 'end';
  if (point.outerX > center + 20) return 'start';
  return 'middle';
}

export function getLabelPosition(point: RadarPoint, metrics: ChartMetrics) {
  const dx = point.outerX - metrics.center;
  const dy = point.outerY - metrics.center;

  let x = point.outerX;
  let y = point.outerY;

  if (Math.abs(dx) > Math.abs(dy)) {
    x += dx > 0 ? metrics.labelOffset : -metrics.labelOffset;
    y += 4;
  } else {
    y += dy > 0 ? 14 : -10;
  }

  return { x, y };
}

export function useRadarChartModel({
  stats,
  comparisonStats,
  sizeVariant,
  topTraitChipCount,
}: {
  stats: Stats;
  comparisonStats?: Stats;
  sizeVariant: SizeVariant;
  topTraitChipCount: number;
}): RadarModel {
  return useMemo(() => {
    const metrics = getChartMetrics(sizeVariant);
    const entries = buildEntries(stats, comparisonStats);
    const summary = summarizeEntries(entries, topTraitChipCount);
    const points = buildPoints(entries, metrics);

    return {
      entries,
      points,
      summary,
      primaryPath: buildPolygonPath(points, 'primary'),
      comparisonPath: buildPolygonPath(points, 'comparison'),
      metrics,
    };
  }, [stats, comparisonStats, sizeVariant, topTraitChipCount]);
}
