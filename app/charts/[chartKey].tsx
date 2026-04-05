import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { useStore } from '@/store/useStore';
import { resolveAllGamesToPlayers } from '@/utils/importedGameResolver';
import { buildChartData } from '@/components/charts/core/buildChartData';
import type { MetricKey } from '@/components/charts/core/metricSchema';

type PlayerLike = {
  id?: string;
  name?: string;
  color?: string;
};

type StoredGameLike = {
  id?: string | number;
  gameId?: string | number;
  createdAt?: number;
  startedAt?: number;
  date?: number | string;
  timestamp?: number | string;
  players?: PlayerLike[];
  playerIds?: string[];
  totals?: Record<string, any>;
};

type FlexibleStore = Record<string, unknown> & {
  games?: StoredGameLike[];
  savedGames?: StoredGameLike[];
  importedGames?: StoredGameLike[];
  importedSaveGames?: StoredGameLike[];
  uploadedGames?: StoredGameLike[];
  remoteGames?: StoredGameLike[];
  syncedGames?: StoredGameLike[];
  archivedGames?: StoredGameLike[];
  historicalGames?: StoredGameLike[];
  allGames?: StoredGameLike[];
};

type MetricOption = {
  key: MetricKey;
  label: string;
};

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'score', label: 'Score' },
  { key: 'totalPrestige', label: 'Total Prestige' },
  { key: 'directPrestige', label: 'Direct Prestige' },
  { key: 'assistPrestigeReceived', label: 'Assist Prestige' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'assists', label: 'Assists' },
  { key: 'failures', label: 'Failures' },
  { key: 'turnsAtBase', label: 'Turns At Base' },
  { key: 'allContractsEfficiency', label: 'All Contracts Efficiency' },
  { key: 'assistEfficiency', label: 'Assist Efficiency' },
  { key: 'directEfficiency', label: 'Direct Efficiency' },
  { key: 'contractSuccessRate', label: 'Contract Success Rate' }
];

const CHART_KEY_ALIASES: Record<string, string> = {
  bar: 'bar-chart',
  'bar-chart': 'bar-chart',
  line: 'line-chart',
  'line-chart': 'line-chart',
  'multi-line': 'multi-line-chart',
  'multi-line-chart': 'multi-line-chart'
};

function normalizeChartKey(value?: string | string[] | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = String(raw ?? 'bar-chart').trim().toLowerCase();
  return CHART_KEY_ALIASES[normalized] ?? normalized;
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getParamList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw.split(',').map((x) => x.trim()).filter(Boolean);
}

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function collectGamesFromStore(store: FlexibleStore): StoredGameLike[] {
  const candidateKeys: Array<keyof FlexibleStore> = [
    'games',
    'savedGames',
    'importedGames',
    'importedSaveGames',
    'uploadedGames',
    'remoteGames',
    'syncedGames',
    'archivedGames',
    'historicalGames',
    'allGames'
  ];

  const merged: StoredGameLike[] = [];
  const seen = new Set<string>();

  for (const key of candidateKeys) {
    const items = Array.isArray(store[key]) ? (store[key] as StoredGameLike[]) : [];
    for (const game of items) {
      const signature =
        String(game.id ?? game.gameId ?? '') ||
        ${String(game.createdAt ?? game.startedAt ?? game.date ?? game.timestamp ?? '')}:;

      if (seen.has(signature)) continue;
      seen.add(signature);
      merged.push(game);
    }
  }

  return merged.sort((a, b) => {
    const aTime = toNumber(a.createdAt ?? a.startedAt);
    const bTime = toNumber(b.createdAt ?? b.startedAt);
    return aTime - bTime;
  });
}

function buildHistoryTimeline(
  games: StoredGameLike[],
  players: Array<{ id?: string; name?: string; color?: string }>,
  statKey: string
) {
  if (!games.length || !players.length) return [];

  return games.map((game, index) => {
    const snapshot: Record<string, any> = {};

    players.forEach((player) => {
      const playerId = String(player.id ?? '');
      const totals = game.totals?.[playerId];

      const totalPrestige =
        toNumber(totals?.totalPrestige) ||
        toNumber(totals?.prestige) ||
        toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);

      const directPrestige = toNumber(totals?.directPrestige);
      const assistPrestigeReceived = toNumber(totals?.assistPrestigeReceived);
      const contracts = toNumber(totals?.contracts);
      const assists = toNumber(totals?.assists);
      const failures = toNumber(totals?.failures);
      const turns = Math.max(1, toNumber(totals?.turns));
      const turnsAtBase = toNumber(totals?.turnsAtBase);
      const score = toNumber(totals?.score);

      const entry = {
        score,
        prestige: totalPrestige,
        totalPrestige,
        directPrestige,
        assistPrestigeReceived,
        assists,
        failures,
        contracts,
        turns,
        turnsAtBase,
        allContractsEfficiency:
          contracts + assists > 0
            ? (directPrestige + assistPrestigeReceived) / (contracts + assists)
            : 0,
        assistEfficiency: assists > 0 ? assistPrestigeReceived / assists : 0,
        directEfficiency: contracts > 0 ? directPrestige / contracts : 0,
        contractSuccessRate: contracts + failures > 0 ? contracts / (contracts + failures) : 0
      };

      snapshot[playerId] = {
        ...entry,
        [statKey]: entry[statKey as keyof typeof entry] ?? 0
      };
    });

    return {
      round: index + 1,
      gameIndex: index + 1,
      label: Game ,
      snapshot
    };
  });
}

