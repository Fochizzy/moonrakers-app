import { METRIC_DEFINITIONS, MetricKey } from './metricSchema';

export function formatMetricValue(metricKey: MetricKey, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const definition = METRIC_DEFINITIONS[metricKey];
  const decimals = definition.decimals ?? 0;

  if (definition.kind === 'percent') {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  return value.toFixed(decimals);
}

export function formatModeLabel(mode: 'raw' | 'perTurn' | 'efficiency'): string {
  switch (mode) {
    case 'perTurn':
      return 'Per Turn';
    case 'efficiency':
      return 'Efficiency';
    default:
      return 'Raw';
  }
}
