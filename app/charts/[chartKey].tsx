import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import AssistNetworkOverview from "@/components/charts/AssistNetworkOverview";
import {
  CHART_COLORS,
  CHART_LAYOUT,
} from "@/components/charts/chartVisualSystem";
import { EloChart } from "@/components/charts/ELO/exports";
import RadarChart from "@/components/charts/RadarChart";
import BarChart from "@/components/charts/BarChart";
import Heatmap from "@/components/charts/Heatmap";
import LineChart, { type LineMode } from "@/components/charts/LineChart";
import BumpChart from "@/components/charts/BumpChart";
import ConsistencyBandChart from "@/components/charts/ConsistencyBandChart";
import EfficiencyFailureScatter from "@/components/charts/EfficiencyFailureScatter";
import ReplayChart from "@/components/charts/ReplayChart";
import RivalryGraph from "@/components/charts/RivalryGraph";
import HeadToHeadChart from "@/components/charts/HeadToHeadChart";
import StackedBarChart from "@/components/charts/StackedBarChart";
import Sparkline from "@/components/charts/Sparkline";
import {
  canAdjustChartFromHub,
  resolveChartCatalogEntry as resolveChartMetadata,
} from "@/components/charts/chartCatalog";

import { useStore } from "@/store/useStore";
import { resolveAllGamesToPlayers } from "@/utils/importedGameResolver";
import { getMetricOrFallback } from "@/utils/metricMap";
import { APP_ROUTES } from "@/utils/appRoutes";
import {
  buildReplaySnapshotsFromGame,
  buildMetricDataMap,
  buildRadarStatsForPlayer,
  buildRelationships,
  buildSparkSeries,
  buildStackedMetricOptions,
  buildUnifiedSnapshots,
  canonicalizeGames,
  collectUnifiedGames,
  getPlayerById,
  normalizeMetricForChart,
  normalizeReplayMetric,
  type FlexibleStore,
  type RadarStats,
  type SimpleMetricKey,
  type SnapshotPoint,
  type StackedRow,
  type StorePlayer,
} from "@/utils/charts";

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

