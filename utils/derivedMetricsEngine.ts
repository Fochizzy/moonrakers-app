import type { Game, PlayerStats } from '@/utils/statsEngine';

export type DerivedPlayerStats = PlayerStats & {
  consistencyScore: number;
  clutchScore: number;
  carryFactor: number;
  momentum: number;
  prestigePerTurn: number;
  earlyLeadRate: number;
  lateLeadRate: number;
  leadConversion: number;
  lateLeadConversion: number;
  objectiveConversionRate: number;
  supportConversionRate: number;
  objectivesPerGame: number;
  assistsGivenPerGame: number;
  assistsReceivedPerGame: number;
  opponentStrength: number;
  interactionIndex: number;
  aggroIndex: number;
  tempoIndex: number;
};

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getTotalPrestige(stats?: {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
}) {
  const explicit = stats?.totalPrestige ?? stats?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  const direct =
    typeof stats?.directPrestige === 'number' && Number.isFinite(stats.directPrestige)
      ? stats.directPrestige
      : 0;

  const assist =
    typeof stats?.assistPrestigeReceived === 'number' &&
    Number.isFinite(stats.assistPrestigeReceived)
      ? stats.assistPrestigeReceived
      : 0;

  return direct + assist;
}

type PerPlayerGameRollup = {
  prestigeByGame: number[];
  closeGameWins: number;
  closeGames: number;
  recentPrestige: number[];
  estimatedTurns: number;
  earlyLeads: number;
  lateLeads: number;
  objectiveLeads: number;
  supportLeads: number;
  gamesLed: number;
  lateGamesLed: number;
  objectiveLeadGames: number;
  supportLeadGames: number;
  winsWhenLeading: number;
  winsWhenLateLeading: number;
  winsWhenObjectiveLeader: number;
  winsWhenSupportLeader: number;
  opponentStrengthSamples: number[];
};

