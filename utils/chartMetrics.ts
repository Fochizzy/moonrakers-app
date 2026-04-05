export type MetricCategory =
  | 'prestige'
  | 'score'
  | 'contracts'
  | 'failures'
  | 'assists'
  | 'efficiency'
  | 'momentum'
  | 'stability'
  | 'elo'
  | 'social'
  | 'turn_order';

export type MetricScope = 'player' | 'game' | 'round' | 'pairing';

export type MetricFormat =
  | 'number'
  | 'percent'
  | 'ratio'
  | 'signed'
  | 'decimal1'
  | 'decimal2';

export type MetricKey =
  | 'totalPrestige'
  | 'objectiveCount'
  | 'avgObjectivesPerTrackedGame'
  | 'objectiveWinCorrelation'
  | 'objectiveShareOfPrestige'
  | 'avgPrestigePerGame'
  | 'avgPrestigePerRound'
  | 'avgScorePerGame'
  | 'efficiency'
  | 'assistedEfficiency'
  | 'directEfficiency'
  | 'contractFailureRatio'
  | 'winRate'
  | 'eloDelta'
  | 'avgStartSeat'
  | 'turnOrderWinCorrelation';

export type MetricDefinition<T = any> = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  description: string;
  category: MetricCategory;
  scope: MetricScope;
  format: MetricFormat;
  getValue: (row: T) => number;
};

export function safeNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function safeDiv(numerator: number, denominator: number): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }
  return numerator / denominator;
}

export function stdDev(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return 0;

  const mean = clean.reduce((sum, v) => sum + v, 0) / clean.length;
  const variance =
    clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / clean.length;

  return Math.sqrt(variance);
}

export function formatMetricValue(value: number, format: MetricFormat = 'number'): string {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'ratio':
      return value.toFixed(2);
    case 'signed':
      return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
    case 'decimal1':
      return value.toFixed(1);
    case 'decimal2':
      return value.toFixed(2);
    case 'number':
    default:
      return `${Math.round(value)}`;
  }
}
