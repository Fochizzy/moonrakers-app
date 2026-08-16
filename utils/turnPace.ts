import { isPlayableTurnMetaType } from "@/utils/headToHeadMission";

type PaceRoundLike = {
  playerId?: string | null;
  createdAt?: number | null;
  metaType?: string | null;
};

type PacePlayerLike = {
  id: string;
  name?: string | null;
};

export type PlayerPace = {
  playerId: string;
  name: string;
  turns: number;
  medianTurnMs: number;
  longestTurnMs: number;
  totalTurnMs: number;
  /** Share of measured table time this player accounted for, 0-1. */
  tableShare: number;
};

export type GamePace = {
  /** First to last saved turn. Excludes time before the first turn was saved. */
  gameDurationMs: number;
  measuredTurns: number;
  medianTurnMs: number;
  longestTurnMs: number;
  players: PlayerPace[];
};

function toMillis(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

/**
 * Derives per-turn timing from the `createdAt` stamp each saved round already
 * carries. A turn's length is the gap between the previous saved turn and this
 * one, so it measures wall-clock time at the table, not thinking time alone —
 * the first turn has no predecessor and is excluded.
 *
 * Medians rather than means, because one turn interrupted by a pizza delivery
 * would otherwise dominate a whole game's numbers. Returns null when there are
 * not enough timestamps to measure anything.
 */
export function buildGamePace(
  rounds: PaceRoundLike[],
  players: PacePlayerLike[] = [],
): GamePace | null {
  const timedTurns = (Array.isArray(rounds) ? rounds : [])
    .filter((round) => isPlayableTurnMetaType(round?.metaType))
    .map((round) => ({
      playerId: String(round?.playerId ?? "").trim(),
      createdAt: toMillis(round?.createdAt),
    }))
    .filter((round): round is { playerId: string; createdAt: number } =>
      Boolean(round.playerId && round.createdAt),
    )
    .sort((left, right) => left.createdAt - right.createdAt);

  if (timedTurns.length < 2) {
    return null;
  }

  const nameById = new Map(
    (Array.isArray(players) ? players : []).map((player) => [
      String(player?.id ?? "").trim(),
      String(player?.name ?? "").trim(),
    ]),
  );

  const durationsByPlayer = new Map<string, number[]>();
  const allDurations: number[] = [];

  for (let index = 1; index < timedTurns.length; index += 1) {
    const turn = timedTurns[index];
    const elapsed = turn.createdAt - timedTurns[index - 1].createdAt;
    if (elapsed <= 0) continue;

    allDurations.push(elapsed);
    const existing = durationsByPlayer.get(turn.playerId);
    if (existing) {
      existing.push(elapsed);
    } else {
      durationsByPlayer.set(turn.playerId, [elapsed]);
    }
  }

  if (!allDurations.length) {
    return null;
  }

  const measuredTotal = allDurations.reduce((sum, value) => sum + value, 0);

  const playerPace: PlayerPace[] = [...durationsByPlayer.entries()]
    .map(([playerId, durations]) => {
      const totalTurnMs = durations.reduce((sum, value) => sum + value, 0);

      return {
        playerId,
        name: nameById.get(playerId) || "Unknown",
        turns: durations.length,
        medianTurnMs: median(durations),
        longestTurnMs: Math.max(...durations),
        totalTurnMs,
        tableShare: measuredTotal > 0 ? totalTurnMs / measuredTotal : 0,
      };
    })
    .sort((left, right) => right.medianTurnMs - left.medianTurnMs);

  return {
    gameDurationMs:
      timedTurns[timedTurns.length - 1].createdAt - timedTurns[0].createdAt,
    measuredTurns: allDurations.length,
    medianTurnMs: median(allDurations),
    longestTurnMs: Math.max(...allDurations),
    players: playerPace,
  };
}

/** Compact duration for UI chips: 45s, 3m 20s, 1h 12m. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(Number(ms) || 0));
  const seconds = Math.round(total / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainder = seconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes ? `${hours}h ${remainderMinutes}m` : `${hours}h`;
}
