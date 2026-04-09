import type { Game } from '@/utils/statsEngine';

export type GameCorrelationRow = {
  key: string;
  label: string;
  value: number;
};

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function pearson(xValues: number[], yValues: number[]) {
  if (xValues.length < 2 || yValues.length < 2 || xValues.length !== yValues.length) return 0;

  const meanX = average(xValues);
  const meanY = average(yValues);

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < xValues.length; i += 1) {
    const dx = xValues[i] - meanX;
    const dy = yValues[i] - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) return 0;
  return numerator / Math.sqrt(sumX * sumY);
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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

  return toNumber(stats?.directPrestige) + toNumber(stats?.assistPrestigeReceived);
}

export function buildGameCorrelations(games: Game[]): GameCorrelationRow[] {
  const totalAssists: number[] = [];
  const totalObjectives: number[] = [];
  const supportDensity: number[] = [];
  const averageEfficiency: number[] = [];
  const failures: number[] = [];
  const interactionDensity: number[] = [];

  const earlyLeaderWinning: number[] = [];
  const objectiveLeaderWinning: number[] = [];
  const supportLeaderWinning: number[] = [];

  for (const game of games) {
    const totals = game.totals ?? {};
    const rows = Object.entries(totals).map(([playerId, stats]) => {
      const assists = toNumber(stats?.assists);
      const objectives = toNumber(stats?.contracts);
      const failureCount = toNumber(stats?.failures);
      const prestige = getTotalPrestige(stats);
      const actions = objectives + assists;
      const efficiency = actions > 0 ? prestige / actions : 0;

      return {
        playerId,
        assists,
        objectives,
        failureCount,
        prestige,
        efficiency,
        interaction: assists + objectives,
      };
    });

    if (!rows.length) continue;

    const winnerId = getWinnerId(game);
    const playerCount = rows.length;

    const maxPrestige = Math.max(...rows.map((r) => r.prestige));
    const maxObjectives = Math.max(...rows.map((r) => r.objectives));
    const maxAssists = Math.max(...rows.map((r) => r.assists));

    const earlyLeaderIds = new Set(
      rows.filter((r) => r.prestige === maxPrestige).map((r) => r.playerId)
    );
    const objectiveLeaderIds = new Set(
      rows.filter((r) => r.objectives === maxObjectives).map((r) => r.playerId)
    );
    const supportLeaderIds = new Set(
      rows.filter((r) => r.assists === maxAssists).map((r) => r.playerId)
    );

    totalAssists.push(rows.reduce((sum, r) => sum + r.assists, 0));
    totalObjectives.push(rows.reduce((sum, r) => sum + r.objectives, 0));
    failures.push(rows.reduce((sum, r) => sum + r.failureCount, 0));

    supportDensity.push(
      playerCount > 0 ? rows.reduce((sum, r) => sum + r.assists, 0) / playerCount : 0
    );

    interactionDensity.push(
      playerCount > 0 ? rows.reduce((sum, r) => sum + r.interaction, 0) / playerCount : 0
    );

    averageEfficiency.push(average(rows.map((r) => r.efficiency)));

    earlyLeaderWinning.push(earlyLeaderIds.has(winnerId ?? '') ? 1 : 0);
    objectiveLeaderWinning.push(objectiveLeaderIds.has(winnerId ?? '') ? 1 : 0);
    supportLeaderWinning.push(supportLeaderIds.has(winnerId ?? '') ? 1 : 0);
  }

  const rows: GameCorrelationRow[] = [
    {
      key: 'totalAssistsVsEarlyLeaderWinning',
      label: 'Total Assists vs Early Leader Winning',
      value: pearson(totalAssists, earlyLeaderWinning),
    },
    {
      key: 'totalObjectivesVsObjectiveLeaderWinning',
      label: 'Total Objectives vs Objective Leader Winning',
      value: pearson(totalObjectives, objectiveLeaderWinning),
    },
    {
      key: 'supportDensityVsSupportLeaderWinning',
      label: 'Support Density vs Support Leader Winning',
      value: pearson(supportDensity, supportLeaderWinning),
    },
    {
      key: 'averageEfficiencyVsEarlyLeaderWinning',
      label: 'Average Efficiency vs Early Leader Winning',
      value: pearson(averageEfficiency, earlyLeaderWinning),
    },
    {
      key: 'failuresVsSupportLeaderWinning',
      label: 'Failures vs Support Leader Winning',
      value: pearson(failures, supportLeaderWinning),
    },
    {
      key: 'interactionDensityVsObjectiveLeaderWinning',
      label: 'Interaction Density vs Objective Leader Winning',
      value: pearson(interactionDensity, objectiveLeaderWinning),
    },
  ];

  return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
