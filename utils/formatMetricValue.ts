import type { MetricDefinition } from './chartMetrics';

export function formatMetricValue(
  value: number,
  format?: MetricDefinition['format']
) {
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
