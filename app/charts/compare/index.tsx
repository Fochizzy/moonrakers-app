import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  UIManager,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';
import { useStore } from '@/store/useStore';

import CompareSelectionCard from '@/components/charts/compare/CompareSelectionCard';
import CompareTelemetryRow from '@/components/charts/compare/CompareTelemetryRow';
import CompareMatrixCard from '@/components/charts/compare/CompareMatrixCard';
import CompareInsightBar from '@/components/charts/compare/CompareInsightBar';
import CompareSummaryStrip from '@/components/charts/compare/CompareSummaryStrip';
import ConditionalComparisonCard from '@/components/charts/compare/ConditionalComparisonCard';
import MetricInfoModal from '@/components/charts/compare/MetricInfoModal';

import { styles } from '@/utils/compareStyles';
import { METRICS, METRIC_GROUPS } from '@/utils/compareMetrics';
import { chartColors } from '@/utils/chartTheme';
import {
  buildConditionalAnalysis,
  conditionalReducer,
  initialConditionalState,
} from '@/utils/conditionalCompareHelpers';
import {
  buildGlobalTurnOrderInsight,
  buildGroupRows,
  buildPlayerRows,
  createMatrixLayout,
  getVisibleMetricEntries,
  sortRowsByMetric,
} from '@/utils/compareHelpers';
import {
  CompareMode,
  CompareStoreShape,
  DensityMode,
  Group,
  MetricDescriptor,
  Player,
  SortDirection,
  StoredGame,
} from '@/utils/compareTypes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_COMPARE_PLAYERS = 5;

type FlexibleStore = CompareStoreShape & Record<string, unknown>;

type FocusGroup =
  | 'outcomes'
  | 'prestige'
  | 'assists'
  | 'objectives'
  | 'efficiency'
  | 'positioning';

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
    'unknown-time';

  const players = Array.isArray(anyGame?.playerIds)
    ? anyGame.playerIds.join(',')
    : Array.isArray(anyGame?.players)
      ? anyGame.players
          .map((entry: any) => entry?.playerId ?? entry?.id ?? entry?.name ?? 'unknown-player')
          .join(',')
      : 'unknown-players';

  const winner = anyGame?.winnerId ?? anyGame?.winner ?? 'unknown-winner';

  return `fallback:${String(startedAt)}:${String(players)}:${String(winner)}`;
}

