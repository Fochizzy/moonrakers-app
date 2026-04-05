import { getDerivedReplayBundle } from './replayAnalyticsCache';
import type {
  MetricKey,
  Player,
  PlayerMetricSeries,
  ReplayMetricSummary,
  ReplayPoint,
} from './replayChart.types';
import { getPlayerMetricAtPoint } from './replayChart.utils';

export function selectDerivedReplay(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metric: MetricKey
): ReplayPoint[] {
  return getDerivedReplayBundle(replay, players, metric).derivedReplay;
}

export function selectReplaySummary(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metric: MetricKey
): ReplayMetricSummary {
  return getDerivedReplayBundle(replay, players, metric).summary;
}

export function selectPlayerMetricSeries(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metric: MetricKey,
  playerId: string
): PlayerMetricSeries | undefined {
  const bundle = getDerivedReplayBundle(replay, players, metric);
  const player = players.find((entry) => entry.id === playerId);
  if (!player) return undefined;

  return {
    player,
    points: bundle.derivedReplay.map((point, index) => ({
      round: typeof point.round === 'number' ? point.round : index + 1,
      value: getPlayerMetricAtPoint(point, player, metric),
    })),
  };
}

export function selectAllPlayerMetricSeries(
  replay: readonly ReplayPoint[],
  players: readonly Player[],
  metric: MetricKey
): PlayerMetricSeries[] {
  const bundle = getDerivedReplayBundle(replay, players, metric);

  return players.map((player) => ({
    player,
    points: bundle.derivedReplay.map((point, index) => ({
      round: typeof point.round === 'number' ? point.round : index + 1,
      value: getPlayerMetricAtPoint(point, player, metric),
    })),
  }));
}
