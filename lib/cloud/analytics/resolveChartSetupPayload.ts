import { resolveChartCatalogEntry } from "@/components/charts/chartCatalog";
import {
  filterVisibleEloViewOptions,
  normalizeVisibleEloMetricTab,
} from "@/utils/elo/visibleMetricTabs";

import type { ChartSetupOption, ChartSetupPayload } from "./types";

type ResolveChartSetupPayloadArgs = {
  chartKey?: string | null;
  publishedPayload?: ChartSetupPayload | null;
  fallbackPayload?: ChartSetupPayload | null;
};

function normalizeOptionList(
  value: ChartSetupOption[] | null | undefined,
): ChartSetupOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((option) => ({
      key: String(option?.key ?? "").trim(),
      label: String(option?.label ?? "").trim(),
    }))
    .filter((option) => option.key.length > 0);
}

function mergeOptionLists(
  primary: ChartSetupOption[] | null | undefined,
  secondary: ChartSetupOption[] | null | undefined,
) {
  const merged: ChartSetupOption[] = [];
  const seen = new Set<string>();

  for (const option of [
    ...normalizeOptionList(primary),
    ...normalizeOptionList(secondary),
  ]) {
    if (seen.has(option.key)) {
      continue;
    }

    seen.add(option.key);
    merged.push(option);
  }

  return merged;
}

function hasOptionKey(
  options: ChartSetupOption[],
  key: string | null | undefined,
) {
  const normalized = String(key ?? "").trim();
  if (!normalized) return false;
  return options.some((option) => option.key === normalized);
}

function resolveDefaultKey(
  preferredKey: string | null | undefined,
  options: ChartSetupOption[],
  fallbackKey: string | null | undefined,
) {
  const normalizedPreferredKey = String(preferredKey ?? "").trim();
  if (hasOptionKey(options, normalizedPreferredKey)) {
    return normalizedPreferredKey;
  }

  const normalizedFallbackKey = String(fallbackKey ?? "").trim();
  if (hasOptionKey(options, normalizedFallbackKey)) {
    return normalizedFallbackKey;
  }

  return options[0]?.key ?? null;
}

function normalizeEloViewDefault(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalizeVisibleEloMetricTab(normalized) : null;
}

function resolveScopedPlayerIds(
  preferredIds: string[] | null | undefined,
  options: ChartSetupOption[],
  fallbackIds: string[] | null | undefined,
  minimumCount: number,
) {
  const validIds = new Set(options.map((option) => option.key));
  const normalizeIds = (ids: string[] | null | undefined) =>
    Array.isArray(ids)
      ? ids
          .map((id) => String(id ?? "").trim())
          .filter((id) => validIds.has(id))
      : [];

  const preferred = normalizeIds(preferredIds);
  if (preferred.length >= minimumCount) {
    return preferred;
  }

  const fallback = normalizeIds(fallbackIds);
  if (fallback.length >= minimumCount) {
    return fallback;
  }

  return options.slice(0, minimumCount > 1 ? minimumCount : options.length).map((option) => option.key);
}

