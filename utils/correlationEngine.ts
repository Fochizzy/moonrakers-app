import type { DerivedPlayerStats } from '@/utils/derivedMetricsEngine';

export type CorrelationRow = {
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

export function buildGlobalCorrelations(players: DerivedPlayerStats[]): CorrelationRow[] {
  const wins = players.map((p) => p.winRate);

  const rows: CorrelationRow[] = [
    {
      key: 'allContractsEfficiency',
      label: 'Efficiency vs Wins',
      value: pearson(players.map((p) => p.allContractsEfficiency), wins),
    },
    {
      key: 'failureRate',
      label: 'Failure Rate vs Wins',
      value: pearson(players.map((p) => p.failureRate), wins),
    },
    {
      key: 'earlyLeadRate',
      label: 'Early Lead vs Wins',
      value: pearson(players.map((p) => p.earlyLeadRate), wins),
    },
    {
      key: 'lateLeadRate',
      label: 'Late Lead vs Wins',
      value: pearson(players.map((p) => p.lateLeadRate), wins),
    },
    {
      key: 'objectivesPerGame',
      label: 'Objectives vs Wins',
      value: pearson(players.map((p) => p.objectivesPerGame), wins),
    },
    {
      key: 'assists',
      label: 'Assists Given vs Wins',
      value: pearson(players.map((p) => p.assistsGivenPerGame), wins),
    },
    {
      key: 'assistPrestigeReceived',
      label: 'Assists Received vs Wins',
      value: pearson(players.map((p) => p.assistsReceivedPerGame), wins),
    },
    {
      key: 'prestigePerTurn',
      label: 'Prestige per Turn vs Wins',
      value: pearson(players.map((p) => p.prestigePerTurn), wins),
    },
    {
      key: 'consistencyScore',
      label: 'Consistency vs Wins',
      value: pearson(players.map((p) => p.consistencyScore), wins),
    },
    {
      key: 'clutchScore',
      label: 'Clutch Score vs Wins',
      value: pearson(players.map((p) => p.clutchScore), wins),
    },
    {
      key: 'leadConversion',
      label: 'Lead Conversion vs Wins',
      value: pearson(players.map((p) => p.leadConversion), wins),
    },
    {
      key: 'objectiveConversionRate',
      label: 'Objective Conversion vs Wins',
      value: pearson(players.map((p) => p.objectiveConversionRate), wins),
    },
    {
      key: 'supportConversionRate',
      label: 'Support Conversion vs Wins',
      value: pearson(players.map((p) => p.supportConversionRate), wins),
    },
    {
      key: 'opponentStrength',
      label: 'Opponent Strength vs Wins',
      value: pearson(players.map((p) => p.opponentStrength), wins),
    },
    {
      key: 'avgStartSeat',
      label: 'Turn Order (Seat) vs Wins',
      value: pearson(players.map((p) => p.avgStartSeat), wins),
    },
    {
      key: 'interactionIndex',
      label: 'Interaction Index vs Wins',
      value: pearson(players.map((p) => p.interactionIndex), wins),
    },
    {
      key: 'aggroIndex',
      label: 'Aggro Index vs Wins',
      value: pearson(players.map((p) => p.aggroIndex), wins),
    },
    {
      key: 'tempoIndex',
      label: 'Tempo Index vs Wins',
      value: pearson(players.map((p) => p.tempoIndex), wins),
    },
  ];

  return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
