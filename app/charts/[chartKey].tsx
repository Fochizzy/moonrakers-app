import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import Text from "@/components/ui/Text";
import { EloChart } from "@/components/charts/ELO/exports";
import RadarChart from "@/components/charts/RadarChart";
import RelationshipGraph from "@/components/charts/RelationshipGraph";
import MultiLineChart from "@/components/charts/MultiLineChart";
import BarChart from "@/components/charts/BarChart";
import Heatmap from "@/components/charts/Heatmap";
import LineChart from "@/components/charts/LineChart";
import ReplayChart from "@/components/charts/ReplayChart";
import RivalryGraph from "@/components/charts/RivalryGraph";
import HeadToHeadChart from "@/components/charts/HeadToHeadChart";
import StackedBarChart from "@/components/charts/StackedBarChart";
import Sparkline from "@/components/charts/Sparkline";
import AssistNetworkOverview from "@/components/charts/AssistNetworkOverview";

import { useStore } from "@/store/useStore";
import { resolveAllGamesToPlayers } from "@/utils/importedGameResolver";
import { getMetricOrFallback } from "@/utils/metricMap";
import {
  METRIC_OPTIONS,
  buildMetricDataMap,
  buildRadarStatsForPlayer,
  buildRelationships,
  buildSparkSeries,
  buildStackedMetricOptions,
  buildUnifiedSnapshots,
  canonicalizeGames,
  collectUnifiedGames,
  getPlayerById,
  normalizeReplayMetric,
  type FlexibleStore,
  type RadarStats,
  type SimpleMetricKey,
  type SnapshotPoint,
  type StackedRow,
  type StorePlayer,
} from "@/utils/charts";

