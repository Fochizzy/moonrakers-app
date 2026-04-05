import { METRICS, DEFAULT_METRIC_KEY } from './replayChart.config';
import type { MetricKey } from './replayChart.types';

export function getMetricOption(key?: MetricKey) {
  if (!key) {
    return METRICS.find((m) => m.key === DEFAULT_METRIC_KEY) ?? METRICS[0];
  }

  const found = METRICS.find((m) => m.key === key);

  if (!found) {
    return METRICS.find((m) => m.key === DEFAULT_METRIC_KEY) ?? METRICS[0];
  }

  return found;
}
