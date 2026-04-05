////////////////////////////////////////////////////////////////////////////////
// Shared helpers
////////////////////////////////////////////////////////////////////////////////

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
};

type StoredGamePlayer = {
  id: string;
  startOrder?: number;
};

type StoredRound = {
  id?: string;
  playerId: string;
  prestige?: number;
  contracts?: number;
  failures?: number;
  assistRecipients?: Record<string, number>;
  assistPrestigeRecipients?: Record<string, number>;
  createdAt?: number;
};

type StoredTotals = {
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  performance?: number;
};

type StoredGame = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: StoredGamePlayer[];
  totals?: Record<string, StoredTotals>;
  rounds?: StoredRound[];
};

type CorrelationResult = {
  label: string;
  value: number;
  strength: string;
};

type SynergyPair = {
  a: string;
  b: string;
  score: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getWinnerId(game: StoredGame): string | null {
  return (
    game?.winnerId ??
    game?.selectedWinnerId ??
    game?.manualWinnerId ??
    null
  );
}

function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return numerator / denom;
}

function getStrengthLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'very weak';
}

function sortPlayersByStartOrder(players: StoredGamePlayer[] = []) {
  return [...players].sort((a, b) => {
    const aOrder = Number.isFinite(a?.startOrder) ? Number(a.startOrder) : 999;
    const bOrder = Number.isFinite(b?.startOrder) ? Number(b.startOrder) : 999;
    return aOrder - bOrder;
  });
}

function createEmptyTotals(): StoredTotals {
  return {
    score: 0,
    prestige: 0,
    totalPrestige: 0,
    assists: 0,
    failures: 0,
    contracts: 0,
    directPrestige: 0,
    assistPrestigeReceived: 0,
    assistPrestigeBySource: {},
    performance: 0,
  };
}

function cloneTotalsMap(
  source: Record<string, StoredTotals> | undefined,
  playerIds: string[]
): Record<string, StoredTotals> {
  const result: Record<string, StoredTotals> = {};
  for (const id of playerIds) {
    const t = source?.[id] ?? {};
    result[id] = {
      score: toNumber(t.score),
      prestige: toNumber(t.prestige),
      totalPrestige: toNumber(t.totalPrestige),
      assists: toNumber(t.assists),
      failures: toNumber(t.failures),
      contracts: toNumber(t.contracts),
      directPrestige: toNumber(t.directPrestige),
      assistPrestigeReceived: toNumber(t.assistPrestigeReceived),
      assistPrestigeBySource: { ...(t.assistPrestigeBySource ?? {}) },
      performance: toNumber(t.performance),
    };
  }
  return result;
}

function deriveTotalsFromRounds(game: StoredGame): Record<string, StoredTotals> {
  const players = Array.isArray(game?.players) ? game.players : [];
  const playerIds = players.map((p) => p.id).filter(Boolean);

  if (playerIds.length === 0) return {};

  const totals = cloneTotalsMap(game?.totals, playerIds);

  const hasMeaningfulStoredTotals = playerIds.some((id) => {
    const t = totals[id];
    return (
      toNumber(t.totalPrestige) !== 0 ||
      toNumber(t.prestige) !== 0 ||
      toNumber(t.contracts) !== 0 ||
      toNumber(t.failures) !== 0 ||
      toNumber(t.assists) !== 0 ||
      toNumber(t.assistPrestigeReceived) !== 0 ||
      toNumber(t.score) !== 0
    );
  });

  if (hasMeaningfulStoredTotals) {
    for (const id of playerIds) {
      const t = totals[id];
      const directPrestige = toNumber(t.directPrestige || t.prestige);
      const assistPrestigeReceived = toNumber(t.assistPrestigeReceived);
      const totalPrestige = toNumber(
        t.totalPrestige || directPrestige + assistPrestigeReceived
      );

      totals[id] = {
        ...createEmptyTotals(),
        ...t,
        directPrestige,
        prestige: directPrestige,
        assistPrestigeReceived,
        totalPrestige,
        score:
          toNumber(t.score) ||
          directPrestige + toNumber(t.contracts) - toNumber(t.failures),
      };
    }

    return totals;
  }

  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];

  for (const id of playerIds) {
    totals[id] = createEmptyTotals();
  }

  for (const round of rounds) {
    const actorId = round?.playerId;
    if (!actorId || !totals[actorId]) continue;

    const directPrestige = toNumber(round.prestige);
    const contracts = toNumber(round.contracts);
    const failures = toNumber(round.failures);

    totals[actorId].directPrestige = toNumber(totals[actorId].directPrestige) + directPrestige;
    totals[actorId].prestige = toNumber(totals[actorId].prestige) + directPrestige;
    totals[actorId].contracts = toNumber(totals[actorId].contracts) + contracts;
    totals[actorId].failures = toNumber(totals[actorId].failures) + failures;
    totals[actorId].score =
      toNumber(totals[actorId].score) + directPrestige + contracts - failures;

    const assistRecipients = round.assistRecipients ?? {};
    for (const [recipientId, rawCount] of Object.entries(assistRecipients)) {
      const count = toNumber(rawCount);
      if (!count) continue;
      totals[actorId].assists = toNumber(totals[actorId].assists) + count;
      if (!totals[recipientId]) {
        totals[recipientId] = createEmptyTotals();
      }
    }

    const assistPrestigeRecipients = round.assistPrestigeRecipients ?? {};
    for (const [recipientId, rawValue] of Object.entries(assistPrestigeRecipients)) {
      const value = toNumber(rawValue);
      if (!value) continue;

      if (!totals[recipientId]) {
        totals[recipientId] = createEmptyTotals();
      }

      totals[recipientId].assistPrestigeReceived =
        toNumber(totals[recipientId].assistPrestigeReceived) + value;

      const bySource = totals[recipientId].assistPrestigeBySource ?? {};
      bySource[actorId] = toNumber(bySource[actorId]) + value;
      totals[recipientId].assistPrestigeBySource = bySource;
    }
  }

  for (const id of Object.keys(totals)) {
    const t = totals[id];
    t.totalPrestige =
      toNumber(t.directPrestige || t.prestige) +
      toNumber(t.assistPrestigeReceived);
    t.performance =
      toNumber(t.totalPrestige) -
      toNumber(t.failures) +
      toNumber(t.contracts);
  }

  return totals;
}

