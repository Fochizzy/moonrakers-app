import type { PlaystyleCorrelationRow } from '@/utils/playstyleCorrelationEngine';

type PlaystyleInsightsInput = {
  playerName: string;
  personalRows: PlaystyleCorrelationRow[];
  globalRows: PlaystyleCorrelationRow[];
};

function getBestRow(rows: PlaystyleCorrelationRow[]) {
  const rankedRows = rows.filter((row) => row.status === 'ok' || row.status === 'flat');

  if (!rankedRows.length) {
    return rows[0] ?? null;
  }

  return [...rankedRows].sort((left, right) => Math.abs(right.value) - Math.abs(left.value))[0] ?? null;
}

function getInsufficientRow(rows: PlaystyleCorrelationRow[]) {
  return rows.find((row) => row.status === 'insufficient') ?? null;
}

function describeRelationship(row: PlaystyleCorrelationRow | null) {
  if (!row) {
    return 'Not enough data yet.';
  }

  if (row.status === 'insufficient') {
    return `Not enough data yet for ${row.label.toLowerCase()}.`;
  }

  if (row.status === 'flat') {
    return `${row.label} is not showing a meaningful relationship yet.`;
  }

  return `${row.label} is ${row.strength.toLowerCase()} and ${row.direction}.`;
}

export function buildPlaystyleInsights({
  playerName,
  personalRows,
  globalRows,
}: PlaystyleInsightsInput) {
  const strongestPersonal = getBestRow(personalRows);
  const strongestGlobal = getBestRow(globalRows);
  const insufficientGlobal = getInsufficientRow(globalRows);

  return [
    `Personally, ${playerName} shows that ${describeRelationship(strongestPersonal)}`,
    `Globally, ${describeRelationship(strongestGlobal)}`,
    `${describeRelationship(insufficientGlobal)}`,
  ];
}
