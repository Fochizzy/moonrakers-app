import type { AnalyticsMetricCard } from "./types.ts";

/**
 * `get_analytics_home` and `get_stats_screen` publish their cards with `title`
 * and `description`, while the rest of the contract (and every consumer) reads
 * `label` and `detail`. Reading a key the payload never carries rendered a row
 * of unlabelled numbers, so the shape is reconciled once here rather than in
 * each view.
 */
function toDisplayText(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

export function normalizeAnalyticsMetricCard(
  value: unknown,
  index: number,
): AnalyticsMetricCard {
  const card =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const label =
    toDisplayText(card.label) ||
    toDisplayText(card.title) ||
    toDisplayText(card.name);
  const detail =
    toDisplayText(card.detail) ||
    toDisplayText(card.description) ||
    toDisplayText(card.sub);
  const rawValue = card.value;

  return {
    ...card,
    key: toDisplayText(card.key) || `card-${index}`,
    label: label || `Metric ${index + 1}`,
    value:
      typeof rawValue === "number" || typeof rawValue === "string"
        ? rawValue
        : "",
    ...(detail ? { detail } : {}),
  } as AnalyticsMetricCard;
}

export function normalizeAnalyticsMetricCards(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeAnalyticsMetricCard) : [];
}
