import React, { useEffect, useMemo, useReducer, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import ScreenBackground from "@/components/ui/ScreenBackground";
import Text from "@/components/ui/Text";
import { useStore } from "@/store/useStore";

import CompareSelectionCard from "@/components/charts/compare/CompareSelectionCard";
import CompareTelemetryRow from "@/components/charts/compare/CompareTelemetryRow";
import CompareMatrixCard from "@/components/charts/compare/CompareMatrixCard";
import CompareInsightBar from "@/components/charts/compare/CompareInsightBar";
import CompareSummaryStrip from "@/components/charts/compare/CompareSummaryStrip";
import ConditionalComparisonCard from "@/components/charts/compare/ConditionalComparisonCard";
import MetricInfoModal from "@/components/charts/compare/MetricInfoModal";
import CompareFocusBar from "@/components/charts/compare/CompareFocusBar";

import { METRICS, METRIC_GROUPS } from "@/utils/compareMetrics";
import {
  buildConditionalAnalysis,
  conditionalReducer,
  initialConditionalState,
} from "@/utils/conditionalCompareHelpers";
import {
  buildGlobalTurnOrderInsight,
  buildGroupRows,
  buildPlayerRows,
  createMatrixLayout,
  getVisibleMetricEntries,
  sortRowsByMetric,
} from "@/utils/compareHelpers";
import {
  CompareMode,
  CompareStoreShape,
  DensityMode,
  Group,
  MetricDescriptor,
  Player,
  SortDirection,
  StoredGame,
} from "@/utils/compareTypes";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_COMPARE_PLAYERS = 5;

const COLORS = {
  bg: "#081120",
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
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

type FlexibleStore = CompareStoreShape & Record<string, unknown>;

type FocusGroup =
  | "outcomes"
  | "prestige"
  | "assists"
  | "objectives"
  | "efficiency"
  | "positioning";

type AffectTab = "conditional" | "cohesion";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function makeGameSignature(game: StoredGame): string {
  const anyGame = game as any;

  if (anyGame?.id) return `id:${String(anyGame.id)}`;
  if (anyGame?.gameId) return `gameId:${String(anyGame.gameId)}`;

  const startedAt =
    anyGame?.startedAt ??
    anyGame?.createdAt ??
    anyGame?.date ??
    anyGame?.timestamp ??
    "unknown-time";

  const players = Array.isArray(anyGame?.playerIds)
    ? anyGame.playerIds.join(",")
    : Array.isArray(anyGame?.players)
      ? anyGame.players
          .map((entry: any) => entry?.playerId ?? entry?.id ?? entry?.name ?? "unknown-player")
          .join(",")
      : "unknown-players";

  const winner = anyGame?.winnerId ?? anyGame?.winner ?? "unknown-winner";

  return `fallback:${String(startedAt)}:${String(players)}:${String(winner)}`;
}

function collectGamesFromStore(store: FlexibleStore): StoredGame[] {
  const candidateKeys = [
    "games",
    "savedGames",
    "importedGames",
    "importedSaveGames",
    "uploadedGames",
    "remoteGames",
    "syncedGames",
    "archivedGames",
    "historicalGames",
    "allGames",
  ];

  const merged: StoredGame[] = [];
  const seen = new Set<string>();

  for (const key of candidateKeys) {
    const items = asArray<StoredGame>(store[key]);
    for (const game of items) {
      const signature = makeGameSignature(game);
      if (seen.has(signature)) continue;
      seen.add(signature);
      merged.push(game);
    }
  }

  return merged;
}

function normalizeGroupKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
}

function getFocusAliases(group: FocusGroup): string[] {
  switch (group) {
    case "outcomes":
      return ["outcomes", "overview"];
    case "prestige":
      return ["prestige"];
    case "assists":
      return ["assists", "assist", "teamplay", "team-play"];
    case "objectives":
      return ["objectives", "objective"];
    case "efficiency":
      return ["efficiency"];
    case "positioning":
      return ["positioning", "turnorder", "seatorder", "seat", "turn-order"];
    default:
      return [];
  }
}

export default function IndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; ids?: string | string[] }>();

  const initialMode: CompareMode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "groups"
      ? "groups"
      : "players";

  const initialIds = (
    typeof params.ids === "string"
      ? params.ids.split(",").filter(Boolean)
      : Array.isArray(params.ids)
        ? params.ids.flatMap((value) => value.split(",")).filter(Boolean)
        : []
  ).slice(0, MAX_COMPARE_PLAYERS);

  const [activeTab, setActiveTab] = useState<AffectTab>("conditional");
  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    initialMode === "players" ? initialIds : []
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initialMode === "groups" ? initialIds : []
  );

  const [density, setDensity] = useState<DensityMode>("dense");
  const [topMetricsOnly, setTopMetricsOnly] = useState(false);
  const [sortMetricKey, setSortMetricKey] = useState<string>("prestige");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    outcomes: false,
    prestige: false,
    assists: false,
    objectives: false,
    efficiency: false,
    positioning: false,
  });
  const [selectedMetricInfo, setSelectedMetricInfo] = useState<MetricDescriptor | null>(null);
  const [activeFocusGroup, setActiveFocusGroup] = useState<FocusGroup>("outcomes");
  const [compareSetupCollapsed, setCompareSetupCollapsed] = useState(false);
  const [hasRunCohesionAnalyze, setHasRunCohesionAnalyze] = useState(false);

  const [conditionalState, dispatchConditional] = useReducer(conditionalReducer, {
    ...initialConditionalState,
    subjectMode: initialMode === "groups" ? "groups" : "players",
  });

  const store = useStore() as FlexibleStore;

  const players: Player[] = Array.isArray(store.players) ? store.players : [];
  const groups: Group[] = Array.isArray(store.groups) ? store.groups : [];
  const games: StoredGame[] = useMemo(() => collectGamesFromStore(store), [store]);

  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const baseRows = useMemo(() => {
    return mode === "players"
      ? buildPlayerRows(selectedPlayerIds, playerMap, games)
      : buildGroupRows(selectedGroupIds, groupMap, playerMap, games);
  }, [games, mode, playerMap, groupMap, selectedGroupIds, selectedPlayerIds]);

  const sortMetric = useMemo(
    () => METRICS.find((metric) => String(metric.key) === sortMetricKey) ?? METRICS[0],
    [sortMetricKey]
  );

  const rows = useMemo(
    () => sortRowsByMetric(baseRows, sortMetric, sortDirection),
    [baseRows, sortMetric, sortDirection]
  );

  const allVisibleMetrics = useMemo(
    () => getVisibleMetricEntries(METRICS, METRIC_GROUPS, topMetricsOnly, collapsedGroups),
    [collapsedGroups, topMetricsOnly]
  );

  const visibleMetrics = useMemo(() => {
    const aliases = getFocusAliases(activeFocusGroup).map(normalizeGroupKey);

    if (!aliases.length) return allVisibleMetrics;

    return allVisibleMetrics.filter((entry: any) => {
      if (entry?.type === "group") {
        const groupKey = normalizeGroupKey(
          entry?.group?.key ??
            entry?.groupKey ??
            entry?.group?.label ??
            entry?.label
        );

        return aliases.includes(groupKey);
      }

      const metricGroupKey = normalizeGroupKey(
        entry?.metric?.groupKey ??
          entry?.metric?.group?.key ??
          entry?.groupKey ??
          entry?.metricGroupKey ??
          entry?.metric?.group ??
          entry?.metric?.category
      );

      return aliases.includes(metricGroupKey);
    });
  }, [activeFocusGroup, allVisibleMetrics]);

  const globalTurnOrderInsight = useMemo(() => buildGlobalTurnOrderInsight(games), [games]);

  const conditionalSelectionIds = useMemo(
    () => Array.from(new Set([...conditionalState.mustIncludeIds, ...conditionalState.mayIncludeIds])),
    [conditionalState.mayIncludeIds, conditionalState.mustIncludeIds]
  );
  const hasConditionalSelection =
    Boolean(conditionalState.anchorId) && conditionalSelectionIds.length > 0;

  const conditionalAnalysis = useMemo(
    () => {
      if (!conditionalState.hasRunCompare || !hasConditionalSelection) {
        return null;
      }

      return buildConditionalAnalysis({
        subjectMode: conditionalState.subjectMode,
        anchorId: conditionalState.anchorId,
        mustIncludeIds: conditionalState.mustIncludeIds,
        mayIncludeIds: conditionalState.mayIncludeIds,
        excludedMode: conditionalState.viewMode === "absent",
        playerMap,
        groupMap,
        games,
      });
    },
    [
      conditionalState.hasRunCompare,
      conditionalState.subjectMode,
      conditionalState.anchorId,
      conditionalState.mustIncludeIds,
      conditionalState.mayIncludeIds,
      conditionalState.viewMode,
      hasConditionalSelection,
      playerMap,
      groupMap,
      games,
    ]
  );

  const sortedConditionalPlayers = useMemo(() => {
    const rowsLocal = conditionalAnalysis?.entities ?? [];

    const sorted = [...rowsLocal].sort((a, b) => {
      if (a.isAnchor && !b.isAnchor) return -1;
      if (!a.isAnchor && b.isAnchor) return 1;

      const aVal = a[conditionalState.sortKey as keyof typeof a];
      const bVal = b[conditionalState.sortKey as keyof typeof b];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return conditionalState.sortDirection === "desc"
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }

      const delta = Number(aVal) - Number(bVal);
      return conditionalState.sortDirection === "desc" ? -delta : delta;
    });

    return sorted;
  }, [conditionalAnalysis?.entities, conditionalState.sortDirection, conditionalState.sortKey]);

  const layout = useMemo(() => createMatrixLayout(density), [density]);

  const currentSelectionIds = mode === "players" ? selectedPlayerIds : selectedGroupIds;
  const currentSelectionNames = useMemo(() => {
    return currentSelectionIds
      .map((id) =>
        mode === "players" ? playerMap.get(id)?.name ?? null : groupMap.get(id)?.name ?? null
      )
      .filter((value): value is string => Boolean(value));
  }, [currentSelectionIds, groupMap, mode, playerMap]);
  const hasSelection = currentSelectionIds.length > 0;
  const hasAnalyzed = hasRunCohesionAnalyze && hasSelection && rows.length > 0;
  const showCompareSetupSummary = compareSetupCollapsed && hasAnalyzed;

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }, [
    activeTab,
    mode,
    conditionalState.anchorId,
    conditionalState.sortKey,
    conditionalState.sortDirection,
    topMetricsOnly,
    collapsedGroups,
    activeFocusGroup,
    selectedPlayerIds,
    selectedGroupIds,
  ]);

  function setModeAndSync(nextMode: CompareMode) {
    setCompareSetupCollapsed(false);
    setHasRunCohesionAnalyze(false);
    setMode(nextMode);
    dispatchConditional({ type: "set-subject-mode", mode: nextMode === "groups" ? "groups" : "players" });

    if (nextMode === "players") {
      setSelectedGroupIds([]);
    } else {
      setSelectedPlayerIds([]);
    }
  }

  function togglePlayer(id: string): void {
    setCompareSetupCollapsed(false);
    setHasRunCohesionAnalyze(false);
    setSelectedPlayerIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function toggleGroup(id: string): void {
    setCompareSetupCollapsed(false);
    setHasRunCohesionAnalyze(false);
    setSelectedGroupIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function clearSelection(): void {
    setCompareSetupCollapsed(false);
    setHasRunCohesionAnalyze(false);
    if (mode === "players") {
      setSelectedPlayerIds([]);
      return;
    }
    setSelectedGroupIds([]);
  }

  function toggleGroupCollapse(groupKey: string): void {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  function onMetricPress(metric: MetricDescriptor): void {
    if (sortMetricKey === String(metric.key)) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortMetricKey(String(metric.key));
      setSortDirection(metric.direction === "lower" ? "asc" : "desc");
    }
  }

  function applyPreset(type: "current_compare" | "clear") {
    if (type === "clear") {
      dispatchConditional({ type: "clear" });
      return;
    }

    const ids =
      mode === "players" ? selectedPlayerIds.slice(0, MAX_COMPARE_PLAYERS) : selectedGroupIds.slice(0, MAX_COMPARE_PLAYERS);
    dispatchConditional({ type: "apply-preset", ids, anchorId: ids[0] ?? null });
  }

  function handleRunConditionalCompare() {
    if (!hasConditionalSelection) return;
    dispatchConditional({ type: "run-compare" });
  }

  function handleAnalyzeSelection() {
    if (!hasSelection || rows.length === 0) return;
    setHasRunCohesionAnalyze(true);
    setCompareSetupCollapsed(true);
  }

  const selectionLabel =
    rows.length === 1 ? rows[0]?.label ?? "Selection" : `${rows.length} ${mode}`;
  const selectionSummaryLabel =
    currentSelectionNames.length > 0 ? currentSelectionNames.join(" • ") : selectionLabel;

  const liveSentenceSubtitle =
    mode === "players"
      ? "Sentence updates live as you build the player condition."
      : "Sentence updates live as you build the group condition.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundLayer}>
        <ScreenBackground preset="analytics" />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navPill} onPress={() => router.replace("/")} activeOpacity={0.9}>
            <Text style={styles.navPillText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navPill} onPress={() => router.push("/stats")} activeOpacity={0.9}>
            <Text style={styles.navPillText}>Stats</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabGrid}>
          <View style={styles.tabGridRowTwo}>
            {[
              { key: "conditional" as AffectTab, label: "Conditional Affect" },
              { key: "cohesion" as AffectTab, label: "Cohesion Affect" },
            ].map((tab) => {
              const active = tab.key === activeTab;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.underlineMainTab, styles.underlineMainTabTwoCol]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.underlineMainTabText, active && styles.underlineMainTabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.underlineMainTabLine, active && styles.underlineMainTabLineActive]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {activeTab === "conditional" ? "Conditional Affect" : "Cohesion Affect"}
            </Text>
            <Text style={styles.sectionSub}>
              {activeTab === "conditional"
                ? liveSentenceSubtitle
                : "Select the side you want to compare on this page."}
            </Text>
          </View>

          <View style={styles.underlineSelectorRow}>
            {(["players", "groups"] as CompareMode[]).map((value) => {
              const active = mode === value;
              const label = value === "players" ? "Players" : "Group";
              return (
                <TouchableOpacity
                  key={value}
                  style={styles.underlineTabButton}
                  onPress={() => setModeAndSync(value)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
                    {label}
                  </Text>
                  <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {activeTab === "conditional" ? (
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Conditional Builder</Text>
              <Text style={styles.sectionSub}>
                Keep the sentence structure and live build behavior
              </Text>
            </View>

            <ConditionalComparisonCard
              title="Conditional Affect"
              description=""
              players={players}
              groups={groups}
              subjectMode={mode === "groups" ? "groups" : "players"}
              conditionalState={conditionalState}
              conditionalAnalysis={conditionalAnalysis}
              sortedConditionalPlayers={sortedConditionalPlayers}
              onToggleEntity={(id) => dispatchConditional({ type: "toggle-entity", id })}
              onRemoveEntity={(id) => dispatchConditional({ type: "remove-entity", id })}
              onSetAnchor={(id) => dispatchConditional({ type: "set-anchor", id })}
              onClear={() => dispatchConditional({ type: "clear" })}
              onRunCompare={handleRunConditionalCompare}
              onSetSelectionMode={(nextMode) =>
                dispatchConditional({ type: "set-selection-mode", mode: nextMode })
              }
              onSetViewMode={(nextMode) =>
                dispatchConditional({ type: "set-view-mode", mode: nextMode })
              }
              onToggleCollapsed={() => dispatchConditional({ type: "toggle-selector-collapsed" })}
              onSort={(key) => dispatchConditional({ type: "set-sort", key })}
            />
          </View>
        ) : (
          <>
            {showCompareSetupSummary ? (
              <View style={styles.insightCardCompact}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.summaryHeaderCopy}>
                    <Text style={styles.sectionTitle}>Analyzed lineup</Text>
                    <Text style={styles.summarySubtext}>{selectionSummaryLabel}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.summaryActionButton}
                    onPress={() => setCompareSetupCollapsed(false)}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.summaryActionText}>Edit lineup</Text>
                  </TouchableOpacity>
                </View>

                <CompareSummaryStrip rows={rows} />
              </View>
            ) : (
              <View style={styles.sectionCompact}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Cohesion Selection</Text>
                  <Text style={styles.sectionSub}>Pick the players or groups to compare</Text>
                </View>

                <CompareSelectionCard
                  title="Cohesion Affect"
                  subtitle=""
                  mode={mode}
                  density={density}
                  players={players}
                  groups={groups}
                  games={games}
                  playerMap={playerMap}
                  selectedPlayerIds={selectedPlayerIds}
                  selectedGroupIds={selectedGroupIds}
                  onTogglePlayer={togglePlayer}
                  onToggleGroup={toggleGroup}
                  onSetDensity={setDensity}
                  onClear={clearSelection}
                  onAnalyze={handleAnalyzeSelection}
                />
              </View>
            )}

            {hasAnalyzed ? (
              <>
                {!showCompareSetupSummary ? (
                  <View style={styles.sectionCompact}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Cohesion Summary</Text>
                      <Text style={styles.sectionSub}>{selectionLabel}</Text>
                    </View>
                    <CompareSummaryStrip rows={rows} />
                  </View>
                ) : null}

                <View style={styles.insightCardCompact}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Live Summary</Text>
                    <Text style={styles.insightChip}>{mode.toUpperCase()}</Text>
                  </View>
                  <CompareInsightBar
                    rows={rows}
                    activeFocusGroup={activeFocusGroup}
                    modeLabel={mode}
                    selectionLabel={selectionLabel}
                  />
                </View>

                <View style={styles.sectionCompact}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Matrix Focus</Text>
                    <Text style={styles.sectionSub}>Choose what the cohesion matrix emphasizes</Text>
                  </View>

                  <CompareFocusBar
                    activeKey={activeFocusGroup}
                    onSelect={(key) => setActiveFocusGroup(key)}
                  />

                  <Text style={styles.helperText}>
                    Focus: {activeFocusGroup} • Visible entries: {visibleMetrics.length}
                  </Text>
                </View>

                <View style={styles.sectionCompact}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Cohesion Matrix</Text>
                    <Text style={styles.sectionSub}>Compact compare matrix</Text>
                  </View>

                  <CompareMatrixCard
                    title="Cohesion Affect"
                    rows={rows}
                    layout={layout}
                    visibleMetrics={visibleMetrics}
                    sortMetric={sortMetric}
                    sortMetricKey={sortMetricKey}
                    sortDirection={sortDirection}
                    topMetricsOnly={topMetricsOnly}
                    hasAnalyzed={true}
                    modeLabel={mode}
                    onToggleTopMetricsOnly={() => setTopMetricsOnly((prev) => !prev)}
                    onMetricPress={onMetricPress}
                    onOpenMetricInfo={(metric) => setSelectedMetricInfo(metric)}
                    onToggleGroupCollapse={toggleGroupCollapse}
                    collapsedGroups={collapsedGroups}
                  />
                </View>

                <View style={styles.sectionCompact}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Telemetry</Text>
                    <Text style={styles.sectionSub}>Shared turn-order context</Text>
                  </View>
                  <CompareTelemetryRow insight={globalTurnOrderInsight} />
                </View>
              </>
            ) : (
              <View style={styles.sectionCompact}>
                <Text style={styles.emptyText}>
                  {hasSelection
                    ? `Tap Analyze to view cohesion affect for this ${mode === "players" ? "lineup" : "group set"}.`
                    : `Select at least one ${mode === "players" ? "player" : "group"} to populate cohesion affect.`}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 10 }} />
      </ScrollView>

      <MetricInfoModal
        visible={!!selectedMetricInfo}
        metric={selectedMetricInfo as any}
        onClose={() => setSelectedMetricInfo(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,10,22,0.70)",
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 6,
    paddingBottom: 10,
  },

  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  kicker: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  headerBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
  },

  navRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  navPill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navPillText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },

  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  insightCardCompact: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 4,
  },
  summaryHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 9,
    textAlign: "right",
    flexShrink: 1,
  },
  summarySubtext: {
    color: COLORS.sub,
    fontSize: 10,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  helperText: {
    color: COLORS.sub,
    fontSize: 10,
    marginTop: 4,
  },
  summaryActionButton: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryActionText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: "800",
  },

  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 6,
    alignItems: "flex-end",
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

  tabGrid: {
    marginBottom: 4,
    gap: 8,
  },
  tabGridRowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  underlineMainTab: {
    paddingBottom: 3,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  underlineMainTabTwoCol: {
    flex: 1,
  },
  underlineMainTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },
  underlineMainTabTextActive: {
    color: COLORS.accent,
  },
  underlineMainTabLine: {
    marginTop: 4,
    height: 2,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
  },

  insightChip: {
    backgroundColor: COLORS.blueSoft,
    color: COLORS.blue,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "800",
  },
});