export default function ChartDetailScreen() {
  const params = useLocalSearchParams<{
    chartKey?: string | string[];
    metric?: string | string[];
    ids?: string | string[];
    playerId?: string | string[];
  }>();

  const store = useStore() as unknown as FlexibleStore;
  const normalizedChartKey = normalizeChartKey(params.chartKey);
  const requestedMetric = getParam(params.metric);
  const selectedIdsFromRoute = getParamList(params.ids);
  const routePlayerId = getParam(params.playerId);

  const allGames = useMemo(() => collectGamesFromStore(store), [store]);
  const resolvedPlayers = useMemo(() => resolveAllGamesToPlayers(allGames as any), [allGames]);

  const safeInitialMetricKey: MetricKey =
    METRIC_OPTIONS.some((option) => option.key === requestedMetric)
      ? (requestedMetric as MetricKey)
      : 'totalPrestige';

  const [metricKey, setMetricKey] = useState<MetricKey>(safeInitialMetricKey);

  const selectedPlayerIds = useMemo(() => {
    const ids = [...selectedIdsFromRoute];
    if (routePlayerId && !ids.includes(routePlayerId)) {
      ids.unshift(routePlayerId);
    }
    return ids;
  }, [routePlayerId, selectedIdsFromRoute]);

  const visiblePlayersForLine = useMemo(() => {
    if (selectedPlayerIds.length > 0) {
      return resolvedPlayers.filter((player) =>
        selectedPlayerIds.includes(String(player.id ?? ''))
      );
    }
    return resolvedPlayers;
  }, [resolvedPlayers, selectedPlayerIds]);
console.log('CHARTKEY reached');
console.log('buildChartData runtime =', buildChartData);
console.log('resolvedPlayers length =', resolvedPlayers.length);
console.log('metricKey =', metricKey);

  const barRows = useMemo(() => {
    return buildChartData(resolvedPlayers, {
      mode: 'raw',
      metricKey,
      includeZeros: true,
      topN: null,
      sortDirection: 'desc'
    }).rows;
  }, [resolvedPlayers, metricKey]);

  const lineTimeline = useMemo(() => {
    return buildHistoryTimeline(allGames, resolvedPlayers, metricKey);
  }, [allGames, resolvedPlayers, metricKey]);

  const pageTitle = titleCase(normalizedChartKey);
  const unsupported = !['bar-chart', 'line-chart', 'multi-line-chart'].includes(normalizedChartKey);

  return (
    <View style={styles.screen}>
      <StarryNight />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          <Text style={styles.metaText}>Data source: normalized imported + saved games</Text>
        </View>

        <View style={styles.metricPanel}>
          <Text style={styles.metricPanelTitle}>Choose metric</Text>
          <View style={styles.metricGrid}>
            {METRIC_OPTIONS.map((option) => {
              const active = metricKey === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.metricTile, active && styles.metricTileActive]}
                  onPress={() => setMetricKey(option.key)}
                >
                  <Text
                    style={[styles.metricTileText, active && styles.metricTileTextActive]}
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {unsupported ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chart not rewired in this locked file yet</Text>
            <Text style={styles.emptyText}>
              This version safely supports Bar Chart, Line Chart, and Multi-Line Chart.
            </Text>
          </View>
        ) : null}

        {normalizedChartKey === 'bar-chart' ? (
          <View style={styles.chartCard}>
            <BarChart data={barRows} title={${titleCase(metricKey)} Bar Chart} />
          </View>
        ) : null}

        {normalizedChartKey === 'line-chart' ? (
          <View style={styles.chartCard}>
            <LineChart
              data={lineTimeline}
              players={visiblePlayersForLine}
              statKey={metricKey}
              title={${titleCase(metricKey)} Trend}
              compare={selectedPlayerIds.length > 0 ? 'selectedOnly' : 'all'}
              selectedPlayerIds={selectedPlayerIds}
            />
          </View>
        ) : null}

        {normalizedChartKey === 'multi-line-chart' ? (
          <View style={styles.chartCard}>
            <LineChart
              data={lineTimeline}
              players={visiblePlayersForLine}
              statKey={metricKey}
              title={${titleCase(metricKey)} Multi-Line Trend}
              compare={selectedPlayerIds.length > 0 ? 'selectedOnly' : 'all'}
              selectedPlayerIds={selectedPlayerIds}
            />
          </View>
        ) : null}

        {!resolvedPlayers.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No player data found</Text>
            <Text style={styles.emptyText}>Import a backup or save some games first.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05070F'
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 32
  },
  heroCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(10, 16, 31, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.18)'
  },
  pageTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900'
  },
  metaText: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4
  },
  metricPanel: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(10, 16, 31, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.18)',
    gap: 10
  },
  metricPanelTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900'
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  metricTile: {
    minWidth: '31%',
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)'
  },
  metricTileActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.24)',
    borderColor: 'rgba(196, 181, 253, 0.34)'
  },
  metricTileText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800'
  },
  metricTileTextActive: {
    color: '#FFFFFF'
  },
  chartCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 16, 31, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)'
  },
  emptyCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(8, 13, 27, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    gap: 4
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900'
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700'
  }
});
