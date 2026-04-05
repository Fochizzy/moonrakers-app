import { safeDiv, safeNum, stdDev } from './chartMetrics';
import {
  buildObjectiveCorrelationPoint,
  buildSeatWinPoint,
  getObjectiveCount,
  getObjectivePrestige,
  getTotalPrestige,
  getWinnerId,
} from './metricsEngine';

export type PlayerIdentity = {
  id: string;
  name: string;
  color?: string;
};

export type StoredTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectiveCount?: number;
  objectivePrestige?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

export type StoredGamePlayer = {
  id: string;
  startOrder?: number;
};

export type StoredGame = {
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  objectiveStatsEligible?: boolean;
  players?: StoredGamePlayer[];
  totals?: Record<string, StoredTotals>;
};

export type DerivedPlayerStats = {
  id: string;
  name: string;
  color?: string;

  gamesPlayed: number;
  roundsPlayed: number;

  totalPrestige: number;
  totalScore: number;
  contracts: number;
  failures: number;
  assistsGiven: number;
  assistsReceived: number;
  assistPrestigeReceived: number;
  directPrestige: number;
  objectiveCount: number;
  objectivePrestige: number;
  objectiveTrackedGames: number;
  objectiveWinPoints: Array<{ x: number; y: number }>;
  seatWinPoints: Array<{ x: number; y: number }>;
  startSeats: number[];

  wins: number;
  elo: number;
  eloDeltaTotal: number;

  prestigeByGame: number[];
  scoreByGame: number[];
  prestigeGainByRound: number[];

  earlyLeads: number;
  closeGames: number;
  comebacks: number;
  strongFinishes: number;
  earlyLeadWins: number;
};

export type EnrichedPlayerStats = DerivedPlayerStats & {
  avgPrestigePerGame: number;
  avgPrestigePerRound: number;
  avgScorePerGame: number;
  avgContractsPerGame: number;
  avgFailuresPerGame: number;
  avgAssistsGivenPerGame: number;
  avgAssistsReceivedPerGame: number;

  efficiency: number;
  assistedEfficiency: number;
  contractFailureRatio: number;
  scorePerContract: number;

  earlyLeadRate: number;
  closeRate: number;
  comebackRate: number;
  finishStrength: number;
  leadConversionRate: number;

  prestigeStdDev: number;
  scoreStdDev: number;
  consistencyIndex: number;

  assistBalance: number;
  winRate: number;
  eloDelta: number;

  avgObjectivesPerTrackedGame: number;
  objectiveWinCorrelation: number;
  objectiveShareOfPrestige: number;

  avgStartSeat: number;
  turnOrderWinCorrelation: number;
};

export function makeEmptyDerivedPlayerStats(input: PlayerIdentity): DerivedPlayerStats {
  return {
    id: input.id,
    name: input.name,
    color: input.color,

    gamesPlayed: 0,
    roundsPlayed: 0,

    totalPrestige: 0,
    totalScore: 0,
    contracts: 0,
    failures: 0,
    assistsGiven: 0,
    assistsReceived: 0,
    assistPrestigeReceived: 0,
    directPrestige: 0,
    objectiveCount: 0,
    objectivePrestige: 0,
    objectiveTrackedGames: 0,
    objectiveWinPoints: [],
    seatWinPoints: [],
    startSeats: [],

    wins: 0,
    elo: 0,
    eloDeltaTotal: 0,

    prestigeByGame: [],
    scoreByGame: [],
    prestigeGainByRound: [],

    earlyLeads: 0,
    closeGames: 0,
    comebacks: 0,
    strongFinishes: 0,
    earlyLeadWins: 0,
  };
}

function getPearsonCorrelation(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;

  const xs = points.map((point) => safeNum(point.x));
  const ys = points.map((point) => safeNum(point.y));

  const meanX = safeDiv(xs.reduce((sum, value) => sum + value, 0), xs.length);
  const meanY = safeDiv(ys.reduce((sum, value) => sum + value, 0), ys.length);

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < points.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) return 0;
  return numerator / Math.sqrt(sumX * sumY);
}

