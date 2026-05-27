import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AnalyticsRecoveryCard from "@/components/analytics/AnalyticsRecoveryCard";
import ChartInsightStrip from "@/components/charts/ChartInsightStrip";
import ChartMetricChip from "@/components/charts/ChartMetricChip";
import ChartSurface from "@/components/charts/ChartSurface";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import AssistNetworkOverview from "@/components/charts/AssistNetworkOverview";
import BarChart from "@/components/charts/BarChart";
import BumpChart from "@/components/charts/BumpChart";
import { resolveChartDetailProvenance } from "@/lib/charts/chartDetailProvenance";
import {
  CHART_COLORS,
  CHART_LAYOUT,
} from "@/components/charts/chartVisualSystem";
import {
  canAdjustChartFromHub,
  resolveChartCatalogEntry as resolveChartMetadata,
} from "@/components/charts/chartCatalog";
import ConsistencyBandChart from "@/components/charts/ConsistencyBandChart";
import EfficiencyFailureScatter from "@/components/charts/EfficiencyFailureScatter";
import HeadToHeadChart from "@/components/charts/HeadToHeadChart";
import Heatmap from "@/components/charts/Heatmap";
import LineChart from "@/components/charts/LineChart";
import EloChart from "@/components/charts/ELO/EloChart";
import PrestigeOverTimeChart from "@/components/charts/PrestigeOverTimeChart";
import RadarChart from "@/components/charts/RadarChart";
import ReplayChart from "@/components/charts/ReplayChart";
import RivalryGraph from "@/components/charts/RivalryGraph";
import RelationshipGraph from "@/components/charts/RelationshipGraph";
import Sparkline from "@/components/charts/Sparkline";
import StackedBarChart from "@/components/charts/StackedBarChart";
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { getChartDataset } from "@/lib/cloud/analytics/getChartDataset";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES } from "@/utils/appRoutes";
import { buildLocalChartDetailState } from "@/utils/chartDetailLocalData";
import { toNumberValue, toStringValue, toDisplayValue } from "@/utils/numbers";

type PayloadRecord = Record<string, unknown>;
type CloudFallbackSnapshot = Awaited<ReturnType<typeof loadCloudSnapshot>>;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getParamList(value?: string | string[]) {
  const raw = getParam(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeChartKey(value?: string | string[]) {
  const normalized = String(getParam(value) ?? "radar").trim().toLowerCase();
  if (normalized === "replay") return "replay_chart";
  if (normalized === "efficiency-failure-scatter") {
    return "efficiency_failure_scatter";
  }
  if (
    normalized === "relationship-graph" ||
    normalized === "assist_network_overview"
  ) {
    return "relationship_graph";
  }
  return normalized;
}

function normalizeGraphMode(value?: string | string[]) {
  return String(getParam(value) ?? "flow").trim().toLowerCase() === "network"
    ? "network"
    : "flow";
}

function normalizeLineMode(value?: string | string[]) {
  const normalized = String(getParam(value) ?? "raw").trim().toLowerCase();
  if (normalized === "cumulative") return "cumulative";
  if (normalized === "average") return "average";
  return "raw";
}

function toRecord(value: unknown): PayloadRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadRecord)
    : {};
}

function toArray(value: unknown): PayloadRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is PayloadRecord => Boolean(entry) && typeof entry === "object")
    : [];
}

function toList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    : [];
}

function toOptionalRecord(value: unknown): PayloadRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadRecord)
    : null;
}


function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSubheading(chartKey: string) {
  if (chartKey === "compare") return "Direct comparison workflow.";
  if (chartKey === "prestige_over_time") return "Prestige trend view.";
  return resolveChartMetadata(chartKey).hook;
}

function buildRouteParams(args: {
  chartKey: string;
  playerId?: string | null;
  compareId?: string | null;
  selectedGameId?: string | null;
  ids?: string[];
  metric?: string | null;
  mode?: string | null;
  lineMode?: string | null;
}) {
  const {
    chartKey,
    playerId,
    compareId,
    selectedGameId,
    ids,
    metric,
    mode,
    lineMode,
  } = args;
  return {
    chartKey,
    ...(playerId ? { playerId } : {}),
    ...(compareId ? { compareId } : {}),
    ...(selectedGameId ? { selectedGameId, gameId: selectedGameId } : {}),
    ...(ids && ids.length ? { ids: ids.join(",") } : {}),
    ...(metric ? { metric } : {}),
    ...(mode ? { mode } : {}),
    ...(lineMode ? { lineMode } : {}),
  };
}

