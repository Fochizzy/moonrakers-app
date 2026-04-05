import { METRIC_DEFINITIONS, MetricKey } from './metricSchema';

export function getMetricTooltip(metricKey: MetricKey, mode: 'raw' | 'perTurn' | 'efficiency'): string {
  const definition = METRIC_DEFINITIONS[metricKey];

  if (mode === 'perTurn' && definition.mode !== 'efficiency') {
    return `${definition.description} In Per Turn mode this value is divided by total turns.`;
  }

  return definition.description;
}
