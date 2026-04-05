console.log('buildPlayerMetrics =', buildPlayerMetrics);
import {
  MetricKey,
  MetricMode,
  METRIC_DEFINITIONS,
  PlayerMetrics,
  SourcePlayerLike,
  buildPlayerMetrics,
  EMPTY_PLAYER_METRICS,
} from './metricSchema';

import { getPlayerColor } from '@/utils/chartTheme';

function safeNumber(v: any): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function getMetricValue(
  metrics: PlayerMetrics,
  metricKey: MetricKey,
  mode: MetricMode,
): number {
  const value = safeNumber(metrics?.[metricKey]);
  const turns = Math.max(1, safeNumber(metrics?.turns));

  if (mode === 'perTurn' && METRIC_DEFINITIONS[metricKey].mode !== 'efficiency') {
    return value / turns;
  }

  return value;
}

export type ChartRow = {
  id: string;
  label: string;
  color: string;
  metrics: PlayerMetrics;
  value: number;
};

export function buildChartData(
  players: SourcePlayerLike[],
  options: {
    mode: MetricMode;
    metricKey: MetricKey;
    includeZeros?: boolean;
    topN?: number | null;
    sortDirection?: 'desc' | 'asc';
  },
): {
  rows: ChartRow[];
  average: number;
} {
  const safePlayers = Array.isArray(players) ? players : [];

  const rows: ChartRow[] = safePlayers.map((player) => {
    const metrics = buildPlayerMetrics(player) ?? EMPTY_PLAYER_METRICS;

    return {
      id: String(player.id ?? Math.random()),
      label: String(player.name ?? 'Unknown'),
      color: getPlayerColor(player.color),
      metrics,
      value: getMetricValue(metrics, options.metricKey, options.mode),
    };
  });

  const filtered =
    options.includeZeros === false
      ? rows.filter((r) => r.value !== 0)
      : rows;

  const sorted = filtered.sort((a, b) => {
    const dir = options.sortDirection === 'asc' ? 1 : -1;
    return dir * (b.value - a.value);
  });

  const limited =
    typeof options.topN === 'number'
      ? sorted.slice(0, options.topN)
      : sorted;

  const average =
    limited.length > 0
      ? limited.reduce((sum, r) => sum + r.value, 0) / limited.length
      : 0;

  return {
    rows: limited,
    average,
  };
}

export function getDisplayValue(
  metrics: PlayerMetrics,
  metricKey: MetricKey,
  mode: MetricMode,
) {
  return getMetricValue(metrics, metricKey, mode);
}