const COLORS = {
  bg: "#081120",
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

type ViewTab = "Overview" | "Focus" | "Launch";

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getParamList(value?: string | string[]) {
  const raw = getParam(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeChartKey(value?: string | string[]) {
  return String(getParam(value) ?? "radar").trim().toLowerCase();
}

function normalizeMetricKey(value?: string | string[]): SimpleMetricKey {
  const raw = String(getParam(value) ?? "totalPrestige").trim();
  return METRIC_OPTIONS.includes(raw as SimpleMetricKey)
    ? (raw as SimpleMetricKey)
    : "totalPrestige";
}

function normalizeGraphMode(value?: string | string[]) {
  const raw = String(getParam(value) ?? "").trim().toLowerCase();
  return raw === "network" ? "network" : "flow";
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
  switch (chartKey) {
    case "radar":
      return "Trait-style player profile using unified live and imported history.";
    case "relationship_graph":
    case "relationship-graph":
    case "assist_network_overview":
      return "Support flow and relationship network across unified games.";
    case "multi_line_chart":
    case "multi-line-chart":
    case "multi-line":
      return "Trend comparison across unified live and imported history.";
    case "bar_chart":
    case "bar":
      return "Compact comparison bars across many different player metrics.";
    case "heatmap":
      return "Round and game intensity view for the selected metric.";
    case "line_chart":
    case "line":
      return "Metric trend line across unified game history.";
    case "replay_chart":
      return "Replay progression from unified snapshot history.";
    case "prestige_over_time":
      return "Prestige trend view through the shared route pipeline.";
    case "rivalry_graph":
      return "Head-to-head rivalry centered on the selected player.";
    case "head_to_head":
      return "Direct two-player matchup across shared games.";
    case "stacked_bar_chart":
      return "Metric composition view across scoped players.";
    case "sparkline":
      return "Selected-player micro-trend for the active metric.";
    case "compare":
      return "Direct comparison workflow.";
    default:
      return "Unified chart route.";
  }
}

function toneStyles(tone?: "accent" | "blue" | "green" | "blue") {
  switch (tone) {
    case "accent":
      return { bg: COLORS.accentSoft, value: COLORS.accent };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "green":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    default:
      return { bg: COLORS.whiteSoft, value: COLORS.text };
  }
}

function buildRouteParams(args: {
  chartKey: string;
  playerId?: string | null;
  compareId?: string | null;
  ids?: string[];
  metric?: string | null;
  mode?: string | null;
}) {
  const { chartKey, playerId, compareId, ids, metric, mode } = args;
  return {
    chartKey,
    ...(playerId ? { playerId } : {}),
    ...(compareId ? { compareId } : {}),
    ...(ids && ids.length ? { ids: ids.join(",") } : {}),
    ...(metric ? { metric } : {}),
    ...(mode ? { mode } : {}),
  };
}

function isMetricDriven(chartKey: string) {
  return (
    chartKey === "bar_chart" ||
    chartKey === "bar" ||
    chartKey === "heatmap" ||
    chartKey === "line_chart" ||
    chartKey === "line" ||
    chartKey === "replay_chart" ||
    chartKey === "sparkline" ||
    chartKey === "multi_line_chart" ||
    chartKey === "multi-line-chart" ||
    chartKey === "multi-line"
  );
}

export default function ChartKeyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    chartKey?: string | string[];
    playerId?: string | string[];
    compareId?: string | string[];
    ids?: string | string[];
    metric?: string | string[];
    mode?: string | string[];
  }>();

  const store = useStore() as unknown as FlexibleStore;
  const chartKey = normalizeChartKey(params.chartKey);
  const routeMetric = normalizeMetricKey(params.metric);
  const routeMode = normalizeGraphMode(params.mode);
  const routePlayerId = getParam(params.playerId);
  const routeCompareId = getParam(params.compareId);
  const routeIds = getParamList(params.ids);

  const rawGames = useMemo(() => collectUnifiedGames(store), [store]);

  const resolvedPlayers = useMemo<StorePlayer[]>(() => {
    if (!rawGames?.length) return [];
    const resolved = resolveAllGamesToPlayers(rawGames as any) as StorePlayer[];
    return [...resolved].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [rawGames]);

  const unifiedGames = useMemo(
    () => canonicalizeGames(rawGames, resolvedPlayers),
    [rawGames, resolvedPlayers]
  );

  const [activeTab, setActiveTab] = useState<ViewTab>("Overview");
  const [selectedMetric, setSelectedMetric] =
    useState<SimpleMetricKey>(routeMetric);
  const [stackedMetricKey, setStackedMetricKey] = useState<string>(
    String(getParam(params.metric) ?? "totalPrestige")
  );

  const selectedPlayer = useMemo(
    () =>
      getPlayerById(resolvedPlayers, routePlayerId) ??
      resolvedPlayers[0] ??
      null,
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
      const base = [
        selectedPlayer,
        ...resolvedPlayers.filter(
          (player) => String(player.id) !== String(selectedPlayer.id)
        ),
      ];
      return base.slice(0, Math.min(4, base.length));
    }

    return resolvedPlayers.slice(0, Math.min(4, resolvedPlayers.length));
  }, [chartKey, resolvedPlayers, routeIds, selectedPlayer, comparePlayer]);

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

  const selectedPlayerIds = scopedPlayers.map((player) => String(player.id));
  const replayMetric = normalizeReplayMetric(selectedMetric);

  const sparkPrimarySeries = useMemo(
    () => buildSparkSeries(unifiedSnapshots, selectedPlayer?.id, selectedMetric),
    [unifiedSnapshots, selectedPlayer?.id, selectedMetric]
  );

  const sparkComparisonSeries = useMemo(
    () => buildSparkSeries(unifiedSnapshots, comparePlayer?.id, selectedMetric),
    [unifiedSnapshots, comparePlayer?.id, selectedMetric]
  );

  const stackedMetricOptions = useMemo(() => buildStackedMetricOptions(), []);
  const stackedMetricDataMap = useMemo<Record<string, StackedRow[]>>(
    () => buildMetricDataMap(resolvedPlayers, unifiedGames),
    [resolvedPlayers, unifiedGames]
  );

  const stackedDefaultMetric = useMemo(() => {
    const candidate = String(getParam(params.metric) ?? "");
    if (
      candidate &&
      stackedMetricOptions.some((metric) => metric.key === candidate)
    ) {
      return candidate;
    }
    return "totalPrestige";
  }, [params.metric, stackedMetricOptions]);

  const hasData = unifiedGames.length > 0 && resolvedPlayers.length > 0;

  const headerStats = useMemo(() => {
    const focusGames = selectedPlayer
      ? unifiedGames.filter((game) => game?.totals?.[selectedPlayer.id])
      : [];

    return [
      { label: "Games", value: String(unifiedGames.length), tone: "blue" as const },
      {
        label: "Players",
        value: String(resolvedPlayers.length),
        tone: "accent" as const,
      },
      {
        label: "Scope",
        value: String(scopedPlayers.length),
        tone: "green" as const,
      },
      {
        label: "Metric",
        value: titleCase(selectedMetric),
        tone: "blue" as const,
      },
      ...(focusGames.length || selectedPlayer
        ? [
            {
              label: "Focus Games",
              value: String(focusGames.length),
              tone: "green" as const,
            },
          ]
        : []),
    ];
  }, [
    resolvedPlayers.length,
    scopedPlayers.length,
    selectedMetric,
    selectedPlayer,
    unifiedGames,
  ]);

  function replaceRoute(next: {
    playerId?: string | null;
    compareId?: string | null;
    ids?: string[];
    metric?: string | null;
    mode?: string | null;
  }) {
    router.replace({
      pathname: "/charts/[chartKey]",
      params: buildRouteParams({
        chartKey,
        playerId: next.playerId ?? routePlayerId ?? null,
        compareId:
          next.compareId !== undefined ? next.compareId : routeCompareId ?? null,
        ids: next.ids ?? routeIds,
        metric: next.metric ?? selectedMetric,
        mode:
          chartKey === "relationship_graph" ||
          chartKey === "relationship-graph" ||
          chartKey === "assist_network_overview"
            ? next.mode ?? routeMode
            : null,
      }),
    });
  }

  function renderChart() {
    switch (chartKey) {
      case "elo":
        return (
          <EloChart
            games={unifiedGames as any}
            players={resolvedPlayers as any}
            primaryPlayerId={selectedPlayer?.id ?? null}
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
          />
        ) : (
          <Text style={styles.emptyText}>No radar data available yet.</Text>
        );

      case "relationship_graph":
      case "relationship-graph":
        return scopedPlayers.length >= 2 ? (
          <RelationshipGraph
            players={scopedPlayers as any}
            relationships={relationships as any}
            maxItems={20}
            initialView={routeMode}
            title="Relationship Graph"
            subtitle="Directed assist flow across unified games."
          />
        ) : (
          <Text style={styles.emptyText}>
            Relationship Graph needs at least 2 players.
          </Text>
        );

      case "multi_line_chart":
      case "multi-line-chart":
      case "multi-line":
        return scopedPlayers.length >= 2 ? (
          <MultiLineChart
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            scopedPlayerIds={selectedPlayerIds}
            title={`${titleCase(selectedMetric)} Over Time`}
            subtitle="Unified live and imported history"
          />
        ) : (
          <Text style={styles.emptyText}>
            Multi-Line Chart needs at least 2 players.
          </Text>
        );

      case "bar_chart":
      case "bar":
        return (
          <BarChart
            data={unifiedSnapshots as any}
            players={resolvedPlayers as any}
            statKey={selectedMetric}
            scopedPlayerIds={selectedPlayerIds}
            title={`${titleCase(selectedMetric)} Comparison`}
            subtitle="Unified player comparison across tracked games."
            maxPlayers={8}
          />
        );

      case "heatmap":
        return (
          <Heatmap
            data={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={selectedMetric}
            scopedPlayerIds={selectedPlayerIds}
            title={`${titleCase(selectedMetric)} Heatmap`}
            subtitle="Round and game intensity across scoped players."
            allowedModes={[
              "raw",
              "relativeToLobby",
              "relativeToPlayerAverage",
              "rank",
              "swing",
            ]}
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
            selectedPlayerIds={selectedPlayerIds}
          />
        );

      case "replay_chart":
        return (
          <ReplayChart
            replay={unifiedSnapshots as any}
            players={scopedPlayers as any}
            statKey={replayMetric}
            title={`${titleCase(replayMetric)} Replay`}
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
            selectedPlayerIds={selectedPlayerIds}
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
          <Text style={styles.emptyText}>
            Rivalry Graph needs a selected player.
          </Text>
        );

      case "head_to_head":
        return selectedPlayer && comparePlayer ? (
          <HeadToHeadChart
            players={[selectedPlayer, comparePlayer] as any}
            games={unifiedGames as any}
            playerId={selectedPlayer.id}
            compareId={comparePlayer.id}
            title={`${selectedPlayer.name ?? "Player"} vs ${
              comparePlayer.name ?? "Player"
            }`}
          />
        ) : (
          <Text style={styles.emptyText}>
            Head-to-head requires two players.
          </Text>
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
          />
        ) : (
          <Text style={styles.emptyText}>Sparkline needs a selected player.</Text>
        );

      case "assist_network_overview":
        return (
          <AssistNetworkOverview
            relationships={relationships as any}
            players={scopedPlayers as any}
            title="Assist Network"
            subtitle="Unified assist flow across tracked games."
          />
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
            selectedPlayerIds={selectedPlayerIds}
            title={getMetricOrFallback(stackedMetricKey).label}
            subtitle={getMetricOrFallback(stackedMetricKey).description}
            emptyText="No stacked-bar data available yet."
            showMetricSelector
            showPlayerSelector
            showCategorySelector
            playerMode="selected"
            maxRows={Math.max(8, resolvedPlayers.length)}
          />
        );

      case "compare":
        return (
          <View style={styles.sectionCompact}>
            <Text style={styles.emptyTitle}>Compare</Text>
            <Text style={styles.emptyText}>
              This route preserves the existing compare workflow instead of
              duplicating it here.
            </Text>
            <TouchableOpacity
              style={styles.launchButton}
              onPress={() => router.push("/charts/compare" as any)}
              activeOpacity={0.9}
            >
              <Text style={styles.launchButtonText}>Open Compare</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Unsupported chart key</Text>
            <Text style={styles.emptyText}>{chartKey}</Text>
          </View>
        );
    }
  }

  const launchRows = [
    { key: "elo", label: "ELO" },
    { key: "radar", label: "Radar" },
    { key: "relationship_graph", label: "Relationship Graph" },
    { key: "multi_line_chart", label: "Multi-Line" },
    { key: "bar_chart", label: "Bar Chart" },
    { key: "heatmap", label: "Heatmap" },
    { key: "line_chart", label: "Line Chart" },
    { key: "replay_chart", label: "Replay Chart" },
    { key: "prestige_over_time", label: "Prestige Over Time" },
    { key: "rivalry_graph", label: "Rivalry Graph" },
    { key: "head_to_head", label: "Head-to-Head" },
    { key: "sparkline", label: "Sparkline" },
    { key: "stacked_bar_chart", label: "Stacked Bar" },
    { key: "assist_network_overview", label: "Assist Network" },
    { key: "compare", label: "Compare" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.title}>{titleCase(chartKey)}</Text>
          <Text style={styles.subtitle}>{buildSubheading(chartKey)}</Text>

          <View style={styles.statsRow}>
            {headerStats.slice(0, 4).map((item) => {
              const tone = toneStyles(item.tone);
              return (
                <View
                  key={item.label}
                  style={[styles.statCard, { backgroundColor: tone.bg }]}
                >
                  <Text style={[styles.statValue, { color: tone.value }]}>
                    {item.value}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.tabGrid}>
          {(["Overview", "Focus", "Launch"] as ViewTab[]).map((tab) => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.underlineMainTab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.underlineMainTabText,
                    active && styles.underlineMainTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
                <View
                  style={[
                    styles.underlineMainTabLine,
                    active && styles.underlineMainTabLineActive,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {!hasData ? (
          <View style={styles.sectionCompact}>
            <Text style={styles.emptyTitle}>No chart data yet</Text>
            <Text style={styles.emptyText}>
              Add or import games to populate the unified chart route.
            </Text>
          </View>
        ) : null}

        {hasData && activeTab === "Focus" ? (
          <View style={styles.sectionCompact}>
            <SectionHeader title="Players" sub="Set focus and comparison" />
            <View style={styles.underlineSelectorRow}>
              {resolvedPlayers.map((player) => (
                <UnderlineOption
                  key={`focus-${player.id}`}
                  label={player.name || "Unknown"}
                  active={String(player.id) === String(selectedPlayer?.id)}
                  onPress={() =>
                    replaceRoute({
                      playerId: player.id,
                      ids: routeIds.length ? routeIds : undefined,
                    })
                  }
                />
              ))}
            </View>

            {resolvedPlayers.length > 1 ? (
              <>
                <SectionHeader title="Compare" sub="Optional comparison" />
                <View style={styles.underlineSelectorRow}>
                  {resolvedPlayers
                    .filter((player) => String(player.id) !== String(selectedPlayer?.id))
                    .map((player) => (
                      <UnderlineOption
                        key={`compare-${player.id}`}
                        label={player.name || "Unknown"}
                        active={String(player.id) === String(comparePlayer?.id)}
                        onPress={() =>
                          replaceRoute({
                            compareId: player.id,
                          })
                        }
                      />
                    ))}
                </View>
              </>
            ) : null}

            {chartKey === "relationship_graph" ||
            chartKey === "relationship-graph" ||
            chartKey === "assist_network_overview" ? (
              <>
                <SectionHeader title="Graph Mode" sub="Flow or network view" />
                <View style={styles.underlineSelectorRow}>
                  {(["flow", "network"] as const).map((mode) => (
                    <UnderlineOption
                      key={mode}
                      label={titleCase(mode)}
                      active={routeMode === mode}
                      onPress={() =>
                        replaceRoute({
                          mode,
                        })
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}

            {isMetricDriven(chartKey) ? (
              <>
                <SectionHeader title="Metric" sub="Adjust metric view" />
                <View style={styles.underlineSelectorRow}>
                  {METRIC_OPTIONS.map((metric) => (
                    <UnderlineOption
                      key={metric}
                      label={titleCase(metric)}
                      active={metric === selectedMetric}
                      onPress={() => setSelectedMetric(metric)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {hasData && activeTab === "Overview" ? (
          <View style={styles.sectionCompact}>{renderChart()}</View>
        ) : null}

        {activeTab === "Launch" ? (
          <View style={styles.sectionCompact}>
            <SectionHeader title="Launch" sub="Jump to other chart routes" />
            <View style={styles.launchList}>
              {launchRows.map((row) => (
                <TouchableOpacity
                  key={row.key}
                  style={styles.launchCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/charts/[chartKey]",
                      params: buildRouteParams({
                        chartKey: row.key,
                        playerId: selectedPlayer?.id ?? null,
                        compareId: comparePlayer?.id ?? null,
                        ids: routeIds.length ? routeIds : selectedPlayerIds,
                        metric: selectedMetric,
                        mode:
                          row.key === "relationship_graph" ||
                          row.key === "assist_network_overview"
                            ? routeMode
                            : null,
                      }),
                    })
                  }
                >
                  <Text style={styles.launchTitle}>{row.label}</Text>
                  <Text style={styles.launchSub}>Open {row.label} route</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

function UnderlineOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.underlineTabButton}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
        {label}
      </Text>
      <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 36,
    gap: 10,
  },
  heroCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: COLORS.text,
    opacity: 0.84,
    fontSize: 11,
    marginTop: 3,
  },
  tabGrid: {
    flexDirection: "row",
    gap: 8,
  },
  underlineMainTab: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  underlineMainTabText: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  underlineMainTabTextActive: {
    color: COLORS.text,
  },
  underlineMainTabLine: {
    marginTop: 6,
    height: 2,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  sectionCompact: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
  },
  underlineTabButton: {
    paddingBottom: 2,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  emptyCard: {
    paddingVertical: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  launchList: {
    gap: 8,
  },
  launchCard: {
    borderRadius: 14,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  launchTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  launchSub: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 4,
  },
  launchButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  launchButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
});