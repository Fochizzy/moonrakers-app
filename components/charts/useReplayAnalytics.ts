import { useMemo } from "react";

export type ReplayPlayer = {
  id: string;
  name: string;
  color?: string;
};

export type ReplayMetricKey =
  | "totalPrestige"
  | "directPrestige"
  | "assistPrestigeReceived"
  | "objectivePrestige"
  | "score"
  | "assists"
  | "contracts"
  | "failures"
  | "efficiency"
  | "prestigeDelta";

export type ReplaySnapshotRecord = Record<string, unknown> & {
  players?: Record<string, unknown>;
};

export type ReplayPoint = {
  round?: number;
  label?: string;
  snapshot?: ReplaySnapshotRecord;
};

export type ReplayMetricSummary = {
  leadingPlayer?: ReplayPlayer;
  peakValue: number;
  peakDisplay: string;
  summary: string;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getPlayerSnapshot(
  point: ReplayPoint | undefined,
  playerId: string
): Record<string, unknown> | undefined {
  const snapshot = point?.snapshot;
  if (!snapshot || typeof snapshot !== "object") return undefined;

  const direct = snapshot[playerId];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as Record<string, unknown>;
  }

  const nestedPlayers = snapshot.players;
  if (
    nestedPlayers &&
    typeof nestedPlayers === "object" &&
    !Array.isArray(nestedPlayers)
  ) {
    const nested = (nestedPlayers as Record<string, unknown>)[playerId];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }

  return undefined;
}

function readMetricValue(
  metricKey: ReplayMetricKey,
  point: ReplayPoint,
  player: ReplayPlayer,
  previousPoint?: ReplayPoint
): number {
  const current = getPlayerSnapshot(point, player.id);
  const previous = previousPoint
    ? getPlayerSnapshot(previousPoint, player.id)
    : undefined;

  const totalPrestige = toNumber(current?.totalPrestige ?? current?.prestige);
  const directPrestige = toNumber(current?.directPrestige);
  const assistPrestigeReceived = toNumber(current?.assistPrestigeReceived);
  const objectivePrestige = toNumber(
    current?.objectivePrestige ?? current?.objectiveCount
  );
  const score = toNumber(current?.score);
  const assists = toNumber(current?.assists);
  const contracts = toNumber(current?.contracts);
  const failures = toNumber(current?.failures);
  const efficiency = toNumber(current?.efficiency);

  switch (metricKey) {
    case "totalPrestige":
      return totalPrestige;
    case "directPrestige":
      return directPrestige;
    case "assistPrestigeReceived":
      return assistPrestigeReceived;
    case "objectivePrestige":
      return objectivePrestige;
    case "score":
      return score;
    case "assists":
      return assists;
    case "contracts":
      return contracts;
    case "failures":
      return failures;
    case "efficiency":
      return efficiency;
    case "prestigeDelta": {
      const prevPrestige = toNumber(previous?.totalPrestige ?? previous?.prestige);
      return totalPrestige - prevPrestige;
    }
    default:
      return totalPrestige;
  }
}

function buildDerivedReplay(
  replay: readonly ReplayPoint[],
  players: readonly ReplayPlayer[],
  metricKey: ReplayMetricKey
): ReplayPoint[] {
  return replay.map((point, index) => {
    const previousPoint = index > 0 ? replay[index - 1] : undefined;
    const snapshot: ReplaySnapshotRecord = {};

    for (const player of players) {
      snapshot[player.id] = {
        value: readMetricValue(metricKey, point, player, previousPoint),
      };
    }

    return {
      round: typeof point.round === "number" ? point.round : index + 1,
      label: point.label ?? `Round ${typeof point.round === "number" ? point.round : index + 1}`,
      snapshot,
    };
  });
}

function buildSummary(
  derivedReplay: ReplayPoint[],
  players: readonly ReplayPlayer[],
  metricKey: ReplayMetricKey
): ReplayMetricSummary {
  if (!derivedReplay.length || !players.length) {
    return {
      leadingPlayer: undefined,
      peakValue: 0,
      peakDisplay: "0",
      summary: `No replay data available for ${metricKey}.`,
    };
  }

  const lastPoint = derivedReplay[derivedReplay.length - 1];
  let leadingPlayer: ReplayPlayer | undefined;
  let peakValue = Number.NEGATIVE_INFINITY;

  for (const player of players) {
    const playerSnapshot = getPlayerSnapshot(lastPoint, player.id);
    const value = toNumber(playerSnapshot?.value);

    if (value > peakValue) {
      peakValue = value;
      leadingPlayer = player;
    }
  }

  if (!Number.isFinite(peakValue)) peakValue = 0;

  const labelMap: Record<ReplayMetricKey, string> = {
    totalPrestige: "Prestige",
    directPrestige: "direct prestige",
    assistPrestigeReceived: "assist prestige",
    objectivePrestige: "objective prestige",
    score: "score",
    assists: "assists",
    contracts: "contracts",
    failures: "failures",
    efficiency: "efficiency",
    prestigeDelta: "prestige delta",
  };

  return {
    leadingPlayer,
    peakValue,
    peakDisplay: String(round(peakValue, 2)),
    summary: leadingPlayer
      ? `${leadingPlayer.name} is currently leading ${labelMap[metricKey]} at ${round(
          peakValue,
          2
        )}.`
      : `Replay loaded for ${labelMap[metricKey]}.`,
  };
}

export function useReplayAnalytics(
  replay: readonly ReplayPoint[],
  players: readonly ReplayPlayer[],
  metricKey: ReplayMetricKey
) {
  const derivedReplay = useMemo(
    () => buildDerivedReplay(replay ?? [], players ?? [], metricKey),
    [replay, players, metricKey]
  );

  const summary = useMemo(
    () => buildSummary(derivedReplay, players ?? [], metricKey),
    [derivedReplay, players, metricKey]
  );

  return {
    derivedReplay,
    summary,
  };
}

export default useReplayAnalytics;
