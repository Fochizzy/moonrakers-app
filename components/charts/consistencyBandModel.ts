import { getChartMetricValue } from "@/utils/chartMetricValue";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import type { SnapshotPoint, StorePlayer } from "@/utils/charts";

type SimplePlayer = Pick<StorePlayer, "id" | "name" | "color">;

export type ConsistencyBandRow = {
  playerId: string;
  name: string;
  color: string;
  values: number[];
  low: number;
  high: number;
  median: number;
  average: number;
  deviation: number;
  spread: number;
};

export type ConsistencyBandModel = {
  series: ConsistencyBandRow[];
  minValue: number;
  maxValue: number;
  mostStable: ConsistencyBandRow | null;
  mostSwingy: ConsistencyBandRow | null;
  medianLeader: ConsistencyBandRow | null;
};

const FALLBACK_COLORS = ["#A855F7", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444"];

function playerName(player?: SimplePlayer | null) {
  return String(player?.name || "Unknown").trim() || "Unknown";
}

function playerColor(player?: SimplePlayer | null, index = 0) {
  const color = String(player?.color || "").trim();
  if (/^#|^rgb|^hsl/i.test(color)) return color;
  if (color) {
    return getPlayerAccentColor(resolveStoredPlayerColor(color, index));
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function deviation(values: number[]) {
  if (values.length <= 1) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function buildConsistencyBandModel(args: {
  players?: SimplePlayer[];
  data?: SnapshotPoint[];
  metricKey?: string | null;
}): ConsistencyBandModel {
  const players = Array.isArray(args.players) ? args.players : [];
  const data = Array.isArray(args.data) ? args.data : [];
  const metricKey = String(args.metricKey || "totalPrestige");

  const series = players.map((player, index) => {
    const values = data.map((point) =>
      getChartMetricValue(point?.snapshot?.[player.id], metricKey)
    );
    const low = values.length ? Math.min(...values) : 0;
    const high = values.length ? Math.max(...values) : 0;
    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

    return {
      playerId: player.id,
      name: playerName(player),
      color: playerColor(player, index),
      values,
      low,
      high,
      median: median(values),
      average,
      deviation: round(deviation(values), 3),
      spread: high - low,
    };
  });

  const mostStable =
    [...series].sort((left, right) => {
      if (left.deviation !== right.deviation) return left.deviation - right.deviation;
      return left.spread - right.spread;
    })[0] ?? null;

  const mostSwingy =
    [...series].sort((left, right) => {
      if (right.deviation !== left.deviation) return right.deviation - left.deviation;
      return right.spread - left.spread;
    })[0] ?? null;

  const medianLeader =
    [...series].sort((left, right) => {
      if (right.median !== left.median) return right.median - left.median;
      return right.average - left.average;
    })[0] ?? null;

  return {
    series,
    minValue: series.length ? Math.min(...series.map((row) => row.low)) : 0,
    maxValue: series.length ? Math.max(...series.map((row) => row.high)) : 1,
    mostStable,
    mostSwingy,
    medianLeader,
  };
}