export function resolveEffectiveChartSetupPayload({
  chartKey,
  publishedPayload,
  fallbackPayload,
}: ResolveChartSetupPayloadArgs): ChartSetupPayload | null {
  if (!publishedPayload) {
    return fallbackPayload ?? null;
  }

  if (!fallbackPayload) {
    return publishedPayload;
  }

  const entry = resolveChartCatalogEntry(
    chartKey ?? publishedPayload.chartKey ?? fallbackPayload.chartKey,
  );
  if (!entry) {
    return publishedPayload;
  }

  const focusPlayerOptions = mergeOptionLists(
    publishedPayload.focusPlayerOptions,
    fallbackPayload.focusPlayerOptions,
  );
  const comparePlayerOptions = entry.supportsCompare
    ? mergeOptionLists(
        publishedPayload.comparePlayerOptions,
        fallbackPayload.comparePlayerOptions,
      )
    : [];
  const scopePlayerOptions = mergeOptionLists(
    publishedPayload.scopePlayerOptions,
    fallbackPayload.scopePlayerOptions,
  );
  const metricOptions = entry.supportsMetric
    ? mergeOptionLists(
        publishedPayload.metricOptions,
        fallbackPayload.metricOptions,
      )
    : [];
  const lineModeOptions = mergeOptionLists(
    publishedPayload.lineModeOptions,
    fallbackPayload.lineModeOptions,
  );
  const eloViewOptions = filterVisibleEloViewOptions(
    mergeOptionLists(
      publishedPayload.eloViewOptions,
      fallbackPayload.eloViewOptions,
    ),
  );
  const opponentOptions = mergeOptionLists(
    publishedPayload.opponentOptions,
    fallbackPayload.opponentOptions,
  );

  return {
    ...publishedPayload,
    chartKey: entry.key,
    focusPlayerOptions,
    comparePlayerOptions,
    scopePlayerOptions,
    metricOptions,
    lineModeOptions,
    eloViewOptions,
    opponentOptions,
    defaults: {
      focusPlayerId: resolveDefaultKey(
        publishedPayload.defaults?.focusPlayerId,
        focusPlayerOptions,
        fallbackPayload.defaults?.focusPlayerId,
      ),
      comparePlayerId: comparePlayerOptions.length
        ? resolveDefaultKey(
            publishedPayload.defaults?.comparePlayerId,
            comparePlayerOptions,
            fallbackPayload.defaults?.comparePlayerId,
          )
        : null,
      scopedPlayerIds: resolveScopedPlayerIds(
        publishedPayload.defaults?.scopedPlayerIds,
        scopePlayerOptions,
        fallbackPayload.defaults?.scopedPlayerIds,
        entry.key === "relationship_graph" ? 2 : 1,
      ),
      metricKey: metricOptions.length
        ? resolveDefaultKey(
            publishedPayload.defaults?.metricKey,
            metricOptions,
            fallbackPayload.defaults?.metricKey,
          )
        : null,
      lineMode: lineModeOptions.length
        ? resolveDefaultKey(
            publishedPayload.defaults?.lineMode,
            lineModeOptions,
            fallbackPayload.defaults?.lineMode,
          )
        : null,
      eloTab: eloViewOptions.length
        ? resolveDefaultKey(
            normalizeEloViewDefault(publishedPayload.defaults?.eloTab),
            eloViewOptions,
            normalizeEloViewDefault(fallbackPayload.defaults?.eloTab),
          )
        : null,
      opponentId: opponentOptions.length
        ? resolveDefaultKey(
            publishedPayload.defaults?.opponentId,
            opponentOptions,
            fallbackPayload.defaults?.opponentId,
          )
        : null,
    },
    emptyState:
      focusPlayerOptions.length > 0 || scopePlayerOptions.length > 0
        ? null
        : publishedPayload.emptyState ?? fallbackPayload.emptyState ?? null,
  };
}

export function needsChartSetupSupplement({
  chartKey,
  publishedPayload,
  fallbackPayload,
}: ResolveChartSetupPayloadArgs) {
  if (!publishedPayload || !fallbackPayload) {
    return false;
  }

  const effectivePayload = resolveEffectiveChartSetupPayload({
    chartKey,
    publishedPayload,
    fallbackPayload,
  });

  if (!effectivePayload) {
    return false;
  }

  return (
    effectivePayload.focusPlayerOptions.length >
      normalizeOptionList(publishedPayload.focusPlayerOptions).length ||
    effectivePayload.comparePlayerOptions.length >
      normalizeOptionList(publishedPayload.comparePlayerOptions).length ||
    effectivePayload.scopePlayerOptions.length >
      normalizeOptionList(publishedPayload.scopePlayerOptions).length ||
    effectivePayload.metricOptions.length >
      normalizeOptionList(publishedPayload.metricOptions).length ||
    effectivePayload.lineModeOptions.length >
      normalizeOptionList(publishedPayload.lineModeOptions).length ||
    effectivePayload.eloViewOptions.length >
      normalizeOptionList(publishedPayload.eloViewOptions).length ||
    effectivePayload.opponentOptions.length >
      normalizeOptionList(publishedPayload.opponentOptions).length
  );
}
