import { calculateElo } from "@/utils/elo";
import { toNumber } from "@/utils/numbers";

const DEFAULT_ELO = 1000;

export function buildPlayerCardEloMap(games: unknown[]): Record<string, number> {
  try {
    const ratings = calculateElo(Array.isArray(games) ? (games as any[]) : []);
    return ratings && typeof ratings === "object"
      ? (ratings as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

export function resolvePlayerCardElo(
  playerId: string,
  eloMap: Record<string, number>,
  fallback = DEFAULT_ELO,
): number {
  const resolved =
    toNumber(eloMap?.[playerId]) ||
    toNumber(fallback) ||
    DEFAULT_ELO;

  return Math.round(resolved);
}
