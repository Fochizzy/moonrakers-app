import { useMemo } from 'react';

import { getDerivedReplayBundle } from './replayAnalyticsCache';
import type { MetricKey, Player, ReplayPoint } from './replayChart.types';

export function useReplayAnalytics(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metric: MetricKey
) {
  return useMemo(
    () => getDerivedReplayBundle(replay, players, metric),
    [replay, players, metric]
  );
}
import type {
  DerivedReplayBundle,
  MetricKey,
  Player,
  ReplayMetricSummary,
  ReplayPoint,
} from './replayChart.types';
import { buildDerivedReplay, summarizeReplayMetric } from './replayChart.utils';

type MetricCacheEntry = {
  derivedReplay: ReplayPoint[];
  summary: ReplayMetricSummary;
};

type PlayerMetricMap = Map<MetricKey, MetricCacheEntry>;
type PlayersCache = WeakMap<readonly Player[], PlayerMetricMap>;
type ReplayCache = WeakMap<readonly ReplayPoint[], PlayersCache>;

const replayAnalyticsCache: ReplayCache = new WeakMap();

function getOrCreatePlayersCache(
  replay: readonly ReplayPoint[]
): PlayersCache {
  let playersCache = replayAnalyticsCache.get(replay);
  if (!playersCache) {
    playersCache = new WeakMap();
    replayAnalyticsCache.set(replay, playersCache);
  }
  return playersCache;
}

function getOrCreateMetricMap(
  replay: readonly ReplayPoint[],
  players: readonly Player[]
): PlayerMetricMap {
  const playersCache = getOrCreatePlayersCache(replay);
  let metricMap = playersCache.get(players);

  if (!metricMap) {
    metricMap = new Map();
    playersCache.set(players, metricMap);
  }

  return metricMap;
}

export function getDerivedReplayBundle(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metric: MetricKey
): DerivedReplayBundle {
  const metricMap = getOrCreateMetricMap(replay, players);
  let entry = metricMap.get(metric);

  if (!entry) {
    const derivedReplay = buildDerivedReplay(replay, players, metric);
    const summary = summarizeReplayMetric(derivedReplay, players, metric);

    entry = {
      derivedReplay,
      summary,
    };

    metricMap.set(metric, entry);
  }

  return {
    metric,
    replay,
    players,
    derivedReplay: entry.derivedReplay,
    summary: entry.summary,
  };
}

export function primeReplayAnalyticsCache(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metrics: readonly MetricKey[]
): void {
  for (const metric of metrics) {
    getDerivedReplayBundle(replay, players, metric);
  }
}

export function clearReplayAnalyticsCacheForReplay(
  replay: readonly ReplayPoint[]
): void {
  replayAnalyticsCache.delete(replay);
}

export function clearAllReplayAnalyticsCache(): void {
  // WeakMap cannot be cleared directly, so expose only per-replay invalidation
  // in production, or switch to Map if full manual clearing is required.
}
