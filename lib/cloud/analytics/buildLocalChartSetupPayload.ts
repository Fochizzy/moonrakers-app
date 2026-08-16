import { resolveChartCatalogEntry } from "@/components/charts/chartCatalog";
import type { ChartSetupPayload } from "@/lib/cloud/analytics/types";
import {
  getVisibleEloMetricTabs,
  normalizeVisibleEloMetricTab,
} from "@/utils/elo/visibleMetricTabs";
import { getMetricOrFallback } from "@/utils/metricMap";
import {
  getSupportedMetricKeysForChart,
  normalizeMetricForChart,
  resolvePreferredChartPlayerId,
  type StorePlayer,
} from "@/utils/charts";

type LocalSetupPlayer = Pick<
  StorePlayer,
  "id" | "name" | "color" | "initials" | "assignedCardArtIndex" | "artIndex"
>;

type BuildLocalChartSetupPayloadArgs = {
  chartKey: string;
  players: LocalSetupPlayer[];
  authProfileId?: string | null;
  authSessionUserId?: string | null;
  routePlayerId?: string | null;
  routeCompareId?: string | null;
  routeIds?: string[];
  routeMetric?: string | null;
  routeLineMode?: string | null;
  routeEloTab?: string | null;
  routeOpponentId?: string | null;
};

type SetupOption = {
  key: string;
  label: string;
};

const LINE_MODE_CHART_KEYS = new Set([
  "line_chart",
  "multi_line_chart",
  "multi-line-chart",
  "multi-line",
  "line",
  "prestige_over_time",
]);

const LOCAL_LINE_MODE_OPTIONS: SetupOption[] = [
  { key: "raw", label: "Raw" },
  { key: "cumulative", label: "Cumulative" },
  { key: "average", label: "Average" },
];

const LOCAL_ELO_VIEW_OPTIONS: SetupOption[] = getVisibleEloMetricTabs().map(
  (tab) => ({
    key: tab,
    label: tab,
  }),
);

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function buildPlayerOptions(players: LocalSetupPlayer[]): SetupOption[] {
  const seen = new Set<string>();
  const options: SetupOption[] = [];

  for (const player of Array.isArray(players) ? players : []) {
    const id = normalizeId(player?.id);
    if (!id || seen.has(id)) continue;

    seen.add(id);
    options.push({
      key: id,
      label: normalizeName(player?.name) || "Player",
    });
  }

  return options;
}

function resolveScopedPlayerIds(
  chartKey: string,
  routeIds: string[],
  playerOptions: SetupOption[],
) {
  const validPlayerIds = new Set(playerOptions.map((option) => option.key));
  const validRouteIds = routeIds.filter((id) => validPlayerIds.has(normalizeId(id)));

  if (chartKey === "relationship_graph" && validRouteIds.length >= 2) {
    return validRouteIds;
  }

  if (validRouteIds.length) {
    return validRouteIds;
  }

  const fallbackCount = chartKey === "relationship_graph" ? 2 : 4;
  return playerOptions.slice(0, Math.min(fallbackCount, playerOptions.length)).map((option) => option.key);
}

function resolveFirstDifferentOption(
  options: SetupOption[],
  excludedId: string | null,
  preferredId?: string | null,
) {
  const normalizedExcludedId = normalizeId(excludedId);
  const normalizedPreferredId = normalizeId(preferredId);

  if (normalizedPreferredId && normalizedPreferredId !== normalizedExcludedId) {
    const preferredOption = options.find((option) => option.key === normalizedPreferredId);
    if (preferredOption) {
      return preferredOption.key;
    }
  }

  const fallback = options.find((option) => option.key !== normalizedExcludedId);
  return fallback ? fallback.key : null;
}

function buildMetricOptions(chartKey: string): SetupOption[] {
  if (chartKey === "prestige_over_time") {
    return [];
  }

  return getSupportedMetricKeysForChart(chartKey).map((metricKey) => ({
    key: metricKey,
    label: getMetricOrFallback(metricKey).label,
  }));
}

