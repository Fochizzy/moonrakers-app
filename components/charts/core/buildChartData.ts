import {
  ChartPlayerRow,
  MetricKey,
  MetricMode,
  METRIC_DEFINITIONS,
  PlayerMetrics,
  SourcePlayerLike,
  buildPlayerMetrics,
  EMPTY_PLAYER_METRICS,
} from './metricSchema';
import { getStablePlayerColor } from './chartColors';

export type BuildChartDataOptions = {
  mode: MetricMode;
  metricKey: MetricKey;
  includeZeros?: boolean;
  topN?: number | null;
  sortDirection?: 'desc' | 'asc';
};

export type BuildChartDataResult = {
  rows: ChartPlayerRow[];
  average: number;
  hasNegativeValues: boolean;
};

function getMetricValue(
  metrics: PlayerMetrics | undefined,
  metricKey: MetricKey,
  mode: MetricMode,
): number {
  if (!metrics) {
    return 0;
  }

  const value = Number(metrics[metricKey] ?? 0);
  const turns = Math.max(1, Number(metrics.turns ?? 0));

  if (mode === 'perTurn' && METRIC_DEFINITIONS[metricKey].mode !== 'efficiency') {
    return value / turns;
  }

  return value;
}

export function buildChartData(
  players: SourcePlayerLike[],
  options: BuildChartDataOptions,
): BuildChartDataResult {
  const rows: Array<ChartPlayerRow & { derivedValue: number }> = (players ?? [])
    .filter((player): player is SourcePlayerLike => !!player && typeof player === 'object')
    .map((player) => {
      const metrics = buildPlayerMetrics(player) ?? EMPTY_PLAYER_METRICS;

      return {
        id: String(player.id ?? player.name ?? player.initials ?? Math.random()),
        label: String(player.name ?? player.initials ?? 'Unknown Player'),
        color: getStablePlayerColor(
          String(player.id ?? player.name ?? player.initials ?? 'unknown'),
          typeof player.color === 'string' ? player.color : undefined,
        ),
        metrics,
        derivedValue: getMetricValue(metrics, options.metricKey, options.mode),
      };
    })
    .filter((row) => !!row.metrics);

  const filtered = options.includeZeros === false
    ? rows.filter((row) => row.derivedValue !== 0)
    : rows;

  const sorted = [...filtered].sort((left, right) => {
    const primary = options.sortDirection === 'asc'
      ? left.derivedValue - right.derivedValue
      : right.derivedValue - left.derivedValue;

    if (primary !== 0) {
      return primary;
    }

    return left.label.localeCompare(right.label);
  });

  const limited =
    typeof options.topN === 'number' && Number.isFinite(options.topN)
      ? sorted.slice(0, Math.max(0, options.topN))
      : sorted;

  const average = limited.length > 0
    ? limited.reduce((sum, row) => sum + row.derivedValue, 0) / limited.length
    : 0;

  return {
    rows: limited.map(({ derivedValue, ...row }) => row),
    average,
    hasNegativeValues: limited.some((row) => row.derivedValue < 0),
  };
}

export function getDisplayValue(
  metrics: PlayerMetrics | undefined,
  metricKey: MetricKey,
  mode: MetricMode,
): number {
  return getMetricValue(metrics, metricKey, mode);
}
