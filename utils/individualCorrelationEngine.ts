import type { DerivedPlayerStats } from '@/utils/derivedMetricsEngine';

export type IndividualCorrelationRow = {
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

export function buildIndividualCorrelations(
  players: DerivedPlayerStats[],
  playerId?: string
): IndividualCorrelationRow[] {
  const selected = players.find((p) => p.id === playerId);
  if (!selected) return [];

  const peerGroup = players.filter((p) => p.games > 0);
  const wins = peerGroup.map((p) => (p.id === selected.id ? 1 : 0));

  const rows: IndividualCorrelationRow[] = [
    {
      key: 'allContractsEfficiency',
      label: 'Player Efficiency vs Wins',
      value: pearson(
        peerGroup.map((p) => p.allContractsEfficiency),
        wins
      ),
    },
    {
      key: 'earlyLeadRate',
      label: 'Player Early Lead vs Wins',
      value: pearson(
        peerGroup.map((p) => p.earlyLeadRate),
        wins
      ),
    },
    {
      key: 'lateLeadRate',
      label: 'Player Late Lead vs Wins',
      value: pearson(
        peerGroup.map((p) => p.lateLeadRate),
        wins
      ),
    },
    {
      key: 'objectivesPerGame',
      label: 'Player Objectives vs Wins',
      value: pearson(
        peerGroup.map((p) => p.objectivesPerGame),
        wins
      ),
    },
    {
      key: 'assistsGivenPerGame',
      label: 'Player Assists Given vs Wins',
      value: pearson(
        peerGroup.map((p) => p.assistsGivenPerGame),
        wins
      ),
    },
    {
      key: 'assistsReceivedPerGame',
      label: 'Player Assists Received vs Wins',
      value: pearson(
        peerGroup.map((p) => p.assistsReceivedPerGame),
        wins
      ),
    },
    {
      key: 'clutchScore',
      label: 'Player Clutch Score vs Wins',
      value: pearson(
        peerGroup.map((p) => p.clutchScore),
        wins
      ),
    },
    {
      key: 'opponentStrength',
      label: 'Player Opponent Strength vs Wins',
      value: pearson(
        peerGroup.map((p) => p.opponentStrength),
        wins
      ),
    },
    {
      key: 'tempoIndex',
      label: 'Player Tempo vs Wins',
      value: pearson(
        peerGroup.map((p) => p.tempoIndex),
        wins
      ),
    },
  ];

  return rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
