import { getChartMetricValue } from "@/utils/chartMetricValue";

type PlayerLike = {
  id?: string | null;
  name?: string | null;
  color?: string | null;
};

type SnapshotLike = {
  label?: string | null;
  gameIndex?: number | null;
  snapshot?: Record<string, unknown> | null;
};

export type CompareChartPoint = {
  key: string;
  label: string;
  shortLabel: string;
  focusValue: number | null;
  compareValue: number | null;
};

export type CompareChartModel = {
  focusPlayer: {
    id: string;
    name: string;
    color?: string | null;
  };
  comparePlayer: {
    id: string;
    name: string;
    color?: string | null;
  };
  points: CompareChartPoint[];
  maxValue: number;
  focusGamesPlayed: number;
  compareGamesPlayed: number;
  sharedGamesPlayed: number;
  focusAverage: number;
  compareAverage: number;
  latestSharedGap: number | null;
};

type BuildCompareChartModelArgs = {
  snapshots?: SnapshotLike[] | null;
  players?: PlayerLike[] | null;
  focusPlayerId?: string | null;
  comparePlayerId?: string | null;
  metricKey: string;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildCompareChartModel(
  args: BuildCompareChartModelArgs,
): CompareChartModel | null {
  const snapshots = Array.isArray(args.snapshots) ? args.snapshots : [];
  const players = Array.isArray(args.players) ? args.players : [];
  const focusPlayerId = normalizeId(args.focusPlayerId);
  const comparePlayerId = normalizeId(args.comparePlayerId);

  if (!focusPlayerId || !comparePlayerId || focusPlayerId === comparePlayerId) {
    return null;
  }

  const focusPlayer =
    players.find((player) => normalizeId(player?.id) === focusPlayerId) ?? null;
  const comparePlayer =
    players.find((player) => normalizeId(player?.id) === comparePlayerId) ?? null;

  const points: CompareChartPoint[] = [];
  const focusValues: number[] = [];
  const compareValues: number[] = [];
  let sharedGamesPlayed = 0;

  snapshots.forEach((entry, index) => {
    const snapshot = isRecord(entry?.snapshot) ? entry.snapshot : null;
    const focusEntry = snapshot?.[focusPlayerId];
    const compareEntry = snapshot?.[comparePlayerId];

    if (!isRecord(focusEntry) && !isRecord(compareEntry)) {
      return;
    }

    const focusValue = isRecord(focusEntry)
      ? getChartMetricValue(focusEntry, args.metricKey)
      : null;
    const compareValue = isRecord(compareEntry)
      ? getChartMetricValue(compareEntry, args.metricKey)
      : null;

    if (focusValue != null) {
      focusValues.push(focusValue);
    }

    if (compareValue != null) {
      compareValues.push(compareValue);
    }

    if (focusValue != null && compareValue != null) {
      sharedGamesPlayed += 1;
    }

    const label = normalizeName(entry?.label, `Game ${index + 1}`);
    points.push({
      key: `${normalizeId(entry?.gameIndex) || index + 1}:${label}`,
      label,
      shortLabel: label.replace(/^Game\s+/i, "G"),
      focusValue,
      compareValue,
    });
  });

  if (!points.length) {
    return null;
  }

  const latestSharedPoint =
    [...points]
      .reverse()
      .find((point) => point.focusValue != null && point.compareValue != null) ?? null;
  const maxValue = Math.max(
    0,
    ...points.flatMap((point) =>
      [point.focusValue, point.compareValue].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      ),
    ),
  );

  return {
    focusPlayer: {
      id: focusPlayerId,
      name: normalizeName(focusPlayer?.name, "Focus"),
      color: focusPlayer?.color ?? null,
    },
    comparePlayer: {
      id: comparePlayerId,
      name: normalizeName(comparePlayer?.name, "Compare"),
      color: comparePlayer?.color ?? null,
    },
    points,
    maxValue,
    focusGamesPlayed: focusValues.length,
    compareGamesPlayed: compareValues.length,
    sharedGamesPlayed,
    focusAverage: average(focusValues),
    compareAverage: average(compareValues),
    latestSharedGap:
      latestSharedPoint &&
      latestSharedPoint.focusValue != null &&
      latestSharedPoint.compareValue != null
        ? latestSharedPoint.focusValue - latestSharedPoint.compareValue
        : null,
  };
}