function getRoundOneLeaderMap(game: StoredGame): Record<string, number> {
  const players = sortPlayersByStartOrder(game?.players ?? []);
  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];

  const result: Record<string, number> = {};
  if (players.length === 0 || rounds.length === 0) return result;

  const firstCycleIds = new Set(players.map((p) => p.id));
  const seen = new Set<string>();
  const firstCycleRounds: StoredRound[] = [];

  for (const round of rounds) {
    const playerId = round?.playerId;
    if (!playerId || !firstCycleIds.has(playerId) || seen.has(playerId)) continue;
    seen.add(playerId);
    firstCycleRounds.push(round);
    if (seen.size >= firstCycleIds.size) break;
  }

  if (firstCycleRounds.length === 0) return result;

  const totals: Record<string, number> = {};
  for (const player of players) {
    totals[player.id] = 0;
  }

  for (const round of firstCycleRounds) {
    const actorId = round.playerId;
    totals[actorId] = toNumber(totals[actorId]) + toNumber(round.prestige);

    const assistPrestigeRecipients = round.assistPrestigeRecipients ?? {};
    for (const [recipientId, rawValue] of Object.entries(assistPrestigeRecipients)) {
      totals[recipientId] = toNumber(totals[recipientId]) + toNumber(rawValue);
    }
  }

  const maxValue = Math.max(...Object.values(totals), 0);
  if (maxValue <= 0) return result;

  for (const player of players) {
    result[player.id] = totals[player.id] === maxValue ? 1 : 0;
  }

  return result;
}

////////////////////////////////////////////////////////////////////////////////
// Correlations
////////////////////////////////////////////////////////////////////////////////