function isLineModeDriven(chartKey: string) {
  return (
    chartKey === "line_chart" ||
    chartKey === "line" ||
    chartKey === "multi_line_chart" ||
    chartKey === "multi-line-chart" ||
    chartKey === "multi-line" ||
    chartKey === "prestige_over_time"
  );
}

function resolveChartTitle(chartKey: string) {
  if (chartKey === "compare") return "Compare";
  if (chartKey === "prestige_over_time") return "Prestige Over Time";
  return resolveChartMetadata(chartKey).title || titleCase(chartKey);
}

function resolveSetupChartKey(chartKey: string) {
  if (!canAdjustChartFromHub(chartKey)) return null;
  if (chartKey === "compare") return null;
  if (chartKey === "prestige_over_time") return "line_chart";
  return resolveChartMetadata(chartKey).key;
}

function DatasetStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.datasetStat}>
      <Text style={styles.datasetStatLabel}>{label}</Text>
      <Text style={styles.datasetStatValue}>{value}</Text>
    </View>
  );
}

export default function ChartKeyScreen() {
  const router = useRouter();
  const authSession = useStore((state: any) => state.authSession);
  const params = useLocalSearchParams<{
    chartKey?: string | string[];
    playerId?: string | string[];
    compareId?: string | string[];
    selectedGameId?: string | string[];
    gameId?: string | string[];
    ids?: string | string[];
    metric?: string | string[];
    mode?: string | string[];
    lineMode?: string | string[];
    opponentId?: string | string[];
  }>();

  const chartKey = normalizeChartKey(params.chartKey);
  const routeMode = normalizeGraphMode(params.mode);
  const routeLineMode = normalizeLineMode(params.lineMode);
  const routePlayerId = getParam(params.playerId);
  const routeCompareId = getParam(params.compareId);
  const routeSelectedGameId =
    getParam(params.selectedGameId) ?? getParam(params.gameId);
  const routeIds = getParamList(params.ids);
  const routeIdsKey = routeIds.join(",");
  const routeMetric = getParam(params.metric);
  const routeOpponentId = getParam(params.opponentId);
  const setupChartKey = useMemo(() => resolveSetupChartKey(chartKey), [chartKey]);
  const profileId = String(authSession?.user?.id ?? "").trim();
  const [cloudFallbackSnapshot, setCloudFallbackSnapshot] =
    useState<CloudFallbackSnapshot | null>(null);
  const [cloudFallbackLoading, setCloudFallbackLoading] = useState(false);
  const [cloudFallbackAttempted, setCloudFallbackAttempted] = useState(false);
  const datasetQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: [
      "chart-dataset",
      profileId || "anon",
      chartKey,
      routePlayerId || "none",
      routeCompareId || "none",
      routeIdsKey || "all",
      routeSelectedGameId || "none",
      routeMetric || "none",
      routeLineMode || "raw",
      routeMode || "flow",
      routeOpponentId || "none",
    ].join(":"),
    load: () =>
      getChartDataset({
        chartKey,
        profileId,
        focusPlayerId: routePlayerId ?? null,
        comparePlayerId: routeCompareId ?? null,
        scopedPlayerIds: routeIds.length ? routeIds : null,
        selectedGameId: routeSelectedGameId ?? null,
        metricKey: routeMetric ?? null,
        lineMode: routeLineMode ?? null,
        graphMode: routeMode ?? null,
        opponentId: routeOpponentId ?? null,
      }),
  });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const nextError = datasetQuery.error;
    if (nextError !== null) {
      setError(formatSupabaseConfigError(nextError) || "Failed to load chart.");
    } else {
      setError(null);
    }
  }, [datasetQuery.error]);
  const dataset = toRecord(datasetQuery.payload);
  const loading = datasetQuery.loading;
  const isStale = datasetQuery.isStale;
  const staleMessage = datasetQuery.staleMessage;

  useEffect(() => {
    setCloudFallbackSnapshot(null);
    setCloudFallbackLoading(false);
    setCloudFallbackAttempted(false);
  }, [profileId]);

  const datasetData = toRecord(dataset.data);
  const datasetMeta = toRecord(datasetData.meta);
  const datasetPoints = toArray(datasetData.points);
  const datasetSeries = toArray(datasetData.series);
  const serverPlayers = toArray(datasetData.players) as any[];
  const serverGames = toArray(datasetData.games) as any[];
  const serverChartData = toList(datasetData.data);
  const serverReplayData = toList(datasetData.replay);
  const serverComparisonData = toList(datasetData.comparisonData);
  const serverMetricOptions = toList(datasetData.metricOptions);
  const serverMetricDataMap = toRecord(datasetData.metricDataMap);
  const serverSelectedPlayerIds = toStringArray(datasetData.selectedPlayerIds);
  const serverScopedPlayerIds = toStringArray(datasetData.scopedPlayerIds);
  const serverPrimaryRadar = toOptionalRecord(datasetData.primary);
  const serverComparisonRadar = toOptionalRecord(datasetData.comparison);
  const rpcFallbackPlayers = toArray(datasetData.sourcePlayers) as any[];
  const rpcFallbackGames = toArray(datasetData.sourceGames) as any[];
  const serverChartPlayers = serverPlayers.length ? serverPlayers : rpcFallbackPlayers;
  const serverChartGames = serverGames.length ? serverGames : rpcFallbackGames;
  const serverRelationshipPlayers = serverPlayers;
  const serverRelationshipEdges = toArray(
    datasetData.relationships ?? datasetData.edges,
  ) as any[];
  const emptyState = toRecord(dataset?.emptyState);
  const summaryChips = [
    routeMetric ? `Metric: ${routeMetric}` : null,
    routeLineMode && isLineModeDriven(chartKey) ? `Mode: ${routeLineMode}` : null,
    routeMode === "network" ? "Graph: network" : null,
    routePlayerId ? `Focus: ${routePlayerId}` : null,
  ].filter(Boolean) as string[];
  const pointCount = toNumberValue(datasetMeta.pointCount, datasetPoints.length);
  const hasData = Boolean(datasetMeta.hasData) || pointCount > 0 || datasetSeries.length > 0;
  const hasRpcFallbackSourceData =
    rpcFallbackGames.length > 0 || rpcFallbackPlayers.length > 0;
  const cloudFallbackPlayers = cloudFallbackSnapshot?.players ?? [];
  const cloudFallbackGames = cloudFallbackSnapshot?.games ?? [];
  const localChartData = useMemo(
    () =>
      buildLocalChartDetailState({
        chartKey,
        players: rpcFallbackPlayers.length ? rpcFallbackPlayers : cloudFallbackPlayers,
        games: rpcFallbackGames.length ? rpcFallbackGames : cloudFallbackGames,
        routePlayerId: routePlayerId ?? null,
        routeCompareId: routeCompareId ?? null,
        routeSelectedGameId: routeSelectedGameId ?? null,
        routeIds,
        routeMetric: routeMetric ?? null,
      }),
    [
      chartKey,
      cloudFallbackGames,
      cloudFallbackPlayers,
      rpcFallbackGames,
      rpcFallbackPlayers,
      routeCompareId,
      routeIdsKey,
      routeMetric,
      routePlayerId,
      routeSelectedGameId,
    ],
  );
  const serverMetricKey = toStringValue(
    datasetData.statKey ?? datasetData.metricKey ?? datasetData.activeMetricKey,
    localChartData.metricKey,
  );
  const serverLineMode = toStringValue(datasetData.mode, routeLineMode);
  const serverActiveMetricKey = toStringValue(
    datasetData.activeMetricKey,
    serverMetricKey,
  );
  const serverScopeIds =
    serverScopedPlayerIds.length > 0 ? serverScopedPlayerIds : routeIds;
  const serverSelectedIds =
    serverSelectedPlayerIds.length > 0
      ? serverSelectedPlayerIds
      : serverScopeIds;
  const serverFocusPlayerId = useMemo(() => {
    const candidate = toStringValue(
      datasetData.playerId ?? datasetMeta.focusPlayerId,
      routePlayerId ?? "",
    ).trim();
    return candidate.length > 0 ? candidate : null;
  }, [datasetData.playerId, datasetMeta.focusPlayerId, routePlayerId]);
  const serverComparePlayerId = useMemo(() => {
    const candidate = toStringValue(
      datasetData.compareId ?? datasetMeta.comparePlayerId,
      routeCompareId ?? "",
    ).trim();
    return candidate.length > 0 ? candidate : null;
  }, [datasetData.compareId, datasetMeta.comparePlayerId, routeCompareId]);
  const serverPlayerDirectory = useMemo(() => {
    const directory = new Map<string, any>();
    [...serverChartPlayers, ...rpcFallbackPlayers].forEach((player) => {
      const id = String(player?.id ?? "").trim();
      if (!id || directory.has(id)) {
        return;
      }
      directory.set(id, player);
    });
    return directory;
  }, [rpcFallbackPlayers, serverChartPlayers]);
  const serverFocusPlayer = serverFocusPlayerId
    ? serverPlayerDirectory.get(serverFocusPlayerId) ?? null
    : null;
  const serverComparePlayer = serverComparePlayerId
    ? serverPlayerDirectory.get(serverComparePlayerId) ?? null
    : null;
  const scopedPlayerIds = localChartData.scopedPlayerIds;
  const hasRenderableServerChart = useMemo(() => {
    switch (chartKey) {
      case "relationship_graph":
        return (
          serverChartPlayers.length > 0 && serverRelationshipEdges.length > 0
        );
      case "radar":
        return Boolean(serverPrimaryRadar);
      case "sparkline":
        return serverChartData.length > 0 || serverComparisonData.length > 0;
      case "head_to_head":
        return (
          serverChartPlayers.length >= 2 &&
          (serverChartData.length > 0 || serverChartGames.length > 0)
        );
      case "rivalry_graph":
        return (
          Boolean(serverFocusPlayerId) &&
          serverChartGames.length > 0 &&
          serverChartPlayers.length > 0
        );
      case "elo":
        return serverChartGames.length > 0 && serverChartPlayers.length > 0;
      case "replay_chart":
        return serverReplayData.length > 0 && serverChartPlayers.length > 0;
      case "stacked_bar_chart":
        return (
          serverChartData.length > 0 ||
          Object.keys(serverMetricDataMap).length > 0
        );
      case "line_chart":
      case "line":
      case "multi_line_chart":
      case "multi-line-chart":
      case "multi-line":
      case "prestige_over_time":
      case "bar_chart":
      case "bar":
      case "bump_chart":
      case "consistency_band":
      case "heatmap":
      case "efficiency_failure_scatter":
        return serverChartData.length > 0 && serverChartPlayers.length > 0;
      default:
        return false;
    }
  }, [
    chartKey,
    serverChartData.length,
    serverChartGames.length,
    serverChartPlayers.length,
    serverComparisonData.length,
    serverFocusPlayerId,
    serverPrimaryRadar,
    serverRelationshipEdges.length,
    serverReplayData.length,
    serverMetricDataMap,
  ]);
  const hasServerPayload = hasData || hasRenderableServerChart;
  const shouldUseLocalChartFallback =
    localChartData.hasData && !loading && !hasServerPayload;
  const usingCloudFallbackData = shouldUseLocalChartFallback && localChartData.hasData;
  const shouldSkipCloudFallbackBecauseRpcSource =
    hasServerPayload || hasRpcFallbackSourceData;
  const shouldLoadCloudFallback =
    Boolean(profileId) &&
    !cloudFallbackSnapshot &&
    !cloudFallbackAttempted &&
    !cloudFallbackLoading &&
    !loading &&
    !hasServerPayload &&
    !shouldSkipCloudFallbackBecauseRpcSource;
  const provenance = useMemo(
    () =>
      resolveChartDetailProvenance({
        hasServerPayload: hasServerPayload && !shouldUseLocalChartFallback,
        isStale,
        usingCloudFallbackData,
        staleMessage,
      }),
    [
      hasData,
      hasServerPayload,
      isStale,
      shouldUseLocalChartFallback,
      staleMessage,
      usingCloudFallbackData,
    ],
  );
  const heroSubtitle = shouldUseLocalChartFallback
    ? provenance.caption
    : isStale
      ? provenance.caption
    : toStringValue(dataset?.subtitle, buildSubheading(chartKey));

  useEffect(() => {
    if (!shouldLoadCloudFallback || !profileId) {
      return;
    }

    let cancelled = false;
    setCloudFallbackAttempted(true);
    setCloudFallbackLoading(true);

    void loadCloudSnapshot(profileId)
      .then((snapshot) => {
        if (!cancelled) {
          setCloudFallbackSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCloudFallbackSnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCloudFallbackLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cloudFallbackAttempted, profileId, shouldLoadCloudFallback]);

  function renderSparklineFallback() {
    if (!localChartData.sparklineValues.length) {
      return <Text style={styles.emptyText}>No sparkline trend is available yet.</Text>;
    }

    return (
      <View style={styles.sparklineFallback}>
        <Text style={styles.sparklineTitle}>
          {localChartData.selectedPlayer?.name ?? "Player"} Trend
        </Text>
        <Sparkline
          data={localChartData.sparklineValues}
          width={300}
          height={60}
          color={CHART_COLORS.accent}
          strokeWidth={3}
        />
      </View>
    );
  }

  function renderLocalChartFallback() {
    switch (chartKey) {
      case "radar":
        return localChartData.radarPrimary ? (
          <RadarChart
            primary={localChartData.radarPrimary}
            primaryLabel={localChartData.selectedPlayer?.name ?? "Player"}
            title={`${localChartData.selectedPlayer?.name ?? "Player"} Radar`}
            showHeader={false}
          />
        ) : (
          <Text style={styles.emptyText}>No radar profile is available yet.</Text>
        );
      case "sparkline":
        return renderSparklineFallback();
      case "relationship_graph":
        return (
          <AssistNetworkOverview
            games={cloudFallbackGames as any}
            players={cloudFallbackPlayers as any}
            scopedPlayerIds={routeIds.length ? routeIds : scopedPlayerIds}
            exactScopePlayerIds={routeIds.length >= 2 ? routeIds : undefined}
            mode={routeMode}
          />
        );
      case "head_to_head":
        return localChartData.selectedPlayer && localChartData.comparePlayer ? (
          <HeadToHeadChart
            data={localChartData.snapshots as any}
            players={
              [localChartData.selectedPlayer, localChartData.comparePlayer] as any
            }
            playerId={localChartData.selectedPlayer.id}
            compareId={localChartData.comparePlayer.id}
            scopedPlayerIds={[
              localChartData.selectedPlayer.id,
              localChartData.comparePlayer.id,
            ]}
            showHeader={false}
          />
        ) : (
          <Text style={styles.emptyText}>
            Pick two players with saved games to open head-to-head.
          </Text>
        );
      case "rivalry_graph":
        return localChartData.selectedPlayer ? (
          <RivalryGraph
            playerId={localChartData.selectedPlayer.id}
            games={localChartData.scopedGames as any}
            players={localChartData.chartPlayers as any}
          />
        ) : (
          <Text style={styles.emptyText}>No rivalry data is available yet.</Text>
        );
      case "line_chart":
      case "line":
      case "multi_line_chart":
      case "multi-line-chart":
      case "multi-line":
        return (
          <LineChart
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            statKey={localChartData.metricKey}
            scopedPlayerIds={localChartData.scopedPlayerIds}
            mode={routeLineMode}
            showModeSelector={false}
            showHeader={false}
          />
        );
      case "prestige_over_time":
        return (
          <PrestigeOverTimeChart
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            selectedPlayerIds={localChartData.scopedPlayerIds}
          />
        );
      case "stacked_bar_chart":
        return (
          <StackedBarChart
            data={localChartData.stackedRows as any}
            players={localChartData.chartPlayers as any}
            emptyText="No stacked chart data available yet."
            showCategorySelector={false}
            showHeader={false}
          />
        );
      case "bar_chart":
      case "bar":
        return (
          <BarChart
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            statKey={localChartData.metricKey}
            scopedPlayerIds={localChartData.scopedPlayerIds}
            showHeader={false}
          />
        );
      case "heatmap":
        return (
          <Heatmap
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            statKey={localChartData.metricKey}
            scopedPlayerIds={localChartData.scopedPlayerIds}
            showHeader={false}
          />
        );
      case "elo":
        return (
          <EloChart
            games={localChartData.scopedGames as any}
            players={localChartData.chartPlayers as any}
            primaryPlayerId={localChartData.selectedPlayer?.id ?? null}
            showHeader={false}
          />
        );
      case "efficiency_failure_scatter":
        return (
          <EfficiencyFailureScatter
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            scopedPlayerIds={localChartData.scopedPlayerIds}
          />
        );
      case "bump_chart":
        return (
          <BumpChart
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            statKey={localChartData.metricKey}
            scopedPlayerIds={localChartData.scopedPlayerIds}
            showHeader={false}
          />
        );
      case "consistency_band":
        return (
          <ConsistencyBandChart
            data={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            statKey={localChartData.metricKey}
            scopedPlayerIds={localChartData.scopedPlayerIds}
            showHeader={false}
          />
        );
      case "replay_chart":
        return (
          <ReplayChart
            replay={localChartData.snapshots as any}
            players={localChartData.chartPlayers as any}
            statKey={localChartData.metricKey as any}
            title="Replay Chart"
            showHeader={false}
          />
        );
      default:
        return null;
    }
  }

  function renderServerRelationshipGraph() {
    if (!hasRenderableServerChart || chartKey !== "relationship_graph") {
      return null;
    }

    return (
      <RelationshipGraph
        players={serverRelationshipPlayers as any}
        relationships={serverRelationshipEdges as any}
        scopedPlayerIds={routeIds.length ? routeIds : undefined}
        variant="assist_network"
        mode={routeMode}
        title="Assist Network"
        subtitle="Directed assist flow across the published Supabase analytics dataset."
        showHeader={false}
        showReadoutCards={false}
      />
    );
  }

  function renderServerChart() {
    switch (chartKey) {
      case "relationship_graph":
        return renderServerRelationshipGraph();
      case "radar":
        if (!serverPrimaryRadar) {
          return null;
        }
        return (
          <RadarChart
            primary={serverPrimaryRadar as any}
            comparison={serverComparisonRadar ? (serverComparisonRadar as any) : undefined}
            primaryLabel={serverFocusPlayer?.name ?? "Player"}
            comparisonLabel={serverComparePlayer?.name ?? "Comparison"}
            title="Player Radar"
            showHeader={false}
          />
        );
      case "sparkline":
        if (!serverChartData.length && !serverComparisonData.length) {
          return null;
        }
        return (
          <Sparkline
            data={serverChartData as any}
            comparisonData={serverComparisonData as any}
            defaultMetricKey={serverMetricKey}
            primaryLabel={toStringValue(
              datasetData.primaryLabel,
              serverFocusPlayer?.name ?? "Player",
            )}
            comparisonLabel={toStringValue(
              datasetData.comparisonLabel,
              serverComparePlayer?.name ?? "Comparison",
            )}
            showHowItWorks={false}
          />
        );
      case "head_to_head":
        if (
          serverChartPlayers.length < 2 ||
          (!serverChartData.length && !serverChartGames.length)
        ) {
          return null;
        }
        return (
          <HeadToHeadChart
            data={serverChartData as any}
            games={serverChartGames as any}
            players={serverChartPlayers as any}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
            playerId={serverFocusPlayerId}
            compareId={serverComparePlayerId}
            showHeader={false}
          />
        );
      case "rivalry_graph":
        if (
          !serverFocusPlayerId ||
          !serverChartGames.length ||
          !serverChartPlayers.length
        ) {
          return null;
        }
        return (
          <RivalryGraph
            playerId={serverFocusPlayerId}
            games={serverChartGames as any}
            players={serverChartPlayers as any}
          />
        );
      case "line_chart":
      case "line":
      case "multi_line_chart":
      case "multi-line-chart":
      case "multi-line":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <LineChart
            data={serverChartData as any}
            players={serverChartPlayers as any}
            statKey={serverMetricKey}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
            selectedPlayerIds={serverSelectedIds.length ? serverSelectedIds : undefined}
            mode={serverLineMode as any}
            showModeSelector={false}
            showHeader={false}
          />
        );
      case "prestige_over_time":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <PrestigeOverTimeChart
            data={serverChartData as any}
            players={serverChartPlayers as any}
            selectedPlayerIds={serverSelectedIds.length ? serverSelectedIds : undefined}
          />
        );
      case "stacked_bar_chart":
        if (
          !serverChartData.length &&
          Object.keys(serverMetricDataMap).length === 0
        ) {
          return null;
        }
        return (
          <StackedBarChart
            data={serverChartData as any}
            players={serverChartPlayers as any}
            metricDataMap={serverMetricDataMap as any}
            metricOptions={serverMetricOptions as any}
            activeMetricKey={serverActiveMetricKey}
            selectedPlayerIds={serverSelectedIds.length ? serverSelectedIds : undefined}
            showMetricSelector={false}
            showCategorySelector={false}
            showHeader={false}
          />
        );
      case "bar_chart":
      case "bar":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <BarChart
            data={serverChartData as any}
            players={serverChartPlayers as any}
            statKey={serverMetricKey}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
            showHeader={false}
          />
        );
      case "heatmap":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <Heatmap
            data={serverChartData as any}
            players={serverChartPlayers as any}
            statKey={serverMetricKey}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
            showHeader={false}
          />
        );
      case "elo":
        if (!serverChartGames.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <EloChart
            games={serverChartGames as any}
            players={serverChartPlayers as any}
            primaryPlayerId={serverFocusPlayerId}
            showHeader={false}
          />
        );
      case "efficiency_failure_scatter":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <EfficiencyFailureScatter
            data={serverChartData as any}
            players={serverChartPlayers as any}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
          />
        );
      case "bump_chart":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <BumpChart
            data={serverChartData as any}
            players={serverChartPlayers as any}
            statKey={serverMetricKey}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
            selectedPlayerIds={serverSelectedIds.length ? serverSelectedIds : undefined}
            showHeader={false}
          />
        );
      case "consistency_band":
        if (!serverChartData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <ConsistencyBandChart
            data={serverChartData as any}
            players={serverChartPlayers as any}
            statKey={serverMetricKey}
            scopedPlayerIds={serverScopeIds.length ? serverScopeIds : undefined}
            selectedPlayerIds={serverSelectedIds.length ? serverSelectedIds : undefined}
            showHeader={false}
          />
        );
      case "replay_chart":
        if (!serverReplayData.length || !serverChartPlayers.length) {
          return null;
        }
        return (
          <ReplayChart
            replay={serverReplayData as any}
            players={serverChartPlayers as any}
            statKey={serverMetricKey as any}
            title="Replay Chart"
            showHeader={false}
          />
        );
      default:
        return null;
    }
  }

  function openChartSetup() {
    if (!setupChartKey) return;

    router.push({
      pathname: APP_ROUTES.charts,
      params: {
        ...buildRouteParams({
          chartKey: setupChartKey,
          playerId: routePlayerId ?? null,
          compareId: routeCompareId ?? null,
          selectedGameId: routeSelectedGameId ?? null,
          ids: routeIds,
          metric: routeMetric ?? null,
          mode: routeMode,
          lineMode: isLineModeDriven(chartKey) ? routeLineMode : null,
        }),
        setup: "true",
      },
    } as any);
  }

  function openCommandPage() {
    router.push(APP_ROUTES.home);
  }

  function renderDataset() {
    if (shouldUseLocalChartFallback) {
      const localChart = renderLocalChartFallback();
      if (localChart) {
        return (
          <ChartSurface
            eyebrow={provenance.label}
            title="Showing Supabase game history"
            subtitle={provenance.caption}
          >
            <AnalyticsRecoveryCard
              title="Showing Supabase game history"
              body={
                error
                  ? "The published chart dataset is unavailable right now, so this view is using Supabase game history directly."
                  : "The published chart dataset has no rows yet, so this view is using Supabase game history directly."
              }
              tone="warning"
              sourceKind="supabase-fallback"
              sourceLabel="Supabase fallback"
              primaryAction={
                canAdjustChartFromHub(chartKey)
                  ? {
                      label: "Adjust setup",
                      onPress: openChartSetup,
                    }
                  : null
              }
              secondaryAction={{
                label: "Command",
                onPress: openCommandPage,
                variant: "secondary",
              }}
            />
            {summaryChips.length ? (
              <View style={styles.surfaceChipRow}>
                {summaryChips.map((chip) => (
                  <ChartMetricChip key={chip} label={chip} />
                ))}
              </View>
            ) : null}
            <ChartInsightStrip label="Source" value={provenance.label} />
            {localChart}
          </ChartSurface>
        );
      }
    }

    const serverChart = renderServerChart();
    if (serverChart) {
      return (
        <ChartSurface
          eyebrow={provenance.label}
          title={toStringValue(dataset?.title, resolveChartTitle(chartKey))}
          subtitle={provenance.caption}
        >
          {summaryChips.length ? (
            <View style={styles.surfaceChipRow}>
              {summaryChips.map((chip) => (
                <ChartMetricChip key={chip} label={chip} />
              ))}
            </View>
          ) : null}
          <ChartInsightStrip label="Source" value={provenance.label} />
          {serverChart}
        </ChartSurface>
      );
    }

    if (loading) {
      return <Text style={styles.emptyText}>Loading Supabase-authored chart dataset.</Text>;
    }

    if (error) {
      return <Text style={styles.emptyText}>{error}</Text>;
    }

    if (cloudFallbackLoading && !hasData) {
      return <Text style={styles.emptyText}>Loading Supabase game history.</Text>;
    }

    if (!hasData) {
      return (
        <AnalyticsRecoveryCard
          title={toStringValue(emptyState.title, "No chart data yet")}
          body={toStringValue(
            emptyState.subtitle,
            toStringValue(
              emptyState.description,
              "Supabase has not published any data for this chart yet.",
            ),
          )}
          tone="info"
          sourceKind="server"
          sourceLabel="Server data"
          primaryAction={
            canAdjustChartFromHub(chartKey)
              ? {
                  label: "Adjust setup",
                  onPress: openChartSetup,
                }
              : null
          }
          secondaryAction={{
            label: "Command",
            onPress: openCommandPage,
            variant: "secondary",
          }}
        />
      );
    }

    return (
      <ChartSurface
        eyebrow={provenance.label}
        title="Dataset summary"
        subtitle={provenance.caption}
      >
        <View style={styles.datasetSummaryRow}>
          <DatasetStat label="Points" value={pointCount} />
          <DatasetStat label="Series" value={datasetSeries.length} />
          <DatasetStat
            label="Generated"
            value={toStringValue(dataset?.generatedAt, "now").slice(0, 16) || "now"}
          />
        </View>

        {summaryChips.length ? (
          <View style={styles.surfaceChipRow}>
            {summaryChips.map((chip) => (
              <ChartMetricChip key={chip} label={chip} />
            ))}
          </View>
        ) : null}

        <View style={styles.datasetInsightStack}>
          <ChartInsightStrip label="Source" value={provenance.label} />
          <ChartInsightStrip
            label="Refresh state"
            value={isStale ? "Stale" : "Live"}
          />
        </View>

        {datasetSeries.length > 0 ? (
          <View style={styles.seriesList}>
            {datasetSeries.map((series, index) => {
              const seriesPoints = toArray(series.points);
              return (
                <View
                  key={toStringValue(series.key, `series-${index}`)}
                  style={styles.seriesCard}
                >
                  <Text style={styles.seriesTitle}>
                    {toStringValue(series.label, `Series ${index + 1}`)}
                  </Text>
                  <Text style={styles.seriesMeta}>
                    {seriesPoints.length} points
                  </Text>
                  {seriesPoints.length > 0 ? (
                    <View style={styles.pointList}>
                      {seriesPoints.slice(0, 5).map((point, pointIndex) => (
                        <Text
                          key={`${toStringValue(series.key, `series-${index}`)}-${pointIndex}`}
                          style={styles.pointText}
                        >
                          {toStringValue(point.label, `Point ${pointIndex + 1}`)} • {toDisplayValue(point.y, "0")}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.seriesCard}>
            <Text style={styles.seriesTitle}>Server dataset</Text>
            <Text style={styles.seriesMeta}>
              {datasetPoints.length} points returned
            </Text>
            <View style={styles.pointList}>
              {datasetPoints.slice(0, 8).map((point, index) => (
                <Text key={`point-${index}`} style={styles.pointText}>
                  {toStringValue(point.label, `Point ${index + 1}`)} • {toDisplayValue(point.y, "0")}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ChartSurface>
    );
  }

  return (
    <PageShell preset="analytics" contentContainerStyle={styles.pageContent}>
      <HeroCard
        eyebrow="Charts"
        title={toStringValue(dataset?.title, resolveChartTitle(chartKey))}
        size="compact"
        style={styles.heroCard}
      >
        <Text style={styles.heroSubtitle} numberOfLines={2}>
          {heroSubtitle}
        </Text>
        {setupChartKey ? (
          <View style={styles.heroActionRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
              onPress={openChartSetup}
            >
              <Text style={styles.primaryButtonText}>Back to Adjust</Text>
            </Pressable>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={openCommandPage}
            >
              <Text style={styles.secondaryButtonText}>Command</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </HeroCard>

      <SectionCard style={styles.chartSection}>
        {renderDataset()}
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    gap: 8,
    paddingBottom: 18,
  },
  heroCard: {
    borderRadius: 20,
  },
  heroSubtitle: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  heroActionRow: {
    flexDirection: "row",
    gap: 6,
  },
  chartSection: {
    padding: 10,
    gap: 4,
    borderRadius: 18,
  },
  compareBlock: {
    gap: 6,
  },
  compareTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  primaryButton: {
    alignSelf: "flex-start",
    borderRadius: CHART_LAYOUT.chipRadius,
    borderWidth: 1,
    borderColor: `${CHART_COLORS.accent}55`,
    backgroundColor: CHART_COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  primaryButtonText: {
    color: CHART_COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: CHART_LAYOUT.chipRadius,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.whiteSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  datasetStack: {
    gap: 10,
  },
  surfaceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  datasetInsightStack: {
    gap: 0,
  },
  sparklineFallback: {
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    padding: 12,
    alignItems: "center",
  },
  sparklineTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    fontWeight: "900",
    alignSelf: "flex-start",
  },
  datasetSummaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  datasetStat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  datasetStatLabel: {
    color: CHART_COLORS.sub,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  datasetStatValue: {
    color: CHART_COLORS.textStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  datasetChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  datasetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.whiteSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  datasetChipText: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
  },
  seriesList: {
    gap: 8,
  },
  seriesCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    padding: 10,
    gap: 6,
  },
  seriesTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  seriesMeta: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pointList: {
    gap: 4,
  },
  pointText: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    lineHeight: 16,
  },
});