export function buildDerivedPlayerStats(
  leaderboard: PlayerStats[],
  games: Game[]
): DerivedPlayerStats[] {
  const baseById = new Map(leaderboard.map((player) => [player.id, player]));

  const rollups: Record<string, PerPlayerGameRollup> = {};

  for (const player of leaderboard) {
    rollups[player.id] = {
      prestigeByGame: [],
      closeGameWins: 0,
      closeGames: 0,
      recentPrestige: [],
      estimatedTurns: 0,
      earlyLeads: 0,
      lateLeads: 0,
      objectiveLeads: 0,
      supportLeads: 0,
      gamesLed: 0,
      lateGamesLed: 0,
      objectiveLeadGames: 0,
      supportLeadGames: 0,
      winsWhenLeading: 0,
      winsWhenLateLeading: 0,
      winsWhenObjectiveLeader: 0,
      winsWhenSupportLeader: 0,
      opponentStrengthSamples: [],
    };
  }

  for (const game of games) {
    const totals = game.totals ?? {};
    const winnerId = getWinnerId(game);

    const prestigeRows = Object.entries(totals).map(([playerId, stats]) => ({
      playerId,
      prestige: getTotalPrestige(stats),
      assists:
        typeof stats?.assists === 'number' && Number.isFinite(stats.assists) ? stats.assists : 0,
      objectives:
        typeof stats?.contracts === 'number' && Number.isFinite(stats.contracts)
          ? stats.contracts
          : 0,
      failures:
        typeof stats?.failures === 'number' && Number.isFinite(stats.failures) ? stats.failures : 0,
    }));

    if (!prestigeRows.length) continue;

    const sortedByPrestige = [...prestigeRows].sort((a, b) => b.prestige - a.prestige);
    const leaderPrestige = sortedByPrestige[0]?.prestige ?? 0;
    const runnerUpPrestige = sortedByPrestige[1]?.prestige ?? leaderPrestige;
    const isCloseGame = Math.abs(leaderPrestige - runnerUpPrestige) <= 3;

    const maxPrestige = Math.max(...prestigeRows.map((row) => row.prestige));
    const maxObjectives = Math.max(...prestigeRows.map((row) => row.objectives));
    const maxAssists = Math.max(...prestigeRows.map((row) => row.assists));

    const earlyLeadIds = new Set(
      prestigeRows.filter((row) => row.prestige === maxPrestige).map((row) => row.playerId)
    );

    const lateLeadIds = new Set(
      prestigeRows.filter((row) => row.prestige === maxPrestige).map((row) => row.playerId)
    );

    const objectiveLeaderIds = new Set(
      prestigeRows.filter((row) => row.objectives === maxObjectives).map((row) => row.playerId)
    );

    const supportLeaderIds = new Set(
      prestigeRows.filter((row) => row.assists === maxAssists).map((row) => row.playerId)
    );

    for (const row of prestigeRows) {
      const player = baseById.get(row.playerId);
      const rollup = rollups[row.playerId];
      if (!player || !rollup) continue;

      rollup.prestigeByGame.push(row.prestige);
      rollup.estimatedTurns += 1 + row.objectives + row.assists + row.failures;

      if (isCloseGame) {
        rollup.closeGames += 1;
        if (winnerId === row.playerId) {
          rollup.closeGameWins += 1;
        }
      }

      if (earlyLeadIds.has(row.playerId)) {
        rollup.earlyLeads += 1;
        rollup.gamesLed += 1;
        if (winnerId === row.playerId) {
          rollup.winsWhenLeading += 1;
        }
      }

      if (lateLeadIds.has(row.playerId)) {
        rollup.lateLeads += 1;
        rollup.lateGamesLed += 1;
        if (winnerId === row.playerId) {
          rollup.winsWhenLateLeading += 1;
        }
      }

      if (objectiveLeaderIds.has(row.playerId)) {
        rollup.objectiveLeads += 1;
        rollup.objectiveLeadGames += 1;
        if (winnerId === row.playerId) {
          rollup.winsWhenObjectiveLeader += 1;
        }
      }

      if (supportLeaderIds.has(row.playerId)) {
        rollup.supportLeads += 1;
        rollup.supportLeadGames += 1;
        if (winnerId === row.playerId) {
          rollup.winsWhenSupportLeader += 1;
        }
      }

      const opponentStrengthValues = prestigeRows
        .filter((opponent) => opponent.playerId !== row.playerId)
        .map((opponent) => baseById.get(opponent.playerId)?.winRate ?? 0);

      rollup.opponentStrengthSamples.push(average(opponentStrengthValues));
    }
  }

  return leaderboard.map((player) => {
    const rollup = rollups[player.id];
    const prestigeStdDev = standardDeviation(rollup?.prestigeByGame ?? []);
    const recentPrestige = (rollup?.prestigeByGame ?? []).slice(-5);
    const recentAvg = average(recentPrestige);
    const overallAvg = player.avgPrestigePerGame;

    const consistencyScore = 1 / (1 + prestigeStdDev);
    const clutchScore = safeDivide(rollup?.closeGameWins ?? 0, rollup?.closeGames ?? 0);
    const carryFactor = safeDivide(player.directPrestige, player.totalPrestige);
    const momentum = recentAvg - overallAvg;
    const prestigePerTurn = safeDivide(player.totalPrestige, rollup?.estimatedTurns ?? 0);

    const earlyLeadRate = safeDivide(rollup?.earlyLeads ?? 0, player.games);
    const lateLeadRate = safeDivide(rollup?.lateLeads ?? 0, player.games);
    const leadConversion = safeDivide(rollup?.winsWhenLeading ?? 0, rollup?.gamesLed ?? 0);
    const lateLeadConversion = safeDivide(
      rollup?.winsWhenLateLeading ?? 0,
      rollup?.lateGamesLed ?? 0
    );
    const objectiveConversionRate = safeDivide(
      rollup?.winsWhenObjectiveLeader ?? 0,
      rollup?.objectiveLeadGames ?? 0
    );
    const supportConversionRate = safeDivide(
      rollup?.winsWhenSupportLeader ?? 0,
      rollup?.supportLeadGames ?? 0
    );

    const objectivesPerGame = safeDivide(player.contracts, player.games);
    const assistsGivenPerGame = safeDivide(player.assists, player.games);
    const assistsReceivedPerGame = safeDivide(player.assistCountBySource, player.games);
    const opponentStrength = average(rollup?.opponentStrengthSamples ?? []);

    const interactionIndex = player.assists + player.contracts;
    const aggroIndex = earlyLeadRate + lateLeadRate + objectivesPerGame;
    const tempoIndex = player.allContractsEfficiency + earlyLeadRate + prestigePerTurn;

    return {
      ...player,
      consistencyScore,
      clutchScore,
      carryFactor,
      momentum,
      prestigePerTurn,
      earlyLeadRate,
      lateLeadRate,
      leadConversion,
      lateLeadConversion,
      objectiveConversionRate,
      supportConversionRate,
      objectivesPerGame,
      assistsGivenPerGame,
      assistsReceivedPerGame,
      opponentStrength,
      interactionIndex,
      aggroIndex,
      tempoIndex,
    };
  });
}