function resolveLineModeOptions(chartKey: string): SetupOption[] {
  return LINE_MODE_CHART_KEYS.has(chartKey) ? LOCAL_LINE_MODE_OPTIONS : [];
}

function resolveEloViewOptions(chartKey: string): SetupOption[] {
  return chartKey === "elo" ? LOCAL_ELO_VIEW_OPTIONS : [];
}

function resolveMetricDefault(chartKey: string, routeMetric?: string | null) {
  return normalizeMetricForChart(chartKey, routeMetric);
}

function resolveLineModeDefault(
  options: SetupOption[],
  routeLineMode?: string | null,
) {
  if (!options.length) return null;

  const normalized = normalizeId(routeLineMode).toLowerCase();
  const matched = options.find((option) => option.key.toLowerCase() === normalized);
  return matched ? matched.key : options[0]?.key ?? null;
}

function resolveEloTabDefault(
  options: SetupOption[],
  routeEloTab?: string | null,
) {
  if (!options.length) return null;

  const matched = options.find(
    (option) => option.key === normalizeVisibleEloMetricTab(routeEloTab),
  );
  return matched ? matched.key : options[0]?.key ?? null;
}

export function buildLocalChartSetupPayload(
  args: BuildLocalChartSetupPayloadArgs,
): ChartSetupPayload | null {
  const entry = resolveChartCatalogEntry(args.chartKey);
  if (!entry) {
    return null;
  }

  const playerOptions = buildPlayerOptions(args.players);
  if (!playerOptions.length) {
    return null;
  }

  const preferredFocusPlayerId =
    resolvePreferredChartPlayerId({
      availablePlayers: args.players as StorePlayer[],
      routePlayerId: args.routePlayerId ?? null,
      authProfileId: args.authProfileId ?? null,
      authSessionUserId: args.authSessionUserId ?? null,
    }) ?? playerOptions[0]?.key ?? null;

  const comparePlayerOptions = entry.supportsCompare ? playerOptions : [];
  const scopePlayerOptions = playerOptions;
  const metricOptions = entry.supportsMetric ? buildMetricOptions(entry.key) : [];
  const lineModeOptions = resolveLineModeOptions(entry.key);
  const eloViewOptions = resolveEloViewOptions(entry.key);
  const opponentOptions = entry.key === "elo" ? playerOptions : [];

  const focusPlayerId = preferredFocusPlayerId;
  const comparePlayerId = comparePlayerOptions.length
    ? resolveFirstDifferentOption(
        comparePlayerOptions,
        focusPlayerId,
        args.routeCompareId ?? null,
      )
    : null;
  const scopedPlayerIds = resolveScopedPlayerIds(
    entry.key,
    Array.isArray(args.routeIds) ? args.routeIds : [],
    scopePlayerOptions,
  );
  const metricKey = metricOptions.length
    ? resolveMetricDefault(entry.key, args.routeMetric ?? null)
    : null;
  const lineMode = resolveLineModeDefault(lineModeOptions, args.routeLineMode ?? null);
  const eloTab = resolveEloTabDefault(eloViewOptions, args.routeEloTab ?? null);
  const opponentId = opponentOptions.length
    ? resolveFirstDifferentOption(
        opponentOptions,
        focusPlayerId,
        args.routeOpponentId ?? null,
      )
    : null;

  return {
    chartKey: entry.key,
    generatedAt: new Date().toISOString(),
    focusPlayerOptions: playerOptions,
    comparePlayerOptions,
    scopePlayerOptions,
    metricOptions,
    lineModeOptions,
    eloViewOptions,
    opponentOptions,
    defaults: {
      focusPlayerId,
      comparePlayerId,
      scopedPlayerIds,
      metricKey,
      lineMode,
      eloTab,
      opponentId,
    },
    emptyState: null,
  };
}
