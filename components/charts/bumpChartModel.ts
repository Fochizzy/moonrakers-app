import { getChartMetricValue } from "@/utils/chartMetricValue";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import type { SnapshotPoint, StorePlayer } from "@/utils/charts";

type SimplePlayer = Pick<StorePlayer, "id" | "name" | "color">;

export type BumpSeriesRow = {
  playerId: string;
  name: string;
  color: string;
  values: number[];
  ranks: number[];
  startRank: number;
  latestRank: number;
  rankChange: number;
};

export type BumpChartModel = {
  series: BumpSeriesRow[];
  labels: string[];
  maxRank: number;
  leader: BumpSeriesRow | null;
  biggestClimber: BumpSeriesRow | null;
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

function buildRanks(
  players: SimplePlayer[],
  snapshot: SnapshotPoint["snapshot"],
  metricKey: string
) {
  return [...players]
    .map((player) => ({
      playerId: player.id,
      value: getChartMetricValue(snapshot?.[player.id], metricKey),
      name: playerName(player),
    }))
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value;
      return left.name.localeCompare(right.name);
    })
    .reduce<Record<string, number>>((accumulator, row, index) => {
      accumulator[row.playerId] = index + 1;
      return accumulator;
    }, {});
}

export function buildBumpChartModel(args: {
  players?: SimplePlayer[];
  data?: SnapshotPoint[];
  metricKey?: string | null;
}): BumpChartModel {
  const players = Array.isArray(args.players) ? args.players : [];
  const data = Array.isArray(args.data) ? args.data : [];
  const metricKey = String(args.metricKey || "totalPrestige");

  const rankSnapshots = data.map((point) =>
    buildRanks(players, point?.snapshot ?? {}, metricKey)
  );

  const series = players.map((player, index) => {
    const values = data.map((point) =>
      getChartMetricValue(point?.snapshot?.[player.id], metricKey)
    );
    const ranks = rankSnapshots.map((snapshot) => snapshot[player.id] ?? players.length);
    const startRank = ranks[0] ?? players.length;
    const latestRank = ranks[ranks.length - 1] ?? players.length;

    return {
      playerId: player.id,
      name: playerName(player),
      color: playerColor(player, index),
      values,
      ranks,
      startRank,
      latestRank,
      rankChange: startRank - latestRank,
    };
  });

  const rankedByLatest = [...series].sort((left, right) => {
    if (left.latestRank !== right.latestRank) return left.latestRank - right.latestRank;
    return right.rankChange - left.rankChange;
  });

  const biggestClimber =
    [...series].sort((left, right) => {
      if (right.rankChange !== left.rankChange) return right.rankChange - left.rankChange;
      return left.latestRank - right.latestRank;
    })[0] ?? null;

  return {
    series,
    labels: data.map((point, index) => String(point?.label || `Game ${index + 1}`)),
    maxRank: Math.max(1, players.length),
    leader: rankedByLatest[0] ?? null,
    biggestClimber,
  };
}
