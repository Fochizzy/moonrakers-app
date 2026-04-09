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