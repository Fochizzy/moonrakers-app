// analyticsSlice.ts
export interface AnalyticsPlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  manualWins: number;
  totalPrestige: number;
  totalScore: number;
  totalDirectPrestige: number;
  totalAssistPrestigeReceived: number;
  totalContracts: number;
  totalAssists: number;
  totalFailures: number;
  prestigeHistory: number[];
  scoreHistory: number[];
}

export interface AnalyticsSlice {
  stats: Record<string, AnalyticsPlayerStats>;

  recordGame: (game: {
    winnerId?: string;
    selectedWinnerId?: string;
    manualWinnerId?: string;
    players: {
      id: string;
      totalPrestige?: number;
      prestige?: number;
      directPrestige?: number;
      assistPrestigeReceived?: number;
      score?: number;
      contracts?: number;
      assists?: number;
      failures?: number;
    }[];
  }) => void;

  getPlayerPerformance: (playerId: string) => {
    gamesPlayed: number;
    wins: number;
    manualWins: number;
    averagePrestige: number;
    averageScore: number;
    winRate: number;
  } | null;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(player: {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
}) {
  if (typeof player.totalPrestige === 'number' && Number.isFinite(player.totalPrestige)) {
    return player.totalPrestige;
  }

  if (typeof player.prestige === 'number' && Number.isFinite(player.prestige)) {
    return player.prestige;
  }

  return toNumber(player.directPrestige) + toNumber(player.assistPrestigeReceived);
}

export const createAnalyticsSlice = (set: any, get: any): AnalyticsSlice => ({
  stats: {},

  recordGame: (game) =>
    set((state: any) => {
      const updatedStats: Record<string, AnalyticsPlayerStats> = {
        ...(state.stats ?? {}),
      };

      for (const player of game.players ?? []) {
        const prestige = getTotalPrestige(player);
        const score = toNumber(player.score);
        const directPrestige = toNumber(player.directPrestige);
        const assistPrestigeReceived = toNumber(player.assistPrestigeReceived);
        const contracts = toNumber(player.contracts);
        const assists = toNumber(player.assists);
        const failures = toNumber(player.failures);

        const existing = updatedStats[player.id];

        updatedStats[player.id] = existing
          ? {
              ...existing,
              gamesPlayed: existing.gamesPlayed + 1,
              wins: existing.wins + (game.winnerId === player.id ? 1 : 0),
              manualWins:
                existing.manualWins +
                ((game.selectedWinnerId === player.id ||
                  game.manualWinnerId === player.id)
                  ? 1
                  : 0),
              totalPrestige: existing.totalPrestige + prestige,
              totalScore: existing.totalScore + score,
              totalDirectPrestige: existing.totalDirectPrestige + directPrestige,
              totalAssistPrestigeReceived:
                existing.totalAssistPrestigeReceived + assistPrestigeReceived,
              totalContracts: existing.totalContracts + contracts,
              totalAssists: existing.totalAssists + assists,
              totalFailures: existing.totalFailures + failures,
              prestigeHistory: [...existing.prestigeHistory, prestige],
              scoreHistory: [...existing.scoreHistory, score],
            }
          : {
              playerId: player.id,
              gamesPlayed: 1,
              wins: game.winnerId === player.id ? 1 : 0,
              manualWins:
                game.selectedWinnerId === player.id || game.manualWinnerId === player.id
                  ? 1
                  : 0,
              totalPrestige: prestige,
              totalScore: score,
              totalDirectPrestige: directPrestige,
              totalAssistPrestigeReceived: assistPrestigeReceived,
              totalContracts: contracts,
              totalAssists: assists,
              totalFailures: failures,
              prestigeHistory: [prestige],
              scoreHistory: [score],
            };
      }

      return { stats: updatedStats };
    }),

  getPlayerPerformance: (playerId: string) => {
    const player = get().stats?.[playerId];
    if (!player) return null;

    const gamesPlayed = player.gamesPlayed || 0;

    return {
      gamesPlayed,
      wins: player.wins,
      manualWins: player.manualWins,
      averagePrestige: gamesPlayed > 0 ? player.totalPrestige / gamesPlayed : 0,
      averageScore: gamesPlayed > 0 ? player.totalScore / gamesPlayed : 0,
      winRate: gamesPlayed > 0 ? player.wins / gamesPlayed : 0,
    };
  },
});
