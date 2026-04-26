import type { NormalizedGame, PlayerTotals } from "../../../utils/charts";

export type AssistNetworkImpactCard = {
  label: "Total Prestige" | "Winning" | "Efficiency";
  sampleValue: number;
  baselineValue: number;
  delta: number;
};

export type AssistNetworkImpactResult = {
  sampleGameCount: number;
  cards: {
    totalPrestige: AssistNetworkImpactCard;
    winning: AssistNetworkImpactCard;
    efficiency: AssistNetworkImpactCard;
  };
};

type PlayerSampleRow = {
  gamesPlayed: number;
  totalPrestige: number;
  winning: number;
  efficiency: number;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlayerId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeScopedPlayerIds(scopedPlayerIds?: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawId of scopedPlayerIds ?? []) {
    const id = normalizePlayerId(rawId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function matchesExactPlayerScope(game: NormalizedGame, scopedPlayerIds: string[]) {
  const gameIds = new Set(
    (game.players ?? [])
      .map((player) => normalizePlayerId(player?.id))
      .filter(Boolean)
  );

  if (gameIds.size !== scopedPlayerIds.length) return false;
  return scopedPlayerIds.every((id) => gameIds.has(id));
}

function getResolvedWinnerId(game: NormalizedGame): string {
  return normalizePlayerId(
    game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId
  );
}

function getTotalsMetrics(totals?: PlayerTotals | null) {
  const totalPrestige =
    toNumber(totals?.totalPrestige ?? totals?.prestige) ||
    toNumber(totals?.directPrestige) +
      toNumber(totals?.assistPrestigeReceived) +
      toNumber(totals?.objectivePrestige ?? totals?.objectiveCount);

  const turns = toNumber(totals?.turns ?? totals?.turnCount);
  const efficiency =
    toNumber(totals?.efficiency) ||
    (turns > 0 ? totalPrestige / turns : totalPrestige);

  return { totalPrestige, efficiency };
}

function playerAppearsInGame(game: NormalizedGame, playerId: string): boolean {
  if (normalizePlayerId(playerId) in (game?.totals ?? {})) return true;
  return (game.players ?? []).some(
    (player) => normalizePlayerId(player?.id) === normalizePlayerId(playerId)
  );
}

function collectPlayerSampleRow(
  games: NormalizedGame[],
  playerId: string
): PlayerSampleRow {
  let gamesPlayed = 0;
  let totalPrestige = 0;
  let wins = 0;
  let efficiency = 0;

  for (const game of games) {
    if (!playerAppearsInGame(game, playerId)) continue;
    gamesPlayed += 1;

    const totals = game?.totals?.[playerId];
    const metrics = getTotalsMetrics(totals);
    totalPrestige += metrics.totalPrestige;
    efficiency += metrics.efficiency;
    if (getResolvedWinnerId(game) === normalizePlayerId(playerId)) {
      wins += 1;
    }
  }

  if (!gamesPlayed) {
    return {
      gamesPlayed: 0,
      totalPrestige: 0,
      winning: 0,
      efficiency: 0,
    };
  }

  return {
    gamesPlayed,
    totalPrestige: totalPrestige / gamesPlayed,
    winning: (wins / gamesPlayed) * 100,
    efficiency: efficiency / gamesPlayed,
  };
}

function averageMetric(
  rows: PlayerSampleRow[],
  key: "totalPrestige" | "winning" | "efficiency"
): number {
  const relevant = rows.filter((row) => row.gamesPlayed > 0);
  if (!relevant.length) return 0;
  return (
    relevant.reduce((sum, row) => sum + toNumber(row[key]), 0) / relevant.length
  );
}

function buildImpactCards(
  sampleRows: PlayerSampleRow[],
  overallRows: PlayerSampleRow[],
  sampleGameCount: number
): AssistNetworkImpactResult {
  const sampleTotalPrestige = averageMetric(sampleRows, "totalPrestige");
  const baselineTotalPrestige = averageMetric(overallRows, "totalPrestige");
  const sampleWinning = averageMetric(sampleRows, "winning");
  const baselineWinning = averageMetric(overallRows, "winning");
  const sampleEfficiency = averageMetric(sampleRows, "efficiency");
  const baselineEfficiency = averageMetric(overallRows, "efficiency");

  return {
    sampleGameCount,
    cards: {
      totalPrestige: {
        label: "Total Prestige",
        sampleValue: sampleTotalPrestige,
        baselineValue: baselineTotalPrestige,
        delta: sampleTotalPrestige - baselineTotalPrestige,
      },
      winning: {
        label: "Winning",
        sampleValue: sampleWinning,
        baselineValue: baselineWinning,
        delta: sampleWinning - baselineWinning,
      },
      efficiency: {
        label: "Efficiency",
        sampleValue: sampleEfficiency,
        baselineValue: baselineEfficiency,
        delta: sampleEfficiency - baselineEfficiency,
      },
    },
  };
}

export function buildAssistNetworkImpact({
  games,
  exactScopePlayerIds,
}: {
  games: NormalizedGame[];
  exactScopePlayerIds?: string[];
}): AssistNetworkImpactResult {
  const normalizedGames = Array.isArray(games) ? games : [];
  const normalizedExactScopeIds = normalizeScopedPlayerIds(exactScopePlayerIds);
  const exactScopeApplied = normalizedExactScopeIds.length >= 2;
  const exactGames = exactScopeApplied
    ? normalizedGames.filter((game) =>
        matchesExactPlayerScope(game, normalizedExactScopeIds)
      )
    : normalizedGames;

  const playerIds = normalizedExactScopeIds.length
    ? normalizedExactScopeIds
    : Array.from(
        new Set(
          exactGames.flatMap((game) =>
            (game.players ?? []).map((player) => normalizePlayerId(player.id))
          )
        )
      ).filter(Boolean);

  const sampleRows = playerIds.map((playerId) =>
    collectPlayerSampleRow(exactGames, playerId)
  );
  const overallRows = playerIds.map((playerId) =>
    collectPlayerSampleRow(normalizedGames, playerId)
  );

  return buildImpactCards(sampleRows, overallRows, exactGames.length);
}

export default buildAssistNetworkImpact;