export default function ChartKeyScreen() {
  const router = useRouter();
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
  }>();

  const store = useStore() as unknown as FlexibleStore;
  const chartKey = normalizeChartKey(params.chartKey);
  const routeMode = normalizeGraphMode(params.mode);
  const routeLineMode = normalizeLineMode(params.lineMode);
  const routePlayerId = getParam(params.playerId);
  const routeCompareId = getParam(params.compareId);
  const routeSelectedGameId =
    getParam(params.selectedGameId) ?? getParam(params.gameId);
  const routeIds = getParamList(params.ids);
  const routeMetric = useMemo(
    () =>
      (normalizeMetricForChart(chartKey, getParam(params.metric)) ??
        "totalPrestige") as SimpleMetricKey,
    [chartKey, params.metric]
  );
  const stackedRouteMetric = useMemo(
    () =>
      String(
        normalizeMetricForChart("stacked_bar_chart", getParam(params.metric)) ??
          "totalPrestige"
      ),
    [params.metric]
  );

  const rawGames = useMemo(() => collectUnifiedGames(store), [store]);

  const resolvedPlayers = useMemo<StorePlayer[]>(() => {
    if (!rawGames?.length) return [];
    const resolved = resolveAllGamesToPlayers(rawGames as any) as StorePlayer[];
    return [...resolved].sort((left, right) =>
      String(left?.name || "").localeCompare(String(right?.name || ""))
    );
  }, [rawGames]);

  const unifiedGames = useMemo(
    () => canonicalizeGames(rawGames, resolvedPlayers),
    [rawGames, resolvedPlayers]
  );

  const selectedReplayGame = useMemo(
    () =>
      routeSelectedGameId
        ? unifiedGames.find((game) => String(game.id) === String(routeSelectedGameId)) ??
          null
        : null,
    [routeSelectedGameId, unifiedGames]
  );

  const [selectedMetric, setSelectedMetric] = useState<SimpleMetricKey>(() => routeMetric);
  const [lineMode, setLineMode] = useState<LineMode>(routeLineMode);
  const [stackedMetricKey, setStackedMetricKey] = useState<string>(stackedRouteMetric);
  const setupChartKey = useMemo(() => resolveSetupChartKey(chartKey), [chartKey]);

  useEffect(() => {
    setSelectedMetric(routeMetric);
  }, [routeMetric]);

  useEffect(() => {
    setStackedMetricKey(stackedRouteMetric);
  }, [stackedRouteMetric]);

  useEffect(() => {
    setLineMode(routeLineMode);
  }, [routeLineMode]);

  const selectedPlayer = useMemo(
    () => getPlayerById(resolvedPlayers, routePlayerId) ?? resolvedPlayers[0] ?? null,
    [resolvedPlayers, routePlayerId]
  );

  const comparePlayer = useMemo(() => {
    if (routeCompareId) {
      return getPlayerById(resolvedPlayers, routeCompareId);
    }
    const others = resolvedPlayers.filter(
      (player) => String(player.id) !== String(selectedPlayer?.id)
    );
    return others[0] ?? null;
  }, [resolvedPlayers, routeCompareId, selectedPlayer]);

  const scopedPlayers = useMemo(() => {
    if (chartKey === "head_to_head") {
      const pair = resolvedPlayers.filter(
        (player) =>
          String(player.id) === String(selectedPlayer?.id) ||
          String(player.id) === String(comparePlayer?.id)
      );
      if (pair.length > 0) return pair;
    }

    if (routeIds.length > 0) {
      const matched = routeIds
        .map((id) => getPlayerById(resolvedPlayers, id))
        .filter(Boolean) as StorePlayer[];
      if (matched.length > 0) return matched;
    }

    if (selectedPlayer) {
      const ordered = [
        selectedPlayer,
        ...resolvedPlayers.filter((player) => String(player.id) !== String(selectedPlayer.id)),
      ];
      return ordered.slice(0, Math.min(4, ordered.length));
    }

    return resolvedPlayers.slice(0, Math.min(4, resolvedPlayers.length));
  }, [chartKey, comparePlayer, resolvedPlayers, routeIds, selectedPlayer]);

  const radarPrimary = useMemo<RadarStats | undefined>(
    () =>
      selectedPlayer
        ? buildRadarStatsForPlayer(selectedPlayer.id, unifiedGames)
        : undefined,
    [selectedPlayer, unifiedGames]
  );

  const radarComparison = useMemo<RadarStats | undefined>(
    () =>
      comparePlayer
        ? buildRadarStatsForPlayer(comparePlayer.id, unifiedGames)
        : undefined,
    [comparePlayer, unifiedGames]
  );

  const relationships = useMemo(
    () => buildRelationships(resolvedPlayers, unifiedGames),
    [resolvedPlayers, unifiedGames]
  );

  const unifiedSnapshots = useMemo<SnapshotPoint[]>(
    () => buildUnifiedSnapshots(unifiedGames, resolvedPlayers),
    [unifiedGames, resolvedPlayers]
  );

  const replaySnapshots = useMemo<SnapshotPoint[]>(
    () =>
      chartKey === "replay_chart" && selectedReplayGame
        ? buildReplaySnapshotsFromGame(selectedReplayGame)
        : unifiedSnapshots,
    [chartKey, selectedReplayGame, unifiedSnapshots]
  );

  const replayPlayers = useMemo(
    () =>
      chartKey === "replay_chart" && selectedReplayGame?.players?.length
        ? (selectedReplayGame.players as StorePlayer[])
        : scopedPlayers,
    [chartKey, scopedPlayers, selectedReplayGame]
  );

  const detailScopedPlayers =
    chartKey === "replay_chart" ? replayPlayers : scopedPlayers;
  const detailSnapshots =
    chartKey === "replay_chart" ? replaySnapshots : unifiedSnapshots;
  const detailGamesCount =
    chartKey === "replay_chart" && replaySnapshots.length
      ? replaySnapshots.length
      : unifiedGames.length;

  const scopedPlayerIds = scopedPlayers.map((player) => String(player.id));
  const replayMetric = normalizeReplayMetric(selectedMetric);

  const sparkPrimarySeries = useMemo(
    () => buildSparkSeries(unifiedSnapshots, selectedPlayer?.id, selectedMetric),
    [selectedMetric, selectedPlayer?.id, unifiedSnapshots]
  );

  const sparkComparisonSeries = useMemo(
    () => buildSparkSeries(unifiedSnapshots, comparePlayer?.id, selectedMetric),
    [comparePlayer?.id, selectedMetric, unifiedSnapshots]
  );

  const stackedMetricOptions = useMemo(() => buildStackedMetricOptions(), []);
  const stackedMetricDataMap = useMemo<Record<string, StackedRow[]>>(
    () => buildMetricDataMap(resolvedPlayers, unifiedGames),
    [resolvedPlayers, unifiedGames]
  );

  const stackedDefaultMetric = useMemo(() => {
    const candidate = String(getParam(params.metric) ?? "");
    if (candidate && stackedMetricOptions.some((metric) => metric.key === candidate)) {
      return candidate;
    }
    return "totalPrestige";
  }, [params.metric, stackedMetricOptions]);

  const stackedScopedRows = useMemo(() => {
    const metricRows =
      stackedMetricDataMap[stackedMetricKey] ??
      stackedMetricDataMap[stackedDefaultMetric] ??
      [];

    if (!scopedPlayerIds.length) return metricRows;

    const allowedIds = new Set(scopedPlayerIds.map(String));
    return metricRows.filter((row) => allowedIds.has(String(row.id)));
  }, [scopedPlayerIds, stackedDefaultMetric, stackedMetricDataMap, stackedMetricKey]);

  const hasData = unifiedGames.length > 0 && resolvedPlayers.length > 0;
  function openChartSetup() {
    if (!setupChartKey) return;

    const setupMetric =
      chartKey === "prestige_over_time"
        ? "totalPrestige"
        : chartKey === "stacked_bar_chart"
          ? stackedMetricKey
          : selectedMetric;

    router.replace({
      pathname: APP_ROUTES.charts,
      params: {
        ...buildRouteParams({
          chartKey: setupChartKey,
          playerId: selectedPlayer?.id ?? routePlayerId ?? null,
          compareId: comparePlayer?.id ?? routeCompareId ?? null,
          selectedGameId: routeSelectedGameId ?? null,
          ids: routeIds.length ? routeIds : scopedPlayerIds,
          metric: setupMetric,
          mode: routeMode,
          lineMode: isLineModeDriven(chartKey) ? lineMode : null,
        }),
        setup: "true",
      },
    } as any);
  }

  function renderChart() {
    switch (chartKey) {
      case "elo":
        return (
          <EloChart
            games={unifiedGames as any}
            players={resolvedPlayers as any}
            primaryPlayerId={selectedPlayer?.id ?? null}
            showHeader={false}
          />
        );
      case "radar":
        return selectedPlayer && radarPrimary ? (
          <RadarChart
            primary={radarPrimary as any}
            comparison={radarComparison as any}
            primaryLabel={selectedPlayer.name || "Primary"}
            comparisonLabel={comparePlayer?.name || "Comparison"}
            title="Player Radar"
            showHeader={false}
          />
        ) : (
          <Text style={styles.emptyText}>No radar data available yet.</Text>
        );
      case "relationship_graph":
        return (
          <AssistNetworkOverview
            games={unifiedGames as any}
            players={resolvedPlayers as any}
            scopedPlayerIds={routeIds.length ? routeIds : scopedPlayerIds}
            exactScopePlayerIds={routeIds.length >= 2 ? routeIds : undefined}
            mode={routeMode}
            title="Assist Network"
            subtitle="Directed assist flow across the filtered sample."
          />
        );
      case "multi_line_chart":
      case "multi-line-chart":
      case "multi-line":
        return scopedPlayers.length >= 2 ? (
          <LineChart
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            selectedPlayerIds={scopedPlayerIds}
            title={`${titleCase(selectedMetric)} Comparison Trend`}
            subtitle="Shared renderer across scoped players"
            mode={lineMode}
            onChangeMode={setLineMode}
            showModeSelector={false}
            showHeader={false}
          />
        ) : (
          <Text style={styles.emptyText}>Multi-Line Chart needs at least 2 players.</Text>
        );
      case "bar_chart":
      case "bar":
        return (
          <BarChart
            data={unifiedSnapshots as any}
            players={resolvedPlayers as any}
            statKey={selectedMetric}
            scopedPlayerIds={scopedPlayerIds}
            title={`${titleCase(selectedMetric)} Comparison`}
            subtitle="Unified player comparison across tracked games."
            maxPlayers={8}
            showHeader={false}
          />
        );
      case "bump_chart":
        return (
          <BumpChart
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            selectedPlayerIds={scopedPlayerIds}
            title={`${titleCase(selectedMetric)} Rank Movement`}
            subtitle="Who climbed and who slipped from game to game."
            showHeader={false}
          />
        );
      case "consistency_band":
        return (
          <ConsistencyBandChart
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            selectedPlayerIds={scopedPlayerIds}
            title={`${titleCase(selectedMetric)} Consistency`}
            subtitle="Median plus range for stable versus swingy players."
            showHeader={false}
          />
        );
      case "heatmap":
        return (
          <Heatmap
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            scopedPlayerIds={scopedPlayerIds}
            title={`${titleCase(selectedMetric)} Heatmap`}
            subtitle="Round and game intensity across scoped players."
            allowedModes={[
              "raw",
              "relativeToLobby",
              "relativeToPlayerAverage",
              "rank",
              "swing",
            ]}
            showHeader={false}
          />
        );
      case "efficiency_failure_scatter":
        return (
          <EfficiencyFailureScatter
            data={unifiedSnapshots as any}
            players={resolvedPlayers as any}
            scopedPlayerIds={scopedPlayerIds}
            title="Efficiency vs Failure"
            subtitle="Average efficiency versus failures across scoped players."
          />
        );
      case "line_chart":
      case "line":
        return (
          <LineChart
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            title={`${titleCase(selectedMetric)} Trend`}
            subtitle="Unified metric trend across tracked games."
            selectedPlayerIds={scopedPlayerIds}
            mode={lineMode}
            onChangeMode={setLineMode}
            showModeSelector={false}
            showHeader={false}
          />
        );
      case "replay_chart":
        return (
          <ReplayChart
            replay={replaySnapshots as any}
            players={replayPlayers as any}
            statKey={replayMetric as any}
            title={
              selectedReplayGame
                ? `${titleCase(replayMetric)} Replay`
                : `${titleCase(replayMetric)} Replay`
            }
            showHeader={false}
          />
        );
      case "prestige_over_time":
        return (
          <LineChart
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey="totalPrestige"
            title="Prestige Over Time"
            subtitle="Unified prestige trend across tracked games."
            selectedPlayerIds={scopedPlayerIds}
            mode={lineMode}
            onChangeMode={setLineMode}
            showModeSelector={false}
            showHeader={false}
          />
        );
      case "rivalry_graph":
        return selectedPlayer ? (
          <RivalryGraph
            playerId={selectedPlayer.id}
            games={unifiedGames as any}
            players={resolvedPlayers as any}
          />
        ) : (
          <Text style={styles.emptyText}>Rivalry Graph needs a selected player.</Text>
        );
      case "head_to_head":
        return selectedPlayer && comparePlayer ? (
          <HeadToHeadChart
            players={[selectedPlayer, comparePlayer] as any}
            games={unifiedGames as any}
            playerId={selectedPlayer.id}
            compareId={comparePlayer.id}
            title={`${selectedPlayer.name ?? "Player"} vs ${comparePlayer.name ?? "Player"}`}
            showHeader={false}
          />
        ) : (
          <Text style={styles.emptyText}>Head-to-head requires two players.</Text>
        );
      case "sparkline":
        return selectedPlayer ? (
          <Sparkline
            data={sparkPrimarySeries as any}
            comparisonData={
              sparkComparisonSeries.length ? (sparkComparisonSeries as any) : undefined
            }
            primaryLabel={selectedPlayer.name || "Primary"}
            comparisonLabel={comparePlayer?.name || "Comparison"}
            defaultMetricKey={selectedMetric}
            showMetricSelector={false}
            metricTitle="Metric"
            narrativeTitle={`${titleCase(selectedMetric)} Summary`}
            showSummary={false}
            showStatsRow={false}
            showNarrative={false}
          />
        ) : (
          <Text style={styles.emptyText}>Sparkline needs a selected player.</Text>
        );
      case "stacked_bar_chart":
        return (
          <StackedBarChart
            data={
              stackedMetricDataMap[stackedMetricKey] ??
              stackedMetricDataMap[stackedDefaultMetric] ??
              []
            }
            metricDataMap={stackedMetricDataMap}
            metricOptions={stackedMetricOptions}
            activeMetricKey={stackedMetricKey}
            onChangeMetric={setStackedMetricKey}
            defaultMetricKey={stackedDefaultMetric}
            players={resolvedPlayers as any}
            selectedPlayerIds={scopedPlayerIds}
            title={getMetricOrFallback(stackedMetricKey).label}
            subtitle={getMetricOrFallback(stackedMetricKey).description}
            emptyText="No stacked-bar data available yet."
            showMetricSelector={false}
            showPlayerSelector={false}
            showCategorySelector={false}
            playerMode="selected"
            maxRows={Math.max(8, resolvedPlayers.length)}
            showHeader={false}
          />
        );
      case "compare":
        return (
          <View style={styles.compareBlock}>
            <Text style={styles.compareTitle}>Compare</Text>
            <Text style={styles.emptyText}>
              This route preserves the existing compare workflow instead of duplicating it here.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push(APP_ROUTES.compare as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Open Compare</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return (
          <View style={styles.compareBlock}>
            <Text style={styles.compareTitle}>Unsupported chart key</Text>
            <Text style={styles.emptyText}>{chartKey}</Text>
          </View>
        );
    }
  }

  return (
    <PageShell preset="analytics" contentContainerStyle={styles.pageContent}>
      <HeroCard
        eyebrow="Charts"
        title={resolveChartTitle(chartKey)}
        size="compact"
        style={styles.heroCard}
      >
        <Text style={styles.heroSubtitle} numberOfLines={2}>
          {buildSubheading(chartKey)}
        </Text>
        {setupChartKey ? (
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={openChartSetup}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Back to Adjust</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </HeroCard>

      <SectionCard style={styles.chartSection}>
        {hasData ? (
          renderChart()
        ) : (
          <Text style={styles.emptyText}>
            Add or import games to populate the unified chart route.
          </Text>
        )}
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
});
