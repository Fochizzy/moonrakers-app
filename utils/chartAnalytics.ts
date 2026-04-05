type Player = {
  id: string;
  name?: string;
  color?: string;
};

type StoredTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeGiven?: number;
  objectivePrestige?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type StoredGamePlayer = {
  id: string;
  startOrder?: number;
};

type RoundLike = {
  leaderId?: string;
  leadingPlayerId?: string;
  winnerId?: string;
  scores?: Record<string, number>;
  prestige?: Record<string, number>;
  totals?: Record<string, number>;
};

type StoredGame = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: StoredGamePlayer[];
  totals?: Record<string, StoredTotals>;
  rounds?: RoundLike[];
  turnHistory?: RoundLike[];
  history?: RoundLike[];
};

export type PlayerAggregateMetrics = {
  playerId: string;
  name: string;
  color?: string;

  gamesPlayed: number;
  wins: number;
  winRate: number;

  totalPrestige: number;
  totalDirectPrestige: number;
  totalAssistPrestigeReceived: number;
  totalAssistPrestigeGiven: number;
  totalObjectivePrestige: number;
  totalScore: number;
  totalAssistsGiven: number;
  totalFailures: number;
  totalContracts: number;

  avgPrestigePerGame: number;
  avgDirectPrestigePerGame: number;
  avgAssistPrestigeReceivedPerGame: number;
  avgAssistPrestigeGivenPerGame: number;
  avgObjectivePrestigePerGame: number;
  avgScorePerGame: number;
  avgAssistsGivenPerGame: number;
  avgFailuresPerGame: number;
  avgContractsPerGame: number;

  efficiency: number;
  assistedEfficiency: number;
  directEfficiency: number;
  efficiencyTier: string;
  assistEfficiencyTier: string;
  directEfficiencyTier: string;
  contractFailureRatio: number;
  failureRate: number;

  earlyLeadGames: number;
  earlyLeadRate: number;
  comebackWins: number;
  comebackRate: number;
  leadConversionWins: number;
  leadConversionRate: number;

  avgSeat: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getWinnerId(game: StoredGame): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getTotalPrestige(totals?: StoredTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    toNumber(totals?.directPrestige) +
    toNumber(totals?.assistPrestigeReceived) +
    toNumber(totals?.objectivePrestige)
  );
}

function getRounds(game: StoredGame): RoundLike[] {
  if (Array.isArray(game.rounds)) return game.rounds;
  if (Array.isArray(game.turnHistory)) return game.turnHistory;
  if (Array.isArray(game.history)) return game.history;
  return [];
}

