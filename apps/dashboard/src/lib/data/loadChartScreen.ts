import {
  type ChartDatasetPayload,
  type ChartSetupPayload,
  getChartDataset,
  getChartSetup,
} from "@moonrakers/analytics-contract";

import {
  getSupportedMetricKeysForChart,
  normalizeMetricForChart,
} from "../../../../../utils/charts";
import { getMetricOrFallback } from "../../../../../utils/metricMap";
import { buildChartControls, chartDatasetHasSourceHistory, mergeChartDatasetSourceHistory } from "../charts/chartFallback";
import { requireDashboardAccess } from "../auth/serverAccess";
import { normalizeOptionalSearchParam } from "../readSearchParam";
import { loadChartFallbackHistory } from "./loadChartFallbackHistory";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadChartScreenInput = {
  chartKey: string;
  comparePlayerId?: string | null;
  focusPlayerId?: string | null;
  lineMode?: string | null;
  metricKey?: string | null;
  opponentId?: string | null;
  scopedPlayerIds?: string[] | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function playerOptionsFromDataset(dataset: ChartDatasetPayload) {
  const data = asRecord(dataset.data);
  const sourcePlayers = asArray(data.sourcePlayers);
  const nativePlayers = asArray(data.players);
  const players = sourcePlayers.length > 0 ? sourcePlayers : nativePlayers;
  const seen = new Set<string>();

  return players
    .map((player) => {
      const key = toOptionalString(player.id);
      if (!key || seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        key,
        label:
          toOptionalString(player.name) ??
          toOptionalString(player.displayName) ??
          toOptionalString(player.playerName) ??
          key,
      };
    })
    .filter((option): option is { key: string; label: string } => option !== null);
}

function mergeOptions(
  existing: ChartSetupPayload["focusPlayerOptions"],
  fallback: ChartSetupPayload["focusPlayerOptions"],
) {
  const seen = new Set<string>();
  const merged: ChartSetupPayload["focusPlayerOptions"] = [];

  [...existing, ...fallback].forEach((option) => {
    const key = toOptionalString(option.key);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push({
      key,
      label: toOptionalString(option.label) ?? key,
    });
  });

  return merged;
}

const COMPARE_PLAYER_CHART_KEYS = new Set([
  "compare",
  "radar",
  "head_to_head",
  "rivalry_graph",
  "sparkline",
]);

const SCOPED_PLAYER_CHART_KEYS = new Set([
  "consistency_band",
  "elo",
  "stacked_bar_chart",
  "line_chart",
  "prestige_over_time",
  "bump_chart",
  "bar_chart",
  "heatmap",
  "efficiency_failure_scatter",
  "multi_line_chart",
  "replay_chart",
]);

function buildMetricOptions(chartKey: string) {
  return getSupportedMetricKeysForChart(chartKey).map((metricKey) => ({
    key: metricKey,
    label: getMetricOrFallback(metricKey).label,
  }));
}

function canonicalizeChartKey(chartKey: string) {
  const normalized = String(chartKey ?? "").trim().toLowerCase();

  switch (normalized) {
    case "bar":
      return "bar_chart";
    case "line":
      return "line_chart";
    case "multi-line-chart":
    case "multi-line":
      return "multi_line_chart";
    case "relationship-graph":
    case "assist_network_overview":
      return "relationship_graph";
    case "efficiency-failure-scatter":
      return "efficiency_failure_scatter";
    default:
      return normalized;
  }
}

function resolveChartControlCapabilities(chartKey: string) {
  const canonicalChartKey = canonicalizeChartKey(chartKey);
  const isRelationshipGraph = canonicalChartKey === "relationship_graph";

  return {
    isRelationshipGraph,
    supportsCompare: COMPARE_PLAYER_CHART_KEYS.has(canonicalChartKey),
    supportsMetric: buildMetricOptions(canonicalChartKey).length > 0,
    supportsScopedPlayers:
      SCOPED_PLAYER_CHART_KEYS.has(canonicalChartKey) && !isRelationshipGraph,
    supportsOpponent: canonicalChartKey === "elo",
  };
}

function normalizeSetupForChart(
  chartKey: string,
  setup: ChartSetupPayload,
  capabilities: ReturnType<typeof resolveChartControlCapabilities>,
): ChartSetupPayload {
  const metricOptions = capabilities.supportsMetric && setup.metricOptions.length === 0
    ? buildMetricOptions(chartKey)
    : setup.metricOptions;
  const normalizedDefaultMetricKey = capabilities.supportsMetric
    ? normalizeMetricForChart(chartKey, setup.defaults.metricKey) ??
      metricOptions[0]?.key ??
      null
    : null;

  return {
    ...setup,
    comparePlayerOptions: capabilities.supportsCompare
      ? setup.comparePlayerOptions
      : [],
    metricOptions,
    scopePlayerOptions: capabilities.supportsScopedPlayers
      ? setup.scopePlayerOptions
      : [],
    opponentOptions: capabilities.supportsOpponent
      ? setup.opponentOptions
      : [],
    defaults: {
      ...setup.defaults,
      comparePlayerId: capabilities.supportsCompare
        ? setup.defaults.comparePlayerId ?? null
        : null,
      metricKey: normalizedDefaultMetricKey,
      opponentId: capabilities.supportsOpponent
        ? setup.defaults.opponentId ?? null
        : null,
      scopedPlayerIds: capabilities.supportsScopedPlayers
        ? setup.defaults.scopedPlayerIds ?? []
        : [],
    },
  };
}

function hydrateSetupOptionsFromDataset({
  chartKey,
  controls,
  dataset,
  setup,
}: {
  chartKey: string;
  controls: ChartSetupPayload["defaults"];
  dataset: ChartDatasetPayload;
  setup: ChartSetupPayload;
}) {
  const capabilities = resolveChartControlCapabilities(chartKey);
  const playerOptions = playerOptionsFromDataset(dataset);
  if (playerOptions.length === 0) {
    return setup;
  }

  const focusPlayerId = controls.focusPlayerId;
  const comparisonOptions = playerOptions.filter(
    (option) => option.key !== focusPlayerId,
  );
  const noneOption = { key: "none", label: "None" };
  const opponentOptions = mergeOptions(
    setup.opponentOptions.length > 0 ? setup.opponentOptions : [noneOption],
    comparisonOptions,
  );

  return {
    ...setup,
    focusPlayerOptions: mergeOptions(setup.focusPlayerOptions, playerOptions),
    comparePlayerOptions: capabilities.supportsCompare
      ? mergeOptions(setup.comparePlayerOptions, comparisonOptions)
      : [],
    scopePlayerOptions: capabilities.supportsScopedPlayers
      ? mergeOptions(setup.scopePlayerOptions, playerOptions)
      : [],
    opponentOptions: capabilities.supportsOpponent ? opponentOptions : [],
  };
}

export async function loadChartScreen(input: LoadChartScreenInput) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const normalizedFocusPlayerId = normalizeOptionalSearchParam(input.focusPlayerId, {
    emptyValues: ["none"],
  });
  const normalizedComparePlayerId = normalizeOptionalSearchParam(input.comparePlayerId, {
    emptyValues: ["none"],
  });
  const normalizedOpponentId = normalizeOptionalSearchParam(input.opponentId, {
    emptyValues: ["none"],
  });
  const setup = await getChartSetup(client, {
    chartKey: input.chartKey,
    profileId: userId,
  });
  const capabilities = resolveChartControlCapabilities(input.chartKey);
  const chartSetup = normalizeSetupForChart(input.chartKey, setup, capabilities);
  const explicitScopedPlayerIds = (input.scopedPlayerIds ?? [])
    .map((playerId) =>
      normalizeOptionalSearchParam(playerId, { emptyValues: ["none"] }),
    )
    .filter((playerId): playerId is string => Boolean(playerId));
  const resolvedControls = buildChartControls({
    dataset: {
      chartKey: input.chartKey,
      generatedAt: new Date().toISOString(),
      data: {},
    },
    setup: chartSetup,
    controls: {
      focusPlayerId: normalizedFocusPlayerId,
      comparePlayerId: capabilities.supportsCompare
        ? normalizedComparePlayerId
        : null,
      scopedPlayerIds: capabilities.supportsScopedPlayers
        ? explicitScopedPlayerIds
        : [],
      metricKey: input.metricKey ?? null,
      lineMode: input.lineMode ?? null,
      eloTab: chartSetup.defaults.eloTab,
      opponentId: capabilities.supportsOpponent
        ? normalizedOpponentId
        : null,
    },
  });
  const controls = {
    ...resolvedControls,
    // The web route should only narrow charts when the URL explicitly asked for a scope.
    scopedPlayerIds: capabilities.supportsScopedPlayers
      ? explicitScopedPlayerIds
      : [],
  };
  let dataset = await getChartDataset(client, {
    chartKey: input.chartKey,
    profileId: userId,
    focusPlayerId: controls.focusPlayerId,
    comparePlayerId: controls.comparePlayerId,
    scopedPlayerIds: controls.scopedPlayerIds,
    selectedGameId: null,
    metricKey: controls.metricKey,
    lineMode: controls.lineMode,
    graphMode: null,
    opponentId: controls.opponentId,
  });

  if (!chartDatasetHasSourceHistory(dataset)) {
    try {
      const history = await loadChartFallbackHistory({
        supabase,
        userId,
        focusPlayerId: controls.focusPlayerId,
        comparePlayerId: controls.comparePlayerId,
        opponentId: controls.opponentId,
        scopedPlayerIds: controls.scopedPlayerIds,
      });
      dataset = mergeChartDatasetSourceHistory(dataset, history);
    } catch (error) {
      console.warn("loadChartScreen fallback history failed", error);
      // Keep the RPC payload if the raw history fallback is unavailable.
    }
  }

  const hydratedSetup = hydrateSetupOptionsFromDataset({
    chartKey: input.chartKey,
    controls,
    dataset,
    setup: chartSetup,
  });

  return { setup: hydratedSetup, dataset, controls };
}