export function buildCorrelationResults(
  games: StoredGame[],
  _relationships?: Record<string, any>
): CorrelationResult[] {
  const turnOrders: number[] = [];
  const totalPrestiges: number[] = [];
  const wins: number[] = [];
  const playerCounts: number[] = [];
  const efficiencies: number[] = [];
  const assistedEfficiencies: number[] = [];
  const scores: number[] = [];
  const contractsFailureRatio: number[] = [];
  const assistsGiven: number[] = [];
  const assistsReceived: number[] = [];
  const earlyLead: number[] = [];

  for (const game of games ?? []) {
    const players = sortPlayersByStartOrder(game?.players ?? []);
    if (players.length === 0) continue;

    const winnerId = getWinnerId(game);
    const totalsMap = deriveTotalsFromRounds(game);
    const earlyLeaderMap = getRoundOneLeaderMap(game);

    for (const player of players) {
      const playerId = player.id;
      const totals = totalsMap[playerId] ?? createEmptyTotals();

      const turnOrder = Number.isFinite(player.startOrder)
        ? Number(player.startOrder)
        : 0;

      const totalPrestige = toNumber(
        totals.totalPrestige ??
          toNumber(totals.directPrestige || totals.prestige) +
            toNumber(totals.assistPrestigeReceived)
      );
      const score = toNumber(totals.score);
      const contracts = toNumber(totals.contracts);
      const failures = toNumber(totals.failures);
      const assists = toNumber(totals.assists);
      const assistReceived = toNumber(totals.assistPrestigeReceived);
      const directPrestige = toNumber(totals.directPrestige || totals.prestige);

      turnOrders.push(turnOrder);
      totalPrestiges.push(totalPrestige);
      wins.push(playerId === winnerId ? 1 : 0);
      playerCounts.push(players.length);
      scores.push(score);

      const efficiency =
        score > 0 ? totalPrestige / score : totalPrestige > 0 ? totalPrestige : 0;
      efficiencies.push(efficiency);

      const assistedEfficiency =
        assists > 0 ? assistReceived / assists : 0;
      assistedEfficiencies.push(assistedEfficiency);

      contractsFailureRatio.push(contracts / Math.max(1, failures));
      assistsGiven.push(assists);
      assistsReceived.push(assistReceived);
      earlyLead.push(Number(earlyLeaderMap[playerId] ?? 0));

      void directPrestige;
    }
  }

  const results: CorrelationResult[] = [
    {
      label: 'Turn Position vs Total Prestige',
      value: correlation(turnOrders, totalPrestiges),
      strength: getStrengthLabel(correlation(turnOrders, totalPrestiges)),
    },
    {
      label: 'Turn Position vs Win Rate',
      value: correlation(turnOrders, wins),
      strength: getStrengthLabel(correlation(turnOrders, wins)),
    },
    {
      label: 'Number of Players vs Win Rate',
      value: correlation(playerCounts, wins),
      strength: getStrengthLabel(correlation(playerCounts, wins)),
    },
    {
      label: 'Efficiency vs Win Rate',
      value: correlation(efficiencies, wins),
      strength: getStrengthLabel(correlation(efficiencies, wins)),
    },
    {
      label: 'Assisted Efficiency vs Win Rate',
      value: correlation(assistedEfficiencies, wins),
      strength: getStrengthLabel(correlation(assistedEfficiencies, wins)),
    },
    {
      label: 'Score vs Win Rate',
      value: correlation(scores, wins),
      strength: getStrengthLabel(correlation(scores, wins)),
    },
    {
      label: 'Contracts / Failures Ratio vs Win Rate',
      value: correlation(contractsFailureRatio, wins),
      strength: getStrengthLabel(correlation(contractsFailureRatio, wins)),
    },
    {
      label: 'Assists Given vs Win Rate',
      value: correlation(assistsGiven, wins),
      strength: getStrengthLabel(correlation(assistsGiven, wins)),
    },
    {
      label: 'Assists Received vs Win Rate',
      value: correlation(assistsReceived, wins),
      strength: getStrengthLabel(correlation(assistsReceived, wins)),
    },
    {
      label: 'Early Lead vs Final Win',
      value: correlation(earlyLead, wins),
      strength: getStrengthLabel(correlation(earlyLead, wins)),
    },
  ];

  return results;
}

////////////////////////////////////////////////////////////////////////////////
// Synergy
////////////////////////////////////////////////////////////////////////////////

function normalizePairKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

export function getTopSynergyPairs(
  relationships: Record<string, any>,
  limit = 5
): SynergyPair[] {
  const scores = new Map<string, SynergyPair>();

  for (const [sourceId, row] of Object.entries(relationships ?? {})) {
    if (!row || typeof row !== 'object') continue;

    for (const [targetId, rawValue] of Object.entries(row)) {
      if (!sourceId || !targetId || sourceId === targetId) continue;

      const numericValue =
        typeof rawValue === 'number'
          ? rawValue
          : toNumber((rawValue as any)?.score ?? (rawValue as any)?.value);

      if (!numericValue) continue;

      const key = normalizePairKey(sourceId, targetId);
      const existing = scores.get(key);

      if (!existing) {
        scores.set(key, {
          a: key.split('::')[0],
          b: key.split('::')[1],
          score: numericValue,
        });
      } else {
        existing.score += numericValue;
      }
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

////////////////////////////////////////////////////////////////////////////////
// 🧠 ARCHETYPES
////////////////////////////////////////////////////////////////////////////////

export function getArchetype(stats: any) {
  const {
    avgPrestige,
    avgScore,
    assistRate,
    efficiency,
  } = stats;

  if (assistRate > 0.4) return 'Support';
  if (efficiency > 0.7 && avgPrestige > avgScore) return 'Strategist';
  if (avgScore > avgPrestige * 1.5) return 'Aggressive';
  if (avgPrestige > avgScore * 1.5) return 'Builder';

  return 'Balanced';
}

////////////////////////////////////////////////////////////////////////////////
// 📊 ARCHETYPE RADAR DATA
////////////////////////////////////////////////////////////////////////////////

export function getArchetypeRadar(stats: any) {
  return {
    Strategy: stats.efficiency,
    Aggression: stats.avgScore / 10,
    Support: stats.assistRate,
    Growth: stats.avgPrestige / 10,
  };
}
