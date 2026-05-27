import type { PlaystyleSample } from '@/utils/playstyleEngine';

export type PlaystyleCorrelationKey =
  | 'wins'
  | 'prestige'
  | 'objectivePoints'
  | 'assistsGiven'
  | 'assistsReceived';

export type PlaystyleCorrelationStatus = 'ok' | 'flat' | 'insufficient';
export type PlaystyleCorrelationDirection = 'positive' | 'negative' | 'neutral';
export type PlaystyleCorrelationStrength =
  | 'Very Strong'
  | 'Strong'
  | 'Moderate'
  | 'Weak'
  | 'Minimal';

export type PlaystyleCorrelationRow = {
  key: PlaystyleCorrelationKey;
  label: string;
  value: number;
  direction: PlaystyleCorrelationDirection;
  strength: PlaystyleCorrelationStrength;
  status: PlaystyleCorrelationStatus;
  sampleSize: number;
};

type MetricDefinition = {
  key: PlaystyleCorrelationKey;
  label: string;
  getValue: (sample: PlaystyleSample) => number;
};

const METRICS: MetricDefinition[] = [
  {
    key: 'wins',
    label: 'Wins',
    getValue: (sample) => sample.winFlag,
  },
  {
    key: 'prestige',
    label: 'Prestige',
    getValue: (sample) => sample.totalPrestige,
  },
  {
    key: 'objectivePoints',
    label: 'Objective Prestige',
    getValue: (sample) => sample.objectivePoints,
  },
  {
    key: 'assistsGiven',
    label: 'Assists Given',
    getValue: (sample) => sample.assistsGiven,
  },
  {
    key: 'assistsReceived',
    label: 'Assists Received',
    getValue: (sample) => sample.assistsReceived,
  },
];

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function pearson(xValues: number[], yValues: number[]) {
  if (xValues.length < 2 || yValues.length < 2 || xValues.length !== yValues.length) {
    return 0;
  }

  const meanX = average(xValues);
  const meanY = average(yValues);

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (let index = 0; index < xValues.length; index += 1) {
    const dx = xValues[index] - meanX;
    const dy = yValues[index] - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) {
    return 0;
  }

  return numerator / Math.sqrt(sumX * sumY);
}

function getDistinctCount(values: number[]) {
  return new Set(values.map((value) => value.toFixed(6))).size;
}

function getDirection(value: number): PlaystyleCorrelationDirection {
  if (!Number.isFinite(value) || Math.abs(value) < 0.1) {
    return 'neutral';
  }

  return value > 0 ? 'positive' : 'negative';
}

function getStrength(value: number): PlaystyleCorrelationStrength {
  const absValue = Math.abs(value);
  if (absValue >= 0.7) return 'Very Strong';
  if (absValue >= 0.5) return 'Strong';
  if (absValue >= 0.3) return 'Moderate';
  if (absValue >= 0.1) return 'Weak';
  return 'Minimal';
}

function buildRows(samples: PlaystyleSample[], minSamples: number): PlaystyleCorrelationRow[] {
  return METRICS.map((metric) => {
    const validSamples = samples.filter((sample) => {
      const baseRate = sample?.stayAtBaseRate;
      const metricValue = metric.getValue(sample);

      return Number.isFinite(baseRate) && Number.isFinite(metricValue);
    });

    const sampleSize = validSamples.length;
    const xValues = validSamples.map((sample) => sample.stayAtBaseRate as number);
    const yValues = validSamples.map(metric.getValue);
    const hasVariance = getDistinctCount(xValues) > 1 && getDistinctCount(yValues) > 1;
    const value = hasVariance ? pearson(xValues, yValues) : 0;
    const safeValue = Number.isFinite(value) ? value : 0;

    let status: PlaystyleCorrelationStatus = 'ok';

    if (sampleSize < minSamples) {
      status = 'insufficient';
    } else if (!hasVariance) {
      status = 'flat';
    }

    return {
      key: metric.key,
      label: metric.label,
      value: safeValue,
      direction: getDirection(safeValue),
      strength: getStrength(safeValue),
      status,
      sampleSize,
    };
  });
}

export function buildPersonalPlaystyleCorrelations(
  samples: PlaystyleSample[],
  playerId?: string | null,
  minSamples = 5
): PlaystyleCorrelationRow[] {
  if (!playerId) {
    return [];
  }

  return buildRows(
    samples.filter((sample) => sample.playerId === playerId),
    minSamples
  );
}

export function buildGlobalPlaystyleCorrelations(
  samples: PlaystyleSample[],
  minSamples = 10
): PlaystyleCorrelationRow[] {
  return buildRows(samples, minSamples);
}
