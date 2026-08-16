import React, { useEffect, useMemo, useReducer, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AnalyticsControlRail from "@/components/analytics/AnalyticsControlRail";
import ActionButton from "@/components/ui/ActionButton";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { useStore } from "@/store/useStore";

import ChartInsightStrip from "@/components/charts/ChartInsightStrip";
import ChartMetricChip from "@/components/charts/ChartMetricChip";
import ChartSurface from "@/components/charts/ChartSurface";
import CompareSelectionCard from "@/components/charts/compare/CompareSelectionCard";
import CompareTelemetryRow from "@/components/charts/compare/CompareTelemetryRow";
import CompareMatrixCard from "@/components/charts/compare/CompareMatrixCard";
import CompareInsightBar from "@/components/charts/compare/CompareInsightBar";
import CompareSummaryStrip from "@/components/charts/compare/CompareSummaryStrip";
import ConditionalComparisonCard from "@/components/charts/compare/ConditionalComparisonCard";
import MetricInfoModal from "@/components/charts/compare/MetricInfoModal";
import CompareFocusBar from "@/components/charts/compare/CompareFocusBar";

import { METRICS, METRIC_GROUPS } from "@/utils/compareMetrics";
import { buildHomeRoute } from "@/utils/appRoutes";
import {
  buildConditionalAnalysis,
  conditionalReducer,
  initialConditionalState,
} from "@/utils/conditionalCompareHelpers";
// utils/compareTypes also declares a ConditionalState, but it predates
// hasRunCompare; the reducer's own type is the live one.
import type { ConditionalState } from "@/utils/conditionalCompareHelpers";
import {
  buildGlobalTurnOrderInsight,
  buildGroupRows,
  buildPlayerRows,
  buildPlayerVsOpponentAggregateRows,
  createMatrixLayout,
  getVisibleMetricEntries,
  sortRowsByMetric,
} from "@/utils/compareHelpers";
import {
  prioritizeSignedInPlayerOptions,
  type NormalizedGame,
} from "@/utils/charts";
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
import { COLORS } from "@/utils/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_COMPARE_PLAYERS = 5;


type FlexibleStore = CompareStoreShape & Record<string, unknown>;

type AuthSessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

type AuthProfileLike = {
  id?: string | null;
  player_name?: string | null;
  display_name?: string | null;
} | null;

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

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function makeGameSignature(game: StoredGame): string {
  const source: UnknownRecord = game;

  if (source.id) return `id:${String(source.id)}`;
  if (source.gameId) return `gameId:${String(source.gameId)}`;

  const startedAt =
    source.startedAt ??
    source.createdAt ??
    source.date ??
    source.timestamp ??
    "unknown-time";

  const players = Array.isArray(source.playerIds)
    ? source.playerIds.join(",")
    : Array.isArray(source.players)
      ? source.players
          .map((entry: unknown) => {
            const entryRecord = asRecord(entry);
            return (
              entryRecord.playerId ??
              entryRecord.id ??
              entryRecord.name ??
              "unknown-player"
            );
          })
          .join(",")
      : "unknown-players";

  const winner = source.winnerId ?? source.winner ?? "unknown-winner";

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

function normalizeComparePlayerId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeComparePlayerName(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveConditionalQuickSelectAuthPlayerId(args: {
  players: Player[];
  authProfileId?: string | null;
  authSessionUserId?: string | null;
  authPlayerName?: string | null;
  authDisplayName?: string | null;
}) {
  const {
    players,
    authProfileId,
    authSessionUserId,
    authPlayerName,
    authDisplayName,
  } = args;

  for (const candidateId of [authProfileId, authSessionUserId]) {
    const normalizedCandidateId = normalizeComparePlayerId(candidateId);
    if (!normalizedCandidateId) continue;

    const matchedPlayer = players.find(
      (player) => normalizeComparePlayerId(player?.id) === normalizedCandidateId
    );
    if (matchedPlayer) {
      return normalizeComparePlayerId(matchedPlayer.id);
    }
  }

  const normalizedCandidateNames = [authPlayerName, authDisplayName]
    .map((value) => normalizeComparePlayerName(value).toLowerCase())
    .filter(Boolean);

  for (const candidateName of normalizedCandidateNames) {
    const matchedPlayer = players.find(
      (player) => normalizeComparePlayerName(player?.name).toLowerCase() === candidateName
    );
    if (matchedPlayer) {
      return normalizeComparePlayerId(matchedPlayer.id);
    }
  }

  return null;
}

function buildConditionalQuickSelectPlayerIds(args: {
  players: Player[];
  games: StoredGame[];
  authProfileId?: string | null;
  authSessionUserId?: string | null;
  authPlayerName?: string | null;
  authDisplayName?: string | null;
}) {
  const {
    players,
    games,
    authProfileId,
    authSessionUserId,
    authPlayerName,
    authDisplayName,
  } = args;

  const validPlayers = players
    .map((player) => ({
      id: normalizeComparePlayerId(player?.id),
      name: normalizeComparePlayerName(player?.name),
    }))
    .filter((player) => player.id && player.name);
  const loggedInPlayerId = resolveConditionalQuickSelectAuthPlayerId({
    players,
    authProfileId,
    authSessionUserId,
    authPlayerName,
    authDisplayName,
  });

  if (loggedInPlayerId) {
    const authProfilePlayer =
      validPlayers.find((player) => player.id === loggedInPlayerId) ?? {
        id: loggedInPlayerId,
        name:
          normalizeComparePlayerName(authPlayerName) ||
          normalizeComparePlayerName(authDisplayName) ||
          "Player",
      };

    return prioritizeSignedInPlayerOptions({
      players: validPlayers,
      games: games as NormalizedGame[],
      authProfileId,
      authSessionUserId,
      authProfilePlayer,
      commonPlayerLimit: 4,
    })
      .slice(0, 5)
      .map((player) => normalizeComparePlayerId(player?.id))
      .filter(Boolean);
  }

  const validPlayerIds = new Set(validPlayers.map((player) => player.id));
  const appearanceCounts = new Map(validPlayers.map((player) => [player.id, 0]));

  for (const game of games) {
    const seenGamePlayerIds = new Set<string>();
    for (const gamePlayer of Array.isArray(game?.players) ? game.players : []) {
      const normalizedId = normalizeComparePlayerId(gamePlayer?.id);
      if (!normalizedId || !validPlayerIds.has(normalizedId) || seenGamePlayerIds.has(normalizedId)) {
        continue;
      }
      seenGamePlayerIds.add(normalizedId);
      appearanceCounts.set(normalizedId, (appearanceCounts.get(normalizedId) ?? 0) + 1);
    }
  }

  const rankedPlayerIds = [...validPlayers]
    .sort((left, right) => {
      const countDelta =
        (appearanceCounts.get(right.id) ?? 0) - (appearanceCounts.get(left.id) ?? 0);
      if (countDelta !== 0) {
        return countDelta;
      }
      return left.name.localeCompare(right.name);
    })
    .map((player) => player.id)
    .filter((playerId) => (appearanceCounts.get(playerId) ?? 0) > 0);

  return rankedPlayerIds.slice(0, 5);
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
      ? params.ids.split(",").map((value) => value.trim()).filter(Boolean)
      : Array.isArray(params.ids)
        ? params.ids
            .flatMap((value) => value.split(",").map((part) => part.trim()))
            .filter(Boolean)
        : []
  ).slice(0, MAX_COMPARE_PLAYERS);

  const [activeTab, setActiveTab] = useState<AffectTab>("conditional");
  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [cohesionSelectionMode, setCohesionSelectionMode] = useState<"manual" | "player_field_aggregate">("manual");
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

  // Annotated so subjectMode keeps its literal union type instead of widening
  // to string, which silently broke the ConditionalState contract downstream.
  const initialConditionalReducerState: ConditionalState = {
    ...initialConditionalState,
    subjectMode: initialMode === "groups" ? "groups" : "players",
  };
  const [conditionalState, dispatchConditional] = useReducer(
    conditionalReducer,
    initialConditionalReducerState,
  );

  const store = useStore() as FlexibleStore;
  const authSession = store.authSession as AuthSessionLike;
  const authProfile = store.authProfile as AuthProfileLike;

  const players: Player[] = Array.isArray(store.players) ? store.players : [];
  const groups: Group[] = Array.isArray(store.groups) ? store.groups : [];
  const games: StoredGame[] = useMemo(() => collectGamesFromStore(store), [store]);
  const conditionalQuickSelectPlayerIds = useMemo(
    () =>
      buildConditionalQuickSelectPlayerIds({
        players,
        games,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authPlayerName: authProfile?.player_name,
        authDisplayName: authProfile?.display_name,
      }),
    [
      players,
      games,
      authProfile?.display_name,
      authProfile?.id,
      authProfile?.player_name,
      authSession?.user?.id,
    ]
  );
  const compareAuthPlayerId = useMemo(
    () =>
      resolveConditionalQuickSelectAuthPlayerId({
        players,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authPlayerName: authProfile?.player_name,
        authDisplayName: authProfile?.display_name,
      }),
    [
      players,
      authProfile?.display_name,
      authProfile?.id,
      authProfile?.player_name,
      authSession?.user?.id,
    ]
  );

  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const playerFieldAggregateSelection = useMemo(() => {
    if (mode !== "players" || cohesionSelectionMode !== "player_field_aggregate" || !compareAuthPlayerId) {
      return null;
    }

    return buildPlayerVsOpponentAggregateRows({
      playerId: compareAuthPlayerId,
      playerMap,
      games,
    });
  }, [cohesionSelectionMode, compareAuthPlayerId, games, mode, playerMap]);
  const playerFieldAggregateOption = useMemo(() => {
    if (mode !== "players" || !compareAuthPlayerId) return null;

    const aggregate = buildPlayerVsOpponentAggregateRows({
      playerId: compareAuthPlayerId,
      playerMap,
      games,
    });
    if (!aggregate) return null;

    return {
      title: "You vs played field",
      subtitle: `${aggregate.playerLabel} against ${aggregate.opponentCount} opponents across ${aggregate.sharedGames} shared games`,
      active: cohesionSelectionMode === "player_field_aggregate",
      onPress: () => {
        setCompareSetupCollapsed(false);
        setHasRunCohesionAnalyze(false);
        setCohesionSelectionMode("player_field_aggregate");
        setSelectedPlayerIds([]);
      },
    };
  }, [cohesionSelectionMode, compareAuthPlayerId, games, mode, playerMap]);

  const baseRows = useMemo(() => {
    if (mode === "players" && cohesionSelectionMode === "player_field_aggregate") {
      return playerFieldAggregateSelection?.rows ?? [];
    }

    return mode === "players"
      ? buildPlayerRows(selectedPlayerIds, playerMap, games)
      : buildGroupRows(selectedGroupIds, groupMap, playerMap, games);
  }, [
    cohesionSelectionMode,
    games,
    mode,
    playerFieldAggregateSelection?.rows,
    playerMap,
    groupMap,
    selectedGroupIds,
    selectedPlayerIds,
  ]);

  const sortMetric = useMemo(
    () => METRICS.find((metric) => String(metric.key) === sortMetricKey) ?? METRICS[0]!,
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

    return allVisibleMetrics.filter((entry) => {
      const entryRecord = asRecord(entry);

      if (entryRecord.type === "group") {
        const group = asRecord(entryRecord.group);
        const groupKey = normalizeGroupKey(
          group.key ?? entryRecord.groupKey ?? group.label ?? entryRecord.label
        );

        return aliases.includes(groupKey);
      }

      const metric = asRecord(entryRecord.metric);
      const metricGroupKey = normalizeGroupKey(
        metric.groupKey ??
          asRecord(metric.group).key ??
          entryRecord.groupKey ??
          entryRecord.metricGroupKey ??
          metric.group ??
          metric.category
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
  const hasSelection =
    currentSelectionIds.length > 0 ||
    (mode === "players" &&
      cohesionSelectionMode === "player_field_aggregate" &&
      Boolean(playerFieldAggregateSelection));
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
    setCohesionSelectionMode("manual");
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
    setCohesionSelectionMode("manual");
    setSelectedPlayerIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function toggleGroup(id: string): void {
    setCompareSetupCollapsed(false);
    setHasRunCohesionAnalyze(false);
    setCohesionSelectionMode("manual");
    setSelectedGroupIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function clearSelection(): void {
    setCompareSetupCollapsed(false);
    setHasRunCohesionAnalyze(false);
    setCohesionSelectionMode("manual");
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
    mode === "players" &&
    cohesionSelectionMode === "player_field_aggregate" &&
    playerFieldAggregateSelection
      ? `${playerFieldAggregateSelection.playerLabel} vs played field`
      : rows.length === 1
        ? rows[0]?.label ?? "Selection"
        : `${rows.length} ${mode}`;

  const resolvedSelectionSummaryLabel =
    mode === "players" &&
    cohesionSelectionMode === "player_field_aggregate" &&
    playerFieldAggregateSelection
      ? `${playerFieldAggregateSelection.playerLabel} against ${playerFieldAggregateSelection.opponentCount} opponents across ${playerFieldAggregateSelection.sharedGames} shared games`
      : currentSelectionNames.length > 0
        ? currentSelectionNames.join(" • ")
        : selectionLabel;

  const liveSentenceSubtitle =
    mode === "players"
      ? "Sentence updates live as you build the player condition."
      : "Sentence updates live as you build the group condition.";

  return (
    <PageShell preset="analytics" density="compact" scroll={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroCard
          eyebrow="Compare"
          title="Compare"
          subtitle={activeTab === "conditional" ? liveSentenceSubtitle : undefined}
          subtitleNumberOfLines={activeTab === "conditional" ? 1 : undefined}
          subtitleStyle={activeTab === "conditional" ? styles.heroSubtitleSingleLine : undefined}
          size="compact"
          headerAction={
            <ActionButton
              title="Command"
              variant="ghost"
              onPress={() => router.push(buildHomeRoute())}
              style={styles.heroActionButton}
            />
          }
        />

        <AnalyticsControlRail
          tabs={[
            { key: "conditional", label: "Conditional Affect" },
            { key: "cohesion", label: "Cohesion Affect" },
          ]}
          activeTabKey={activeTab}
          onTabChange={(key) => setActiveTab(key as AffectTab)}
        />

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            {activeTab === "conditional" ? (
              <Text numberOfLines={1} style={[styles.sectionSub, styles.sectionSubFullWidth]}>
                {liveSentenceSubtitle}
              </Text>
            ) : (
              <Text numberOfLines={1} style={styles.sectionTitle}>
                Cohesion Affect
              </Text>
            )}
          </View>

          <View style={styles.underlineSelectorRow}>
            {(["players", "groups"] as CompareMode[]).map((value) => {
              const active = mode === value;
              const label = value === "players" ? "Players" : "Group";
              return (
                <Pressable
                  key={value}
                  style={({ pressed }) => [styles.underlineTabButton, pressed && { opacity: 0.9 }]}
                  onPress={() => setModeAndSync(value)}
                >
                  <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
                    {label}
                  </Text>
                  <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === "conditional" ? (
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text numberOfLines={1} style={styles.sectionTitle}>
                Conditional Builder
              </Text>
            </View>

            <ConditionalComparisonCard
              title=""
              description=""
              players={players}
              groups={groups}
              quickSelectIds={mode === "players" ? conditionalQuickSelectPlayerIds : []}
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
                    <Text style={styles.summarySubtext}>{resolvedSelectionSummaryLabel}</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.summaryActionButton, pressed && { opacity: 0.9 }]}
                    onPress={() => setCompareSetupCollapsed(false)}
                  >
                    <Text style={styles.summaryActionText}>Edit lineup</Text>
                  </Pressable>
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
                  specialSelection={mode === "players" ? playerFieldAggregateOption : null}
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

                <ChartSurface
                  eyebrow="Live Summary"
                  title="Cohesion affect"
                  subtitle={`Selection: ${selectionLabel}`}
                  style={styles.chartSurfaceCard}
                >
                  <View style={styles.surfaceChipRow}>
                    <ChartMetricChip label={mode.toUpperCase()} />
                    <ChartMetricChip label={`Rows ${rows.length}`} />
                    <ChartMetricChip label={`Focus ${activeFocusGroup}`} />
                  </View>
                  <ChartInsightStrip label="Analyzed lineup" value={selectionLabel} />
                  <CompareInsightBar
                    rows={rows}
                    activeFocusGroup={activeFocusGroup}
                    modeLabel={mode}
                    selectionLabel={selectionLabel}
                  />
                </ChartSurface>

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
        metric={selectedMetricInfo}
        onClose={() => setSelectedMetricInfo(null)}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5,10,22,0.70)",
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 6,
    paddingBottom: 10,
  },
  heroActionButton: {
    minWidth: 164,
  },
  heroSubtitleSingleLine: {
    fontSize: 11,
    lineHeight: 15,
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
  sectionSubFullWidth: {
    flex: 1,
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
  chartSurfaceCard: {
    marginBottom: 4,
  },
  surfaceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
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

});