export function computeDerivedPlayerStats(
  players: PlayerIdentity[],
  games: StoredGame[]
): DerivedPlayerStats[] {
  const byId: Record<string, DerivedPlayerStats> = {};

  for (const player of players) {
    byId[player.id] = makeEmptyDerivedPlayerStats(player);
  }

  for (const game of games) {
    const winnerId = getWinnerId(game);

    const gameRows = Object.entries(game.totals ?? {}).map(([playerId, totals]) => ({
      playerId,
      totalPrestige: getTotalPrestige(totals),
      score: safeNum(totals?.score),
    }));
    gameRows.sort((a, b) => b.totalPrestige - a.totalPrestige);
    const leaderPrestige = gameRows[0]?.totalPrestige ?? 0;
    const runnerUpPrestige = gameRows[1]?.totalPrestige ?? leaderPrestige;
    const isClose = Math.abs(leaderPrestige - runnerUpPrestige) <= 3;

    for (const player of players) {
      const stats = byId[player.id];
      const totals = game.totals?.[player.id];
      if (!stats || !totals) continue;

      stats.gamesPlayed += 1;
      stats.totalPrestige += getTotalPrestige(totals);
      stats.totalScore += safeNum(totals.score);
      stats.contracts += safeNum(totals.contracts);
      stats.failures += safeNum(totals.failures);
      stats.assistsGiven += safeNum(totals.assists);
      stats.assistsReceived += safeNum(totals.assists);
      stats.assistPrestigeReceived += safeNum(totals.assistPrestigeReceived);
      stats.directPrestige += safeNum(totals.directPrestige);
      stats.objectiveCount += getObjectiveCount(totals);
      stats.objectivePrestige += getObjectivePrestige(totals);

      if (winnerId === player.id) {
        stats.wins += 1;
      }

      stats.prestigeByGame.push(getTotalPrestige(totals));
      stats.scoreByGame.push(safeNum(totals.score));

      if (isClose) {
        stats.closeGames += 1;
      }

      const objectivePoint = buildObjectiveCorrelationPoint(totals, game, player.id);
      if (objectivePoint) {
        stats.objectiveTrackedGames += 1;
        stats.objectiveWinPoints.push(objectivePoint);
      }

      const seat = game.players?.find((entry) => entry.id === player.id)?.startOrder;
      const seatPoint = buildSeatWinPoint(game, player.id, seat);
      if (seatPoint) {
        stats.seatWinPoints.push(seatPoint);
        stats.startSeats.push(seatPoint.x);
      }
    }
  }

  return Object.values(byId);
}

export function enrichPlayerStats(base: DerivedPlayerStats): EnrichedPlayerStats {
  const totalPrestige = safeNum(base.totalPrestige);
  const totalScore = safeNum(base.totalScore);
  const contracts = safeNum(base.contracts);
  const failures = safeNum(base.failures);
  const assistsGiven = safeNum(base.assistsGiven);
  const assistsReceived = safeNum(base.assistsReceived);
  const objectivePrestige = safeNum(base.objectivePrestige);

  const avgPrestigePerGame = safeDiv(totalPrestige, base.gamesPlayed);
  const avgPrestigePerRound = safeDiv(totalPrestige, base.roundsPlayed);
  const avgScorePerGame = safeDiv(totalScore, base.gamesPlayed);
  const avgContractsPerGame = safeDiv(contracts, base.gamesPlayed);
  const avgFailuresPerGame = safeDiv(failures, base.gamesPlayed);
  const avgAssistsGivenPerGame = safeDiv(assistsGiven, base.gamesPlayed);
  const avgAssistsReceivedPerGame = safeDiv(assistsReceived, base.gamesPlayed);

  const efficiency = safeDiv(totalPrestige, Math.max(1, contracts));
  const assistedEfficiency = safeDiv(totalPrestige, Math.max(1, contracts + assistsGiven));
  const contractFailureRatio = safeDiv(contracts, Math.max(1, failures));
  const scorePerContract = safeDiv(totalScore, Math.max(1, contracts));

  const earlyLeadRate = safeDiv(base.earlyLeads, base.gamesPlayed);
  const closeRate = safeDiv(base.closeGames, base.gamesPlayed);
  const comebackRate = safeDiv(base.comebacks, base.gamesPlayed);
  const finishStrength = safeDiv(base.strongFinishes, base.gamesPlayed);
  const leadConversionRate = safeDiv(base.earlyLeadWins, Math.max(1, base.earlyLeads));

  const prestigeStdDev = stdDev(base.prestigeByGame);
  const scoreStdDev = stdDev(base.scoreByGame);
  const consistencyIndex = safeDiv(avgPrestigePerGame, Math.max(0.01, prestigeStdDev));

  const assistBalance = assistsReceived - assistsGiven;
  const winRate = safeDiv(base.wins, base.gamesPlayed);

  const avgObjectivesPerTrackedGame = safeDiv(objectivePrestige, base.objectiveTrackedGames);
  const objectiveWinCorrelation = getPearsonCorrelation(base.objectiveWinPoints);
  const objectiveShareOfPrestige = safeDiv(objectivePrestige, totalPrestige);

  const avgStartSeat = safeDiv(
    base.startSeats.reduce((sum, value) => sum + value, 0),
    base.startSeats.length
  );
  const turnOrderWinCorrelation = getPearsonCorrelation(base.seatWinPoints);

  return {
    ...base,
    avgPrestigePerGame,
    avgPrestigePerRound,
    avgScorePerGame,
    avgContractsPerGame,
    avgFailuresPerGame,
    avgAssistsGivenPerGame,
    avgAssistsReceivedPerGame,

    efficiency,
    assistedEfficiency,
    contractFailureRatio,
    scorePerContract,

    earlyLeadRate,
    closeRate,
    comebackRate,
    finishStrength,
    leadConversionRate,

    prestigeStdDev,
    scoreStdDev,
    consistencyIndex,

    assistBalance,
    winRate,
    eloDelta: safeNum(base.eloDeltaTotal),

    avgObjectivesPerTrackedGame,
    objectiveWinCorrelation,
    objectiveShareOfPrestige,

    avgStartSeat,
    turnOrderWinCorrelation,
  };
}

export function getEnrichedPlayerStats(
  players: PlayerIdentity[],
  games: StoredGame[]
): EnrichedPlayerStats[] {
  return computeDerivedPlayerStats(players, games).map(enrichPlayerStats);
}
