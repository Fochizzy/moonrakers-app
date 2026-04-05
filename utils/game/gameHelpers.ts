export type Player = {
  id: string;
  name: string;
  color?: string;
  startOrder?: number;
};

export type PlayerTotalsLike = {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type GameLike = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, PlayerTotalsLike>;
  players?: Player[];
  createdAt?: number | string | Date;
};

export type RankedPlayer = {
  player: Player;
  totalPrestige: number;
  score: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assists: number;
  failures: number;
  contracts: number;
  performance: number;
  efficiency: number;
  assistedEfficiency: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getTotalPrestige(
  totals?: Partial<PlayerTotalsLike> | null
): number {
  if (!totals) return 0;

  if (typeof totals.totalPrestige === 'number' && Number.isFinite(totals.totalPrestige)) {
    return totals.totalPrestige;
  }

  if (typeof totals.prestige === 'number' && Number.isFinite(totals.prestige)) {
    return totals.prestige;
  }

  return toNumber(totals.directPrestige) + toNumber(totals.assistPrestigeReceived);
}

export function normalizePlayerTotals(
  totals?: Partial<PlayerTotalsLike> | null
): Required<PlayerTotalsLike> {
  const directPrestige = toNumber(totals?.directPrestige);
  const assistPrestigeReceived = toNumber(totals?.assistPrestigeReceived);
  const totalPrestige = getTotalPrestige(totals);
  const contracts = Math.max(0, toNumber(totals?.contracts));
  const assists = Math.max(0, toNumber(totals?.assists));
  const failures = Math.max(0, toNumber(totals?.failures));
  const performance =
    typeof totals?.performance === 'number' && Number.isFinite(totals.performance)
      ? totals.performance
      : totalPrestige - failures;
  const efficiency =
    typeof totals?.efficiency === 'number' && Number.isFinite(totals.efficiency)
      ? totals.efficiency
      : contracts > 0
        ? totalPrestige / contracts
        : totalPrestige;
  const assistedDenominator = contracts + assists;
  const assistedEfficiency =
    typeof totals?.assistedEfficiency === 'number' && Number.isFinite(totals.assistedEfficiency)
      ? totals.assistedEfficiency
      : assistedDenominator > 0
        ? totalPrestige / assistedDenominator
        : totalPrestige;
  const score =
    typeof totals?.score === 'number' && Number.isFinite(totals.score)
      ? totals.score
      : totalPrestige + contracts * 5 + (assists > 0 ? 3 : 0) - failures * 4;

  return {
    totalPrestige,
    prestige: totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeBySource: totals?.assistPrestigeBySource ?? {},
    score,
    assists,
    failures,
    contracts,
    performance,
    efficiency,
    assistedEfficiency,
  };
}

export function rankPlayersByTotals(
  players: readonly Player[] = [],
  totals: Record<string, PlayerTotalsLike> = {}
): RankedPlayer[] {
  return [...players]
    .map((player) => {
      const normalized = normalizePlayerTotals(totals[player.id]);

      return {
        player,
        totalPrestige: normalized.totalPrestige,
        score: normalized.score,
        directPrestige: normalized.directPrestige,
        assistPrestigeReceived: normalized.assistPrestigeReceived,
        assists: normalized.assists,
        failures: normalized.failures,
        contracts: normalized.contracts,
        performance: normalized.performance,
        efficiency: normalized.efficiency,
        assistedEfficiency: normalized.assistedEfficiency,
      };
    })
    .sort((a, b) => {
      if (b.totalPrestige !== a.totalPrestige) {
        return b.totalPrestige - a.totalPrestige;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.player.name.localeCompare(b.player.name);
    });
}

export function getLeadingPlayerIds(
  players: readonly Player[] = [],
  totals: Record<string, PlayerTotalsLike> = {}
): string[] {
  const ranking = rankPlayersByTotals(players, totals);
  if (!ranking.length) return [];

  const best = ranking[0].totalPrestige;
  return ranking
    .filter((entry) => entry.totalPrestige === best)
    .map((entry) => entry.player.id);
}

export function getWinnerId(
  players: readonly Player[] = [],
  totals: Record<string, PlayerTotalsLike> = {},
  selectedWinnerId?: string | null
): string | undefined {
  const leaders = getLeadingPlayerIds(players, totals);

  if (leaders.length === 1) {
    return leaders[0];
  }

  if (selectedWinnerId && leaders.includes(selectedWinnerId)) {
    return selectedWinnerId;
  }

  return undefined;
}

export function getWinner(
  players: readonly Player[] = [],
  totals: Record<string, PlayerTotalsLike> = {},
  selectedWinnerId?: string | null
): Player | null {
  const winnerId = getWinnerId(players, totals, selectedWinnerId);
  if (!winnerId) return null;
  return players.find((player) => player.id === winnerId) ?? null;
}

export function getGameWinner(game?: GameLike | null): Player | null {
  if (!game) return null;

  const players = Array.isArray(game.players) ? game.players : [];
  const selectedWinnerId = game.selectedWinnerId ?? game.manualWinnerId ?? null;
  const resolvedWinnerId =
    game.winnerId ?? getWinnerId(players, game.totals ?? {}, selectedWinnerId);

  if (!resolvedWinnerId) return null;
  return players.find((player) => player.id === resolvedWinnerId) ?? null;
}