function collectGamesFromStore(store: FlexibleStore): StoredGame[] {
  const candidateKeys = [
    'games',
    'savedGames',
    'importedGames',
    'importedSaveGames',
    'uploadedGames',
    'remoteGames',
    'syncedGames',
    'archivedGames',
    'historicalGames',
    'allGames',
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

const FOCUS_ITEMS: Array<{ key: FocusGroup; label: string }> = [
  { key: 'outcomes', label: 'Overview' },
  { key: 'prestige', label: 'Prestige' },
  { key: 'assists', label: 'Assists' },
  { key: 'objectives', label: 'Objectives' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'positioning', label: 'Positioning' },
];

function normalizeGroupKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

function getFocusAliases(group: FocusGroup): string[] {
  switch (group) {
    case 'outcomes':
      return ['outcomes', 'overview'];
    case 'prestige':
      return ['prestige'];
    case 'assists':
      return ['assists', 'assist', 'teamplay', 'team-play'];
    case 'objectives':
      return ['objectives', 'objective'];
    case 'efficiency':
      return ['efficiency'];
    case 'positioning':
      return ['positioning', 'turnorder', 'seatorder', 'seat', 'turn-order'];
    default:
      return [];
  }
}

export default function CompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; ids?: string | string[] }>();

  const initialMode: CompareMode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === 'groups'
      ? 'groups'
      : 'players';

  const initialIds = (
    typeof params.ids === 'string'
      ? params.ids.split(',').filter(Boolean)
      : Array.isArray(params.ids)
        ? params.ids.flatMap((value) => value.split(',')).filter(Boolean)
        : []
  ).slice(0, MAX_COMPARE_PLAYERS);

  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    initialMode === 'players' ? initialIds : []
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    initialMode === 'groups' ? initialIds : []
  );

  const [density, setDensity] = useState<DensityMode>('dense');
  const [topMetricsOnly, setTopMetricsOnly] = useState(false);
  const [sortMetricKey, setSortMetricKey] = useState<string>('prestige');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    outcomes: false,
    prestige: false,
    assists: false,
    objectives: false,
    efficiency: false,
    positioning: false,
  });
  const [selectedMetricInfo, setSelectedMetricInfo] = useState<MetricDescriptor | null>(null);
  const [activeFocusGroup, setActiveFocusGroup] = useState<FocusGroup>('outcomes');

  const [conditionalState, dispatchConditional] = useReducer(conditionalReducer, {
    ...initialConditionalState,
    subjectMode: initialMode === 'groups' ? 'groups' : 'players',
  });

  const anchorGlowAnim = useRef(new Animated.Value(0)).current;
  const store = useStore() as FlexibleStore;

  const players: Player[] = Array.isArray(store.players) ? store.players : [];
  const groups: Group[] = Array.isArray(store.groups) ? store.groups : [];
  const games: StoredGame[] = useMemo(() => collectGamesFromStore(store), [store]);

  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

  const baseRows = useMemo(() => {
    return mode === 'players'
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
      if (entry?.type === 'group') {
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

  const conditionalAnalysis = useMemo(
    () =>
      buildConditionalAnalysis({
        subjectMode: conditionalState.subjectMode,
        anchorId: conditionalState.anchorId,
        mustIncludeIds: conditionalState.mustIncludeIds,
        mayIncludeIds: conditionalState.mayIncludeIds,
        excludedMode: conditionalState.viewMode === 'absent',
        playerMap,
        groupMap,
        games,
      }),
    [
      conditionalState.subjectMode,
      conditionalState.anchorId,
      conditionalState.mustIncludeIds,
      conditionalState.mayIncludeIds,
      conditionalState.viewMode,
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

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return conditionalState.sortDirection === 'desc'
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }

      const delta = Number(aVal) - Number(bVal);
      return conditionalState.sortDirection === 'desc' ? -delta : delta;
    });

    return sorted;
  }, [conditionalAnalysis?.entities, conditionalState.sortDirection, conditionalState.sortKey]);

  const layout = useMemo(() => createMatrixLayout(density), [density]);

  const currentSelectionIds = mode === 'players' ? selectedPlayerIds : selectedGroupIds;
  const hasSelection = currentSelectionIds.length > 0;
  const hasAnalyzed = hasSelection && rows.length > 0;

  useEffect(() => {
    if (!conditionalState.anchorId) return;

    anchorGlowAnim.setValue(0);
    Animated.sequence([
      Animated.timing(anchorGlowAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(anchorGlowAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [conditionalState.anchorId, anchorGlowAnim]);

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 260,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }, [
    conditionalState.anchorId,
    conditionalState.sortKey,
    conditionalState.sortDirection,
    topMetricsOnly,
    collapsedGroups,
    activeFocusGroup,
    mode,
    selectedPlayerIds,
    selectedGroupIds,
  ]);

  function togglePlayer(id: string): void {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function toggleGroup(id: string): void {
    setSelectedGroupIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function clearSelection(): void {
    if (mode === 'players') {
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
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortMetricKey(String(metric.key));
      setSortDirection(metric.direction === 'lower' ? 'asc' : 'desc');
    }
  }

  function applyPreset(type: 'current_compare' | 'clear') {
    if (type === 'clear') {
      dispatchConditional({ type: 'clear' });
      return;
    }

    const ids = mode === 'players' ? selectedPlayerIds.slice(0, 5) : [];
    dispatchConditional({ type: 'apply-preset', ids, anchorId: ids[0] ?? null });
  }

  const selectionLabel =
    rows.length === 1 ? rows[0]?.label ?? 'Selection' : `${rows.length} ${mode}`;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
      </View>

      <View style={styles.overlayGlowTopRight} />
      <View style={styles.overlayGlowTopLeft} />
      <View style={styles.overlayGlowBottom} />

      <View style={styles.sheet}>
        <View style={styles.sheetGlowPrimary} />
        <View style={styles.sheetGlowSecondary} />

        <View style={styles.sheetHeader}>
          <View style={styles.handle} />

          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.brandTitle}>Moonrakers</Text>
              <Text style={styles.sheetTitle}>Compare</Text>
            </View>

            <View style={styles.headerNavRow}>
              <Pressable style={styles.headerPill} onPress={() => router.replace('/')}>
                <Text style={styles.headerPillText}>Home</Text>
              </Pressable>
              <Pressable style={styles.headerPill} onPress={() => router.push('/stats')}>
                <Text style={styles.headerPillText}>Stats</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.segmentShell}>
            <Pressable
              style={[styles.segment, mode === 'players' ? styles.segmentActive : null]}
              onPress={() => {
                setMode('players');
                setSelectedGroupIds([]);
                dispatchConditional({ type: 'set-subject-mode', mode: 'players' });
              }}
            >
              <Text style={[styles.segmentText, mode === 'players' ? styles.segmentTextActive : null]}>
                Players
              </Text>
            </Pressable>

            <Pressable
              style={[styles.segment, mode === 'groups' ? styles.segmentActive : null]}
              onPress={() => {
                setMode('groups');
                setSelectedPlayerIds([]);
                dispatchConditional({ type: 'set-subject-mode', mode: 'groups' });
              }}
            >
              <Text style={[styles.segmentText, mode === 'groups' ? styles.segmentTextActive : null]}>
                Groups
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ConditionalComparisonCard
            title="Conditional Comparison"
            description=""
            players={players}
            groups={groups}
            subjectMode={mode === 'groups' ? 'groups' : 'players'}
            conditionalState={conditionalState as any}
            conditionalAnalysis={conditionalAnalysis as any}
            sortedConditionalPlayers={sortedConditionalPlayers as any}
            onToggleEntity={(id) => dispatchConditional({ type: 'toggle-entity', id })}
            onRemoveEntity={(id) => dispatchConditional({ type: 'remove-entity', id })}
            onSetAnchor={(id) => dispatchConditional({ type: 'set-anchor', id })}
            onClear={() => dispatchConditional({ type: 'clear' })}
            onApplyCurrentCompare={() => applyPreset('current_compare')}
            onApplyTopSynergy={() => {}}
            onApplyTopWins={() => {}}
            onSetSelectionMode={(nextMode) =>
              dispatchConditional({ type: 'set-selection-mode', mode: nextMode })
            }
            onSetViewMode={(nextMode) =>
              dispatchConditional({ type: 'set-view-mode', mode: nextMode })
            }
            onToggleCollapsed={() => dispatchConditional({ type: 'toggle-selector-collapsed' })}
            onSort={(key) => dispatchConditional({ type: 'set-sort', key })}
          />

          <CompareSelectionCard
            title="Comparison Selection"
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
            onAnalyze={() => {}}
          />

          {hasAnalyzed ? (
            <>
              <CompareSummaryStrip rows={rows} />

              <CompareInsightBar
                rows={rows}
                activeFocusGroup={activeFocusGroup}
                modeLabel={mode}
                selectionLabel={selectionLabel}
              />

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEyebrow}>Matrix Focus</Text>
                  <Text style={styles.cardMeta}>Choose what to compare</Text>
                </View>

                <View style={styles.focusBar}>
                  {FOCUS_ITEMS.map((item) => {
                    const active = activeFocusGroup === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => setActiveFocusGroup(item.key)}
                        style={[styles.focusPill, active ? styles.focusPillActive : null]}
                      >
                        <Text style={[styles.focusPillText, active ? styles.focusPillTextActive : null]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ color: chartColors.subtext, fontSize: 12, marginTop: 8 }}>
                  Focus: {activeFocusGroup} • Visible entries: {visibleMetrics.length}
                </Text>
              </View>

              <CompareMatrixCard
                title="Compare Matrix"
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

              <CompareTelemetryRow insight={globalTurnOrderInsight} />
            </>
          ) : (
            <View style={{ paddingVertical: 24 }}>
              <Text style={styles.sheetSubtitle}>
                Select at least one {mode === 'players' ? 'player' : 'group'} to populate the compare matrix.
              </Text>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      <MetricInfoModal
        visible={!!selectedMetricInfo}
        metric={selectedMetricInfo as any}
        onClose={() => setSelectedMetricInfo(null)}
      />
    </View>
  );
}
