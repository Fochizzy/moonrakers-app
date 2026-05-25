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
import BarChart from "@/components/charts/BarChart";
import BumpChart from "@/components/charts/BumpChart";
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
import Sparkline from "@/components/charts/Sparkline";
import StackedBarChart from "@/components/charts/StackedBarChart";
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { getChartDataset } from "@/lib/cloud/analytics/getChartDataset";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES } from "@/utils/appRoutes";
import { buildLocalChartDetailState } from "@/utils/chartDetailLocalData";

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

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toDisplayValue(value: unknown, fallback = "0") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
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
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const authSession = useStore((state: any) => state.authSession);
  const rawPlayers = useStore((state: any) => state.players);
  const rawGames = useStore((state: any) => state.games);
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
  const storePlayers = Array.isArray(rawPlayers) ? rawPlayers : [];
  const storeGames = Array.isArray(rawGames) ? rawGames : [];
  const storeChartData = useMemo(
    () =>
      buildLocalChartDetailState({
        chartKey,
        players: storePlayers,
        games: storeGames,
        routePlayerId: routePlayerId ?? null,
        routeCompareId: routeCompareId ?? null,
        routeSelectedGameId: routeSelectedGameId ?? null,
        routeIds,
        routeMetric: routeMetric ?? null,
      }),
    [
      chartKey,
      storeGames,
      storePlayers,
      routeCompareId,
      routeIdsKey,
      routeMetric,
      routePlayerId,
      routeSelectedGameId,
    ],
  );
  const [dataset, setDataset] = useState<PayloadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloudFallbackSnapshot, setCloudFallbackSnapshot] =
    useState<CloudFallbackSnapshot | null>(null);
  const [cloudFallbackLoading, setCloudFallbackLoading] = useState(false);
  const [cloudFallbackAttempted, setCloudFallbackAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!profileId) {
        if (!cancelled) {
          setDataset(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextDataset = await getChartDataset({
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
        });

        if (!cancelled) {
          setDataset(toRecord(nextDataset));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(formatSupabaseConfigError(nextError) || "Failed to load chart.");
          setDataset(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    authSession?.user?.id,
    analyticsRefreshTick,
    chartKey,
    routeCompareId,
    routeIdsKey,
    routeLineMode,
    routeMetric,
    routeMode,
    routeOpponentId,
    routePlayerId,
    routeSelectedGameId,
  ]);

  useEffect(() => {
    setCloudFallbackSnapshot(null);
    setCloudFallbackLoading(false);
    setCloudFallbackAttempted(false);
  }, [profileId]);

  const datasetData = toRecord(dataset?.data);
  const datasetMeta = toRecord(datasetData.meta);
  const datasetPoints = toArray(datasetData.points);
  const datasetSeries = toArray(datasetData.series);
  const emptyState = toRecord(dataset?.emptyState);
  const summaryChips = [
    routeMetric ? `Metric: ${routeMetric}` : null,
    routeLineMode && isLineModeDriven(chartKey) ? `Mode: ${routeLineMode}` : null,
    routeMode === "network" ? "Graph: network" : null,
    routePlayerId ? `Focus: ${routePlayerId}` : null,
  ].filter(Boolean) as string[];
  const pointCount = toNumberValue(datasetMeta.pointCount, datasetPoints.length);
  const hasData = Boolean(datasetMeta.hasData) || pointCount > 0 || datasetSeries.length > 0;
  const cloudFallbackPlayers = cloudFallbackSnapshot?.players ?? [];
  const cloudFallbackGames = cloudFallbackSnapshot?.games ?? [];
  const localFallbackPlayers = storeChartData.hasData
    ? storePlayers
    : cloudFallbackPlayers;
  const localFallbackGames = storeChartData.hasData
    ? storeGames
    : cloudFallbackGames;
  const localChartData = useMemo(
    () =>
      buildLocalChartDetailState({
        chartKey,
        players: localFallbackPlayers,
        games: localFallbackGames,
        routePlayerId: routePlayerId ?? null,
        routeCompareId: routeCompareId ?? null,
        routeSelectedGameId: routeSelectedGameId ?? null,
        routeIds,
        routeMetric: routeMetric ?? null,
      }),
    [
      chartKey,
      localFallbackGames,
      localFallbackPlayers,
      routeCompareId,
      routeIdsKey,
      routeMetric,
      routePlayerId,
      routeSelectedGameId,
    ],
  );
  const shouldUseLocalChartFallback =
    localChartData.hasData && !loading && (Boolean(error) || !hasData);
  const usingCloudFallbackData =
    shouldUseLocalChartFallback &&
    !storeChartData.hasData &&
    localChartData.hasData;
  const shouldLoadCloudFallback =
    Boolean(profileId) &&
    !storeChartData.hasData &&
    !cloudFallbackSnapshot &&
    !cloudFallbackAttempted &&
    !cloudFallbackLoading &&
    !loading &&
    (Boolean(error) || !hasData);
  const heroSubtitle = shouldUseLocalChartFallback
    ? usingCloudFallbackData
      ? "Published chart data is empty, so this view is using Supabase game history directly."
      : "Published chart data is unavailable, so this view is using saved history on this device."
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
      case "assist_network_overview":
        return (
          <AssistNetworkOverview
            games={localChartData.scopedGames as any}
            players={localChartData.chartPlayers as any}
            scopedPlayerIds={localChartData.scopedPlayerIds}
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
          <View style={styles.datasetStack}>
            <View style={styles.localFallbackCard}>
              <Text style={styles.localFallbackTitle}>
                {usingCloudFallbackData
                  ? "Showing Supabase game history"
                  : "Showing saved history data"}
              </Text>
              <Text style={styles.localFallbackText}>
                {error
                  ? usingCloudFallbackData
                    ? "The published chart dataset is unavailable right now, so this view is using Supabase game history directly."
                    : "The published chart dataset is unavailable right now, so this view is using the games saved on this device."
                  : usingCloudFallbackData
                    ? "The published chart dataset has no rows yet, so this view is using Supabase game history directly."
                    : "The published chart dataset has no rows yet, so this view is using the games saved on this device."}
              </Text>
            </View>
            {localChart}
          </View>
        );
      }
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
        <View style={styles.compareBlock}>
          <Text style={styles.compareTitle}>
            {toStringValue(emptyState.title, "No chart data yet")}
          </Text>
          <Text style={styles.emptyText}>
            {toStringValue(
              emptyState.subtitle,
              toStringValue(
                emptyState.description,
                "Supabase has not published any data for this chart yet.",
              ),
            )}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.datasetStack}>
        <View style={styles.datasetSummaryRow}>
          <DatasetStat label="Points" value={pointCount} />
          <DatasetStat label="Series" value={datasetSeries.length} />
          <DatasetStat
            label="Generated"
            value={toStringValue(dataset?.generatedAt, "now").slice(0, 16) || "now"}
          />
        </View>

        {summaryChips.length ? (
          <View style={styles.datasetChipRow}>
            {summaryChips.map((chip) => (
              <View key={chip} style={styles.datasetChip}>
                <Text style={styles.datasetChipText}>{chip}</Text>
              </View>
            ))}
          </View>
        ) : null}

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
                          {toStringValue(point.label, `Point ${pointIndex + 1}`)} • {toDisplayValue(point.y)}
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
                  {toStringValue(point.label, `Point ${index + 1}`)} • {toDisplayValue(point.y)}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>
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
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={openChartSetup}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Back to Adjust</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={openCommandPage}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Back to Command</Text>
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
  localFallbackCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  localFallbackTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    fontWeight: "900",
  },
  localFallbackText: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 15,
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
