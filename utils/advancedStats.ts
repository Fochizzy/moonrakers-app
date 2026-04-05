export type StoredTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

export type StoredGame = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, StoredTotals>;
  createdAt?: number;
};

export type Relationships = Record<string, Record<string, number>>;

export type CorrelationResult = {
  label: string;
  value: number;
  strength: string;
};

export type SynergyPair = {
  a: string;
  b: string;
  score: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(totals?: StoredTotals | null): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }
  return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const meanX = average(xs);
  const meanY = average(ys);

  let numerator = 0;
  let xSpread = 0;
  let ySpread = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    xSpread += dx * dx;
    ySpread += dy * dy;
  }

  const denominator = Math.sqrt(xSpread * ySpread);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

function correlationStrength(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.8) return 'Very Strong';
  if (abs >= 0.6) return 'Strong';
  if (abs >= 0.4) return 'Moderate';
  if (abs >= 0.2) return 'Weak';
  return 'Very Weak';
}

export function getPlayerAdvancedStats(
  games: StoredGame[],
  playerId: string,
  relationships: Relationships = {}
) {
  let gamesPlayed = 0;
  let wins = 0;

  let totalPrestige = 0;
  let directPrestige = 0;
  let assistPrestigeReceived = 0;
  let totalScore = 0;
  let totalAssists = 0;
  let totalFailures = 0;
  let totalContracts = 0;

  let totalGamePrestigePool = 0;
  let prestigeInWins = 0;
  let winGames = 0;

  const prestigeHistory: number[] = [];
  const recentPrestige: number[] = [];
  const synergyMap: Record<string, number> = {};

  for (const game of games) {
    const totals = game.totals?.[playerId];
    if (!totals) continue;

    gamesPlayed += 1;

    const prestige = getTotalPrestige(totals);
    const direct = toNumber(totals.directPrestige);
    const assistReceived = toNumber(
      totals.assistPrestigeReceived ?? prestige - direct
    );
    const score = toNumber(totals.score);
    const assists = toNumber(totals.assists);
    const failures = toNumber(totals.failures);
    const contracts = toNumber(totals.contracts);

    totalPrestige += prestige;
    directPrestige += direct;
    assistPrestigeReceived += assistReceived;
    totalScore += score;
    totalAssists += assists;
    totalFailures += failures;
    totalContracts += contracts;

    prestigeHistory.push(prestige);
    recentPrestige.push(prestige);
    if (recentPrestige.length > 5) {
      recentPrestige.shift();
    }

    const recordedWinnerId =
      game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;

    if (recordedWinnerId === playerId) {
      wins += 1;
      prestigeInWins += prestige;
      winGames += 1;
    }

    const gamePool = Object.values(game.totals ?? {}).reduce((sum, playerTotals) => {
      return sum + getTotalPrestige(playerTotals);
    }, 0);

    totalGamePrestigePool += gamePool;

    const assistSources = totals.assistPrestigeBySource ?? {};
    for (const [sourcePlayerId, amount] of Object.entries(assistSources)) {
      synergyMap[sourcePlayerId] =
        (synergyMap[sourcePlayerId] ?? 0) + toNumber(amount);
    }
  }

  const avgPrestige = gamesPlayed > 0 ? totalPrestige / gamesPlayed : 0;
  const avgScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;

  const assistShare =
    totalPrestige !== 0 ? assistPrestigeReceived / totalPrestige : 0;

  const assistDependency =
    totalContracts + totalAssists > 0
      ? totalAssists / (totalContracts + totalAssists)
      : 0;

  const efficiency =
    totalContracts + totalAssists > 0
      ? totalPrestige / (totalContracts + totalAssists)
      : 0;

  const assistedEfficiency =
    totalAssists > 0
      ? assistPrestigeReceived / totalAssists
      : 0;

  const directEfficiency =
    totalContracts > 0
      ? directPrestige / totalContracts
      : 0;

  const attempts = totalContracts + totalFailures;
  const failureRate = attempts > 0 ? totalFailures / attempts : 0;

  const volatility = standardDeviation(prestigeHistory);

  const consistencyScore =
    avgPrestige !== 0
      ? Math.max(0, 1 - volatility / Math.max(Math.abs(avgPrestige), 1))
      : 0;

  const recentAverage = average(recentPrestige);
  const longTermAverage = average(prestigeHistory);
  const momentum = recentAverage - longTermAverage;

  const impactScore =
    totalGamePrestigePool !== 0 ? totalPrestige / totalGamePrestigePool : 0;

  const avgPrestigeInWins = winGames > 0 ? prestigeInWins / winGames : 0;
  const winImpact =
    avgPrestige !== 0 ? avgPrestigeInWins / avgPrestige : 0;

  const bestTeammateId =
    Object.entries(synergyMap).sort((a, b) => b[1] - a[1])[0]?.[0];

  let playstyle = 'Balanced';
  if (assistShare >= 0.5) {
    playstyle = 'Support';
  } else if (directEfficiency >= 2 && avgPrestige > avgScore) {
    playstyle = 'Strategist';
  } else if (avgScore > avgPrestige * 1.5) {
    playstyle = 'Aggressive';
  } else if (avgPrestige > avgScore * 1.5) {
    playstyle = 'Builder';
  }

  return {
    gamesPlayed,
    wins,
    totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    totalScore,
    totalAssists,
    totalFailures,
    totalContracts,
    avgPrestige,
    avgScore,
    assistShare,
    assistDependency,
    efficiency,          // All Eff
    assistedEfficiency,  // Assist Eff
    directEfficiency,
    failureRate,
    volatility,
    consistencyScore,
    momentum,
    impactScore,
    winImpact,
    bestTeammateId,
    playstyle,
    relationships: relationships[playerId] ?? {},
  };
}