function getRoundLeaderId(round: RoundLike): string | undefined {
  if (round.leaderId) return round.leaderId;
  if (round.leadingPlayerId) return round.leadingPlayerId;

  const pools = [round.prestige, round.totals, round.scores];
  for (const pool of pools) {
    if (!pool || typeof pool !== 'object') continue;

    let bestId: string | undefined;
    let bestValue = Number.NEGATIVE_INFINITY;

    for (const [playerId, raw] of Object.entries(pool)) {
      const value = toNumber(raw);
      if (value > bestValue) {
        bestValue = value;
        bestId = playerId;
      }
    }

    if (bestId) return bestId;
  }

  return undefined;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function getEfficiencyTier(value: number): string {
  if (value >= 2) return 'Elite';
  if (value >= 1.5) return 'Strong';
  if (value >= 1) return 'Average';
  return 'Inefficient';
}

export function buildPlayerAggregateMetrics(
  gamesInput: unknown,
  playersInput: unknown
): PlayerAggregateMetrics[] {
  const games = Array.isArray(gamesInput) ? (gamesInput as StoredGame[]) : [];
  const players = Array.isArray(playersInput) ? (playersInput as Player[]) : [];

  return players.map((player) => {
    let gamesPlayed = 0;
    let wins = 0;

    let totalPrestige = 0;
    let totalDirectPrestige = 0;
    let totalAssistPrestigeReceived = 0;
    let totalAssistPrestigeGiven = 0;
    let totalObjectivePrestige = 0;
    let totalScore = 0;
    let totalAssistsGiven = 0;
    let totalFailures = 0;
    let totalContracts = 0;

    let earlyLeadGames = 0;
    let comebackWins = 0;
    let leadConversionWins = 0;

    const seats: number[] = [];

    for (const game of games) {
      const totals = game.totals?.[player.id];
      if (!totals) continue;

      gamesPlayed += 1;

      totalPrestige += getTotalPrestige(totals);
      totalDirectPrestige += toNumber(totals.directPrestige);
      totalAssistPrestigeReceived += toNumber(totals.assistPrestigeReceived);
      totalAssistPrestigeGiven += toNumber(totals.assistPrestigeGiven);
      totalObjectivePrestige += toNumber(totals.objectivePrestige);
      totalScore += toNumber(totals.score);
      totalAssistsGiven += toNumber(totals.assists);
      totalFailures += toNumber(totals.failures);
      totalContracts += toNumber(totals.contracts);

      const winnerId = getWinnerId(game);
      if (winnerId === player.id) {
        wins += 1;
      }

      const gamePlayer = (game.players ?? []).find((p) => p.id === player.id);
      if (
        gamePlayer &&
        typeof gamePlayer.startOrder === 'number' &&
        Number.isFinite(gamePlayer.startOrder)
      ) {
        seats.push(gamePlayer.startOrder + 1);
      }

      const rounds = getRounds(game);
      if (rounds.length > 0) {
        const firstLeaderId = getRoundLeaderId(rounds[0]);
        const finalWinnerId = winnerId ?? rounds[rounds.length - 1]?.winnerId;

        if (firstLeaderId === player.id) {
          earlyLeadGames += 1;
        }

        if (firstLeaderId !== player.id && finalWinnerId === player.id) {
          comebackWins += 1;
        }

        if (firstLeaderId === player.id && finalWinnerId === player.id) {
          leadConversionWins += 1;
        }
      }
    }

    return {
      playerId: player.id,
      name: player.name ?? 'Unknown',
      color: player.color,

      gamesPlayed,
      wins,
      winRate: safeDivide(wins, gamesPlayed),

      totalPrestige,
      totalDirectPrestige,
      totalAssistPrestigeReceived,
      totalAssistPrestigeGiven,
      totalObjectivePrestige,
      totalScore,
      totalAssistsGiven,
      totalFailures,
      totalContracts,

      avgPrestigePerGame: safeDivide(totalPrestige, gamesPlayed),
      avgDirectPrestigePerGame: safeDivide(totalDirectPrestige, gamesPlayed),
      avgAssistPrestigeReceivedPerGame: safeDivide(totalAssistPrestigeReceived, gamesPlayed),
      avgAssistPrestigeGivenPerGame: safeDivide(totalAssistPrestigeGiven, gamesPlayed),
      avgObjectivePrestigePerGame: safeDivide(totalObjectivePrestige, gamesPlayed),
      avgScorePerGame: safeDivide(totalScore, gamesPlayed),
      avgAssistsGivenPerGame: safeDivide(totalAssistsGiven, gamesPlayed),
      avgFailuresPerGame: safeDivide(totalFailures, gamesPlayed),
      avgContractsPerGame: safeDivide(totalContracts, gamesPlayed),

      efficiency: safeDivide(totalDirectPrestige + totalAssistPrestigeReceived, totalContracts + totalAssistsGiven),
      assistedEfficiency: safeDivide(totalAssistPrestigeReceived, totalAssistsGiven),
      directEfficiency: safeDivide(totalDirectPrestige, totalContracts),
      efficiencyTier: getEfficiencyTier(
        safeDivide(totalDirectPrestige + totalAssistPrestigeReceived, totalContracts + totalAssistsGiven)
      ),
      assistEfficiencyTier: getEfficiencyTier(
        safeDivide(totalAssistPrestigeReceived, totalAssistsGiven)
      ),
      directEfficiencyTier: getEfficiencyTier(safeDivide(totalDirectPrestige, totalContracts)),
      contractFailureRatio: safeDivide(totalContracts, Math.max(1, totalFailures)),
      failureRate: safeDivide(totalFailures, Math.max(1, totalContracts)),

      earlyLeadGames,
      earlyLeadRate: safeDivide(earlyLeadGames, gamesPlayed),
      comebackWins,
      comebackRate: safeDivide(comebackWins, gamesPlayed),
      leadConversionWins,
      leadConversionRate: safeDivide(leadConversionWins, Math.max(1, earlyLeadGames)),

      avgSeat: average(seats),
    };
  });
}
