export type AssistSynergyScore = {
  a: string;
  b: string;
  gamesTogether: number;
  assistPrestigeAB: number;
  assistPrestigeBA: number;
  totalAssistPrestige: number;
  winsTogether: number;
  winRateTogether: number;
  synergyScore: number;
};

export type ContractSuccessModel = {
  playerId: string;
  gamesPlayed: number;
  totalContracts: number;
  totalFailures: number;
  totalAttempts: number;
  successRate: number;
  failureRate: number;
  directPrestige: number;
  objectivePrestige: number;
  assistPrestigeReceived: number;
  prestigePerContract: number;
  directPrestigePerContract: number;
  objectivePrestigePerContract: number;
  assistPrestigePerContract: number;
  weightedContractScore: number;
};

export type StoredGame = {
  id: string;
  date?: string;
  timestamp?: number;
  players: any[];
  winnerId?: string;
  [key: string]: any;
};

function sortedPairKey(a: string, b: string) {
  return [a, b].sort().join("::");
}

function getGameWinnerId(game: StoredGame): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getGamePlayerIds(game: StoredGame): string[] {
  return Object.keys((game?.totals as Record<string, any>) ?? {}).filter(Boolean);
}

function toNumber(value: any): number {
  if (value == null) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function getRoundsLike(game: any): any[] {
  if (Array.isArray(game?.rounds)) return game.rounds;
  if (Array.isArray(game?.timeline)) return game.timeline;
  return [];
}

export function buildAssistSynergyPairs(
  games: StoredGame[]
): AssistSynergyScore[] {
  const pairMap = new Map<
    string,
    {
      a: string;
      b: string;
      gamesTogether: number;
      assistPrestigeAB: number;
      assistPrestigeBA: number;
      winsTogether: number;
    }
  >();

  for (const game of Array.isArray(games) ? games : []) {
    const totals = (game?.totals as Record<string, any>) ?? {};
    const playerIds = getGamePlayerIds(game);
    const winnerId = getGameWinnerId(game);

    for (let i = 0; i < playerIds.length; i += 1) {
      for (let j = i + 1; j < playerIds.length; j += 1) {
        const a = playerIds[i];
        const b = playerIds[j];
        const key = sortedPairKey(a, b);

        if (!pairMap.has(key)) {
          pairMap.set(key, {
            a: [a, b].sort()[0],
            b: [a, b].sort()[1],
            gamesTogether: 0,
            assistPrestigeAB: 0,
            assistPrestigeBA: 0,
            winsTogether: 0,
          });
        }

        const pair = pairMap.get(key)!;
        pair.gamesTogether += 1;

        if (winnerId === a || winnerId === b) {
          pair.winsTogether += 1;
        }
      }
    }

    for (const [targetId, totalsEntry] of Object.entries(totals)) {
      const totalsRow = (totalsEntry as Record<string, any>) ?? {};

      const assistSources =
        totalsRow.assistPrestigeBySource &&
        typeof totalsRow.assistPrestigeBySource === "object" &&
        !Array.isArray(totalsRow.assistPrestigeBySource)
          ? totalsRow.assistPrestigeBySource
          : {};

      for (const [sourceId, rawValue] of Object.entries(assistSources)) {
        const value = toNumber(rawValue);
        if (!sourceId || !targetId || sourceId === targetId || value <= 0) {
          continue;
        }

        const key = sortedPairKey(sourceId, targetId);
        if (!pairMap.has(key)) {
          pairMap.set(key, {
            a: [sourceId, targetId].sort()[0],
            b: [sourceId, targetId].sort()[1],
            gamesTogether: 0,
            assistPrestigeAB: 0,
            assistPrestigeBA: 0,
            winsTogether: 0,
          });
        }

        const pair = pairMap.get(key)!;

        if (pair.a === sourceId && pair.b === targetId) {
          pair.assistPrestigeAB += value;
        } else {
          pair.assistPrestigeBA += value;
        }
      }
    }
  }

  return Array.from(pairMap.values())
    .map((pair) => {
      const totalAssistPrestige =
        pair.assistPrestigeAB + pair.assistPrestigeBA;
      const winRateTogether =
        pair.gamesTogether > 0 ? pair.winsTogether / pair.gamesTogether : 0;

      const balance =
        totalAssistPrestige > 0
          ? 1 -
            Math.abs(pair.assistPrestigeAB - pair.assistPrestigeBA) /
              totalAssistPrestige
          : 0;

      const synergyScore =
        totalAssistPrestige * 0.6 +
        winRateTogether * 20 +
        balance * 10 +
        pair.gamesTogether * 0.5;

      return {
        a: pair.a,
        b: pair.b,
        gamesTogether: pair.gamesTogether,
        assistPrestigeAB: pair.assistPrestigeAB,
        assistPrestigeBA: pair.assistPrestigeBA,
        totalAssistPrestige,
        winsTogether: pair.winsTogether,
        winRateTogether,
        synergyScore,
      };
    })
    .sort((x, y) => y.synergyScore - x.synergyScore);
}

export function buildContractSuccessModels(
  games: StoredGame[]
): ContractSuccessModel[] {
  const modelMap = new Map<
    string,
    {
      playerId: string;
      gamesPlayed: number;
      totalContracts: number;
      totalFailures: number;
      directPrestige: number;
      objectivePrestige: number;
      assistPrestigeReceived: number;
    }
  >();

  for (const game of Array.isArray(games) ? games : []) {
    const totals = (game?.totals as Record<string, any>) ?? {};

    for (const [playerId, totalsEntry] of Object.entries(totals)) {
      const totalsRow = (totalsEntry as Record<string, any>) ?? {};

      if (!modelMap.has(playerId)) {
        modelMap.set(playerId, {
          playerId,
          gamesPlayed: 0,
          totalContracts: 0,
          totalFailures: 0,
          directPrestige: 0,
          objectivePrestige: 0,
          assistPrestigeReceived: 0,
        });
      }

      const row = modelMap.get(playerId)!;
      row.gamesPlayed += 1;
      row.totalContracts += toNumber(totalsRow.contracts);
      row.totalFailures += toNumber(totalsRow.failures);
      row.directPrestige += toNumber(totalsRow.directPrestige);
      row.objectivePrestige += toNumber(totalsRow.objectivePrestige);
      row.assistPrestigeReceived += toNumber(
        totalsRow.assistPrestigeReceived
      );
    }

    const rounds = getRoundsLike(game);

    if (rounds.length > 0) {
      for (const round of rounds) {
        const playerId = round?.playerId;
        if (!playerId) continue;

        if (!modelMap.has(playerId)) {
          modelMap.set(playerId, {
            playerId,
            gamesPlayed: 0,
            totalContracts: 0,
            totalFailures: 0,
            directPrestige: 0,
            objectivePrestige: 0,
            assistPrestigeReceived: 0,
          });
        }
      }
    }
  }

  return Array.from(modelMap.values())
    .map((row) => {
      const totalAttempts = row.totalContracts + row.totalFailures;
      const successRate =
        totalAttempts > 0 ? row.totalContracts / totalAttempts : 0;
      const failureRate =
        totalAttempts > 0 ? row.totalFailures / totalAttempts : 0;

      const prestigePerContract =
        row.totalContracts > 0
          ? (row.directPrestige +
              row.objectivePrestige +
              row.assistPrestigeReceived) /
            row.totalContracts
          : 0;

      const directPrestigePerContract =
        row.totalContracts > 0 ? row.directPrestige / row.totalContracts : 0;

      const objectivePrestigePerContract =
        row.totalContracts > 0 ? row.objectivePrestige / row.totalContracts : 0;

      const assistPrestigePerContract =
        row.totalContracts > 0
          ? row.assistPrestigeReceived / row.totalContracts
          : 0;

      const weightedContractScore =
        successRate * 50 +
        prestigePerContract * 5 +
        directPrestigePerContract * 2 +
        objectivePrestigePerContract * 2 -
        failureRate * 20;

      return {
        playerId: row.playerId,
        gamesPlayed: row.gamesPlayed,
        totalContracts: row.totalContracts,
        totalFailures: row.totalFailures,
        totalAttempts,
        successRate,
        failureRate,
        directPrestige: row.directPrestige,
        objectivePrestige: row.objectivePrestige,
        assistPrestigeReceived: row.assistPrestigeReceived,
        prestigePerContract,
        directPrestigePerContract,
        objectivePrestigePerContract,
        assistPrestigePerContract,
        weightedContractScore,
      };
    })
    .sort((a, b) => b.weightedContractScore - a.weightedContractScore);
}

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

function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const meanX = x.reduce((sum, value) => sum + value, 0) / n;
  const meanY = y.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let index = 0; index < n; index += 1) {
    const deltaX = x[index] - meanX;
    const deltaY = y[index] - meanY;
    numerator += deltaX * deltaY;
    denomX += deltaX * deltaX;
    denomY += deltaY * deltaY;
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

function getRoundOneLeaderMap(game: StoredGame): Record<string, number> {
  const result: Record<string, number> = {};
  const players = Array.isArray(game?.players) ? game.players : [];
  const rounds = getRoundsLike(game);

  if (players.length === 0 || rounds.length === 0) {
    return result;
  }

  const firstRound = rounds[0];
  const firstRoundTotals: Record<string, number> = {};

  for (const player of players) {
    const playerId = player?.id;
    if (!playerId) continue;

    let value = 0;

    if (firstRound?.totals?.[playerId]?.totalPrestige != null) {
      value = toNumber(firstRound.totals[playerId].totalPrestige);
    } else if (firstRound?.totals?.[playerId]?.prestige != null) {
      value = toNumber(firstRound.totals[playerId].prestige);
    } else if (Array.isArray(firstRound?.entries)) {
      const entry = firstRound.entries.find((candidate: any) => candidate?.playerId === playerId);
      value = toNumber(entry?.totalPrestige ?? entry?.prestige);
    } else if (Array.isArray(firstRound?.players)) {
      const entry = firstRound.players.find((candidate: any) => candidate?.id === playerId);
      value = toNumber(entry?.totalPrestige ?? entry?.prestige);
    }

    firstRoundTotals[playerId] = value;
  }

  const values = Object.values(firstRoundTotals);
  if (values.length === 0) return result;

  const maxValue = Math.max(...values);
  for (const player of players) {
    const playerId = player?.id;
    if (!playerId) continue;
    result[playerId] = firstRoundTotals[playerId] === maxValue && maxValue > 0 ? 1 : 0;
  }

  return result;
}

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

  for (const game of Array.isArray(games) ? games : []) {
    const players =
      Array.isArray(game?.players) && game.players.length > 0
        ? [...game.players]
        : getGamePlayerIds(game).map((id, index) => ({ id, startOrder: index + 1 }));

    if (players.length === 0) continue;

    const winnerId = getGameWinnerId(game);
    const earlyLeaderMap = getRoundOneLeaderMap(game);

    for (let index = 0; index < players.length; index += 1) {
      const player = players[index];
      const playerId = player?.id;
      if (!playerId) continue;

      const totals = ((game?.totals as Record<string, any>) ?? {})[playerId] ?? {};
      const totalPrestige = toNumber(
        totals.totalPrestige ??
          toNumber(totals.directPrestige ?? totals.prestige) +
            toNumber(totals.assistPrestigeReceived)
      );
      const score = toNumber(totals.score);
      const contracts = toNumber(totals.contracts);
      const failures = toNumber(totals.failures);
      const assists = toNumber(totals.assists);
      const assistReceived = toNumber(totals.assistPrestigeReceived);
      const turnOrder = Number.isFinite(player?.startOrder)
        ? Number(player.startOrder)
        : index + 1;

      turnOrders.push(turnOrder);
      totalPrestiges.push(totalPrestige);
      wins.push(playerId === winnerId ? 1 : 0);
      playerCounts.push(players.length);
      scores.push(score);

      const efficiency =
        score > 0 ? totalPrestige / score : totalPrestige > 0 ? totalPrestige : 0;
      efficiencies.push(efficiency);

      const assistedEfficiency = assists > 0 ? assistReceived / assists : 0;
      assistedEfficiencies.push(assistedEfficiency);

      contractsFailureRatio.push(contracts / Math.max(1, failures));
      assistsGiven.push(assists);
      assistsReceived.push(assistReceived);
      earlyLead.push(Number(earlyLeaderMap[playerId] ?? 0));
    }
  }

  const metrics: Array<[string, number[], number[]]> = [
    ['Turn Position vs Prestige', turnOrders, totalPrestiges],
    ['Turn Position vs Win Rate', turnOrders, wins],
    ['Number of Players vs Win Rate', playerCounts, wins],
    ['Efficiency vs Win Rate', efficiencies, wins],
    ['Assisted Efficiency vs Win Rate', assistedEfficiencies, wins],
    ['Score vs Win Rate', scores, wins],
    ['Contracts / Failures Ratio vs Win Rate', contractsFailureRatio, wins],
    ['Assists Given vs Win Rate', assistsGiven, wins],
    ['Assists Received vs Win Rate', assistsReceived, wins],
    ['Early Lead vs Final Win', earlyLead, wins],
  ];

  return metrics.map(([label, left, right]) => {
    const value = correlation(left, right);
    return {
      label,
      value,
      strength: getStrengthLabel(value),
    };
  });
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

      const key = sortedPairKey(sourceId, targetId);
      const existing = scores.get(key);

      if (!existing) {
        const [a, b] = key.split('::');
        scores.set(key, { a, b, score: numericValue });
        continue;
      }

      existing.score += numericValue;
    }
  }

  return [...scores.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(0, limit));
}