export function getArchetype(stats: {
  avgPrestige: number;
  avgScore: number;
  assistShare: number;
  efficiency: number;
  directEfficiency?: number;
}) {
  const { avgPrestige, avgScore, assistShare, efficiency, directEfficiency = 0 } = stats;

  if (assistShare > 0.4) return 'Support';
  if (directEfficiency > 1.5 && avgPrestige > avgScore) return 'Strategist';
  if (avgScore > avgPrestige * 1.5) return 'Aggressive';
  if (avgPrestige > avgScore * 1.5) return 'Builder';

  if (efficiency > 1.5) return 'Balanced+';
  return 'Balanced';
}

export function getArchetypeRadar(stats: {
  efficiency: number;
  avgScore: number;
  assistShare: number;
  avgPrestige: number;
}) {
  return {
    Strategy: stats.efficiency,
    Aggression: stats.avgScore / 10,
    Support: stats.assistShare,
    Growth: stats.avgPrestige / 10,
  };
}

export function buildCorrelationResults(
  games: StoredGame[] = [],
  _relationships: Relationships = {}
): CorrelationResult[] {
  const contracts: number[] = [];
  const assists: number[] = [];
  const failures: number[] = [];
  const prestige: number[] = [];
  const score: number[] = [];
  const allEff: number[] = [];
  const assistEff: number[] = [];
  const directEff: number[] = [];

  for (const game of games) {
    for (const totals of Object.values(game.totals ?? {})) {
      const contractCount = toNumber(totals.contracts);
      const assistCount = toNumber(totals.assists);
      const total = getTotalPrestige(totals);
      const direct = toNumber(totals.directPrestige);
      const assistIn = toNumber(totals.assistPrestigeReceived);

      contracts.push(contractCount);
      assists.push(assistCount);
      failures.push(toNumber(totals.failures));
      prestige.push(total);
      score.push(toNumber(totals.score));
      allEff.push(contractCount + assistCount > 0 ? total / (contractCount + assistCount) : 0);
      assistEff.push(assistCount > 0 ? assistIn / assistCount : 0);
      directEff.push(contractCount > 0 ? direct / contractCount : 0);
    }
  }

  const results: CorrelationResult[] = [
    {
      label: 'Contracts vs Total Prestige',
      value: correlation(contracts, prestige),
      strength: correlationStrength(correlation(contracts, prestige)),
    },
    {
      label: 'Assists vs Total Prestige',
      value: correlation(assists, prestige),
      strength: correlationStrength(correlation(assists, prestige)),
    },
    {
      label: 'All Eff vs Score',
      value: correlation(allEff, score),
      strength: correlationStrength(correlation(allEff, score)),
    },
    {
      label: 'Assist Eff vs Total Prestige',
      value: correlation(assistEff, prestige),
      strength: correlationStrength(correlation(assistEff, prestige)),
    },
    {
      label: 'Direct Eff vs Total Prestige',
      value: correlation(directEff, prestige),
      strength: correlationStrength(correlation(directEff, prestige)),
    },
  ];

  return results;
}

export function getTopSynergyPairs(
  relationships: Relationships = {},
  limit = 5
): SynergyPair[] {
  const pairMap = new Map<string, SynergyPair>();

  for (const [a, links] of Object.entries(relationships)) {
    for (const [b, rawValue] of Object.entries(links ?? {})) {
      if (a === b) continue;

      const key = [a, b].sort().join('::');
      const current = pairMap.get(key) ?? {
        a: [a, b].sort()[0],
        b: [a, b].sort()[1],
        score: 0,
      };

      current.score += toNumber(rawValue);
      pairMap.set(key, current);
    }
  }

  return [...pairMap.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
