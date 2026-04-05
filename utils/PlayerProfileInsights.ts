import { safeDiv, safeNum, stdDev } from './chartMetrics';

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

  objectiveCount: number;
  objectivePrestige: number;
  objectiveGamesPlayed: number;
  objectiveWinPoints: Array<{ x: number; y: number }>;
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
  directEfficiency: number;
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

  avgObjectivesPerGame: number;
  objectiveShareOfPrestige: number;
  objectiveWinCorrelation: number;
};

function getPearsonCorrelation(points: Array<{ x: number; y: number }>): number {
  if (!Array.isArray(points) || points.length < 2) return 0;

  const safePoints = points
    .map((point) => ({
      x: safeNum(point?.x),
      y: safeNum(point?.y),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (safePoints.length < 2) return 0;

  const meanX =
    safePoints.reduce((sum, point) => sum + point.x, 0) / safePoints.length;
  const meanY =
    safePoints.reduce((sum, point) => sum + point.y, 0) / safePoints.length;

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (const point of safePoints) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) return 0;
  return numerator / Math.sqrt(sumX * sumY);
}

export function makeEmptyDerivedPlayerStats(input: {
  id: string;
  name: string;
  color?: string;
}): DerivedPlayerStats {
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

    objectiveCount: 0,
    objectivePrestige: 0,
    objectiveGamesPlayed: 0,
    objectiveWinPoints: [],
  };
}

export function enrichPlayerStats(base: DerivedPlayerStats): EnrichedPlayerStats {
  const totalPrestige = safeNum(base.totalPrestige);
  const totalScore = safeNum(base.totalScore);
  const contracts = safeNum(base.contracts);
  const failures = safeNum(base.failures);
  const assistsGiven = safeNum(base.assistsGiven);
  const assistsReceived = safeNum(base.assistsReceived);
  const objectiveCount = safeNum(base.objectiveCount);
  const objectivePrestige = safeNum(base.objectivePrestige);

  const avgPrestigePerGame = safeDiv(totalPrestige, base.gamesPlayed);
  const avgPrestigePerRound = safeDiv(totalPrestige, base.roundsPlayed);
  const avgScorePerGame = safeDiv(totalScore, base.gamesPlayed);
  const avgContractsPerGame = safeDiv(contracts, base.gamesPlayed);
  const avgFailuresPerGame = safeDiv(failures, base.gamesPlayed);
  const avgAssistsGivenPerGame = safeDiv(assistsGiven, base.gamesPlayed);
  const avgAssistsReceivedPerGame = safeDiv(assistsReceived, base.gamesPlayed);

  const efficiency = safeDiv(
    totalPrestige,
    Math.max(1, contracts + assistsGiven)
  );
  const assistedEfficiency = safeDiv(
    base.assistPrestigeReceived,
    Math.max(1, assistsGiven)
  );
  const directEfficiency = safeDiv(base.directPrestige, Math.max(1, contracts));
  const contractFailureRatio = safeDiv(contracts, Math.max(1, failures));
  const scorePerContract = safeDiv(totalScore, Math.max(1, contracts));

  const earlyLeadRate = safeDiv(base.earlyLeads, base.gamesPlayed);
  const closeRate = safeDiv(base.closeGames, base.gamesPlayed);
  const comebackRate = safeDiv(base.comebacks, base.gamesPlayed);
  const finishStrength = safeDiv(base.strongFinishes, base.gamesPlayed);
  const leadConversionRate = safeDiv(
    base.earlyLeadWins,
    Math.max(1, base.earlyLeads)
  );

  const prestigeStdDev = stdDev(base.prestigeByGame);
  const scoreStdDev = stdDev(base.scoreByGame);
  const consistencyIndex = safeDiv(
    avgPrestigePerGame,
    Math.max(0.01, prestigeStdDev)
  );

  const assistBalance = assistsReceived - assistsGiven;
  const winRate = safeDiv(base.wins, base.gamesPlayed);

  const avgObjectivesPerGame = safeDiv(
    objectiveCount,
    Math.max(1, base.objectiveGamesPlayed)
  );
  const objectiveShareOfPrestige = safeDiv(objectivePrestige, Math.max(1, totalPrestige));
  const objectiveWinCorrelation = getPearsonCorrelation(base.objectiveWinPoints);

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
    directEfficiency,
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

    avgObjectivesPerGame,
    objectiveShareOfPrestige,
    objectiveWinCorrelation,
  };
}

export function enrichPlayers(
  players: DerivedPlayerStats[]
): EnrichedPlayerStats[] {
  return players.map(enrichPlayerStats);
}
