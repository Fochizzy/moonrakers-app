import type { EloGameRecord } from "./eloTransforms";
import { presentMetricsForTab } from "./metricPresenter";
import {
  type EloMetricTab,
  type MetricContext,
  type MetricKey,
} from "./metricRegistry";

export type MetricCardTone = "default" | "accent" | "blue" | "green" | "amber";

export type MetricCard = {
  key: MetricKey;
  label: string;
  value: number;
  displayValue: string;
  sub?: string;
  tone?: MetricCardTone;
};

function toneForKey(key: MetricKey): MetricCardTone {
  switch (key) {
    case "clutchScore":
    case "promotionOdds":
      return "accent";
    case "conversionScore":
    case "consistencyScore":
      return "green";
    case "tierStabilityScore":
    case "recoveryRate":
    case "contextConfidence":
      return "blue";
    case "upsetRate":
    case "vsHigherRatedWinRate":
    case "strengthOfSchedule":
      return "amber";
    default:
      return "default";
  }
}

export function buildCardsForTab(
  tab: EloMetricTab,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  return presentMetricsForTab(tab, rows, allRows, context).map((metric) => ({
    key: metric.key,
    label: metric.label,
    value: metric.value,
    displayValue: metric.formatted,
    sub: metric.description,
    tone: toneForKey(metric.key),
  }));
}
