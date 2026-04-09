import type { EloGameRecord } from "./eloTransforms";
import {
  computeMetric,
  getMetricsForTab,
  type EloMetricFormat,
  type EloMetricTab,
  type MetricContext,
  type MetricKey,
} from "./metricRegistry";

export type PresentedMetric = {
  key: MetricKey;
  label: string;
  value: number;
  formatted: string;
  description?: string;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function formatMetricValue(format: EloMetricFormat, value: number): string {
  switch (format) {
    case "percent":
      return `${Math.round(toNumber(value) * 100)}%`;
    case "decimal":
      return toNumber(value).toFixed(2);
    case "elo":
      return `${Math.round(toNumber(value))}`;
    case "rank":
      return `#${Math.max(1, Math.round(toNumber(value)))}`;
    case "number":
    default: {
      const rounded = Math.round(toNumber(value));
      return rounded > 0 ? `+${rounded}` : `${rounded}`;
    }
  }
}

export function presentMetricsForTab(
  tab: EloMetricTab,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): PresentedMetric[] {
  return getMetricsForTab(tab).map((def) => {
    const value = computeMetric(def.key, rows, allRows, context);
    return {
      key: def.key,
      label: def.label,
      value,
      formatted: formatMetricValue(def.format, value),
      description: def.description,
    };
  });
}
