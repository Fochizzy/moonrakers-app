import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import EloChartPlot from './EloChartPlot';
import { chartColors, withAlpha, getPlayerColor } from '@/utils/chartTheme';
import {
  MODE_OPTIONS,
  buildAnalytics,
  formatValue,
  getModeValues,
  type EloMode,
  type Game,
  type Player,
} from './eloChartUtils';
import { buildCorrelationResults, type CorrelationResult } from './advancedStats';

function ModeSelector({
  selectedMode,
  onSelect,
}: {
  selectedMode: EloMode;
  onSelect: (mode: EloMode) => void;
}) {
  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorTitle}>Mode</Text>
      <View style={styles.selectorRowWrap}>
        {MODE_OPTIONS.map((mode) => {
          const active = mode.key === selectedMode;
          return (
            <Pressable
              key={mode.key}
              onPress={() => onSelect(mode.key)}
              style={({ pressed }) => [
                styles.selectorPill,
                active && styles.selectorPillActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.selectorPillText,
                  active && styles.selectorPillTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type CompareSelectorProps = {
  players: Player[];
  selectedIds: string[];
  onToggle: (playerId: string) => void;
  onClear: () => void;
  maxSelections: number;
};

function CompareSelector({
  players,
  selectedIds,
  onToggle,
  onClear,
  maxSelections,
}: CompareSelectorProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aSelected = selectedSet.has(a.id) ? 0 : 1;
      const bSelected = selectedSet.has(b.id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });
  }, [players, selectedSet]);

  return (
    <View style={styles.compareWrap}>
      <View style={styles.compareHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.compareTitle}>Compare Players</Text>
          <Text style={styles.compareSubtitle}>
            Tap players to compare. You can select up to {maxSelections}.
          </Text>
          <Text style={styles.compareCount}>
            {selectedIds.length} selected
          </Text>
        </View>

        <Pressable
          onPress={onClear}
          disabled={selectedIds.length === 0}
          style={({ pressed }) => [
            styles.clearButton,
            selectedIds.length === 0 && styles.clearButtonDisabled,
            pressed && selectedIds.length > 0 && styles.pressed,
          ]}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.focusWrap}>
        {sortedPlayers.map((player) => {
          const active = selectedSet.has(player.id);
          const locked = !active && selectedIds.length >= maxSelections;
          const color = getPlayerColor(player.color);

          return (
            <Pressable
              key={player.id}
              onPress={() => onToggle(player.id)}
              disabled={locked}
              style={({ pressed }) => [
                styles.focusPill,
                active && {
                  borderColor: color,
                  backgroundColor: withAlpha(color, 0.18),
                },
                locked && styles.focusPillLocked,
                pressed && !locked && styles.pressed,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text
                style={[
                  styles.focusPillText,
                  active && styles.focusPillTextActive,
                  locked && styles.focusPillTextLocked,
                ]}
                numberOfLines={1}
              >
                {active ? `✓ ${player.name ?? 'Unknown'}` : player.name ?? 'Unknown'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Props = {
  games?: Game[];
  players?: Player[];
  primaryPlayerId?: string | null;
};

type PlayerCorrelationPanel = {
  playerId: string;
  playerName: string;
  colorValue: string;
  results: CorrelationResult[];
};

const MAX_COMPARE_PLAYERS = 5;

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(totals?: Record<string, unknown> | null): number {
  if (!totals) return 0;

  const explicit = totals.totalPrestige ?? totals.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(totals.directPrestige) + toNumber(totals.assistPrestigeReceived);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const meanX = average(xs);
  const meanY = average(ys);

  let numerator = 0;
  let xSpread = 0;
  let ySpread = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    xSpread += dx * dx;
    ySpread += dy * dy;
  }

  const denominator = Math.sqrt(xSpread * ySpread);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

function correlationStrength(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.8) return 'Very Strong';
  if (abs >= 0.6) return 'Strong';
  if (abs >= 0.4) return 'Moderate';
  if (abs >= 0.2) return 'Weak';
  return 'Very Weak';
}

function formatCorrelationValue(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function buildPlayerCorrelationResults(
  games: Game[] = [],
  playerId?: string
): CorrelationResult[] {
  if (!playerId) return [];

  const contracts: number[] = [];
  const assists: number[] = [];
  const failures: number[] = [];
  const prestige: number[] = [];
  const score: number[] = [];

  for (const game of games) {
    const totals = (game as any)?.totals?.[playerId];
    if (!totals) continue;

    contracts.push(toNumber(totals.contracts));
    assists.push(toNumber(totals.assists));
    failures.push(toNumber(totals.failures));
    prestige.push(getTotalPrestige(totals));
    score.push(toNumber(totals.score));
  }

  return [
    {
      label: 'Contracts vs Total Prestige',
      value: correlation(contracts, prestige),
      strength: correlationStrength(correlation(contracts, prestige)),
    },
    {
      label: 'Assists vs Total Prestige',
      value: correlation(assists, prestige),
      strength: correlationStrength(correlation(assists, prestige)),
    },
    {
      label: 'Failures vs Total Prestige',
      value: correlation(failures, prestige),
      strength: correlationStrength(correlation(failures, prestige)),
    },
    {
      label: 'Total Prestige vs Score',
      value: correlation(prestige, score),
      strength: correlationStrength(correlation(prestige, score)),
    },
  ];
}

export default function EloChart({
  games = [],
  players = [],
  primaryPlayerId = null,
}: Props) {
  const [selectedMode, setSelectedMode] = useState<EloMode>('eloDelta');
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(
    games.length > 0 ? games.length - 1 : 0
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
    primaryPlayerId ? [primaryPlayerId] : []
  );

  useEffect(() => {
    setSelectedGameIndex((current) => {
      if (!games.length) return 0;
      return Math.max(0, Math.min(current, games.length - 1));
    });
  }, [games.length]);

  useEffect(() => {
    setSelectedPlayerIds((current) => {
      const validIds = current.filter((id) =>
        players.some((player) => player.id === id)
      );

      if (validIds.length > 0) {
        return validIds.slice(0, MAX_COMPARE_PLAYERS);
      }

      if (
        primaryPlayerId &&
        players.some((player) => player.id === primaryPlayerId)
      ) {
        return [primaryPlayerId];
      }

      return [];
    });
  }, [players, primaryPlayerId]);

  const analytics = useMemo(
    () => buildAnalytics(games, players, selectedMode),
    [games, players, selectedMode]
  );

  const selectedModeInfo =
    MODE_OPTIONS.find((option) => option.key === selectedMode) ?? MODE_OPTIONS[0];

  const selectedIndex = Math.max(
    0,
    Math.min(selectedGameIndex, Math.max(0, games.length - 1))
  );

  const selectedSet = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds]);

  const comparedSeries = useMemo(() => {
    if (selectedPlayerIds.length === 0) {
      return [];
    }

    return analytics.series.filter((row) => selectedSet.has(row.id));
  }, [analytics.series, selectedPlayerIds.length, selectedSet]);

  const seriesPaths = useMemo(() => {
    return comparedSeries.map((row) => ({
      ...row,
      values: getModeValues(row, selectedMode),
      points: [],
      path: '',
      isFocused: true,
    }));
  }, [comparedSeries, selectedMode]);

  const globalCorrelations = useMemo(
    () => buildCorrelationResults(games as any[]),
    [games]
  );

  const specificCorrelations = useMemo<PlayerCorrelationPanel[]>(() => {
    return comparedSeries.map((row) => ({
      playerId: row.id,
      playerName: row.name ?? 'Unknown',
      colorValue: row.colorValue,
      results: buildPlayerCorrelationResults(games, row.id),
    }));
  }, [comparedSeries, games]);

  const topStats = useMemo(() => {
    if (!comparedSeries.length) return undefined;

    const currentLeader = [...comparedSeries].sort(
      (a, b) =>
        (b.eloValues[b.eloValues.length - 1] ?? 0) -
        (a.eloValues[a.eloValues.length - 1] ?? 0)
    )[0];

    const selectedValues = comparedSeries.map((row) => row.values[selectedIndex] ?? 0);
    const peakValue = Math.max(...comparedSeries.map((row) => row.summary.peakElo));
    const avgCurrent =
      comparedSeries.reduce((sum, row) => sum + row.summary.currentElo, 0) /
      comparedSeries.length;

    return [
      { label: 'Compared', value: String(comparedSeries.length) },
      { label: 'Leader', value: currentLeader?.name ?? '—' },
      { label: 'Avg Current', value: avgCurrent.toFixed(1) },
      {
        label: selectedModeInfo.label,
        value: formatValue(Math.max(...selectedValues), selectedMode),
      },
      { label: 'Peak ELO', value: peakValue.toFixed(0) },
    ];
  }, [comparedSeries, selectedIndex, selectedMode, selectedModeInfo.label]);

  const toggleSelectedPlayer = (playerId: string) => {
    setSelectedPlayerIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      if (current.length >= MAX_COMPARE_PLAYERS) {
        return current;
      }

      return [...current, playerId];
    });
  };

  return (
    <ChartShell
      title="ELO Progression"
      playerColor={comparedSeries[0]?.colorValue ?? chartColors.purple}
    >
      {!games.length || !players.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No ELO data</Text>
          <Text style={styles.muted}>
            Add games with eloSnapshot values to render rating analytics.
          </Text>
        </View>
      ) : (
        <>
          <ModeSelector selectedMode={selectedMode} onSelect={setSelectedMode} />

          <CompareSelector
            players={players}
            selectedIds={selectedPlayerIds}
            onToggle={toggleSelectedPlayer}
            onClear={() => setSelectedPlayerIds([])}
            maxSelections={MAX_COMPARE_PLAYERS}
          />

          <View style={styles.metricInfoCard}>
            <Text style={styles.metricInfoTitle}>{selectedModeInfo.label}</Text>
            <Text style={styles.metricInfoText}>{selectedModeInfo.description}</Text>
          </View>

          {!comparedSeries.length ? (
            <View style={styles.emptySelectionCard}>
              <Text style={styles.emptyTitle}>Select players to compare</Text>
              <Text style={styles.muted}>
                Nobody is forced anymore. Tap one or more players above to compare them.
              </Text>
            </View>
          ) : (
            <>
              <ChartLegend
                items={comparedSeries.map((row) => ({
                  key: row.id,
                  label: row.name ?? 'Unknown',
                  color: row.colorValue,
                  value: formatValue(row.values[selectedIndex] ?? 0, selectedMode),
                }))}
              />

              <EloChartPlot
                games={games}
                seriesPaths={seriesPaths}
                selectedIndex={selectedIndex}
                selectedMode={selectedMode}
                minValue={analytics.minValue}
                maxValue={analytics.maxValue}
                onSelectGame={setSelectedGameIndex}
              />

              <View style={styles.summaryGrid}>
                {comparedSeries.map((row) => (
                  <View
                    key={row.id}
                    style={[
                      styles.selectedCard,
                      { borderColor: withAlpha(row.colorValue, 0.55) },
                    ]}
                  >
                    <View style={styles.selectedHeaderRow}>
                      <View style={[styles.dot, { backgroundColor: row.colorValue }]} />
                      <Text style={styles.selectedTitle}>{row.name ?? 'Unknown'}</Text>
                    </View>

                    <Text style={styles.selectedText}>
                      Game {selectedIndex + 1} ·{' '}
                      {formatValue(row.values[selectedIndex] ?? 0, selectedMode)}
                    </Text>
                    <Text style={styles.selectedText}>
                      Current ELO {row.summary.currentElo.toFixed(0)} · Peak{' '}
                      {row.summary.peakElo.toFixed(0)}
                    </Text>
                    <Text style={styles.selectedText}>
                      Avg {row.summary.avgElo.toFixed(1)} · Hot Streaks{' '}
                      {row.summary.hotStreaks}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.correlationSection}>
                <Text style={styles.sectionTitle}>Global Correlations</Text>
                <Text style={styles.sectionSubtitle}>
                  Overall relationships across all recorded player-game totals.
                </Text>
                <View style={styles.correlationGrid}>
                  {globalCorrelations.map((item) => (
                    <View key={item.label} style={styles.correlationCard}>
                      <Text style={styles.correlationLabel}>{item.label}</Text>
                      <Text style={styles.correlationValue}>
                        {formatCorrelationValue(item.value)}
                      </Text>
                      <Text style={styles.correlationStrength}>{item.strength}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.correlationSection}>
                <Text style={styles.sectionTitle}>Specific Correlations</Text>
                <Text style={styles.sectionSubtitle}>
                  Per-player relationships for the current comparison set.
                </Text>
                <View style={styles.summaryGrid}>
                  {specificCorrelations.map((panel) => (
                    <View
                      key={panel.playerId}
                      style={[
                        styles.selectedCard,
                        { borderColor: withAlpha(panel.colorValue, 0.55) },
                      ]}
                    >
                      <View style={styles.selectedHeaderRow}>
                        <View
                          style={[styles.dot, { backgroundColor: panel.colorValue }]}
                        />
                        <Text style={styles.selectedTitle}>{panel.playerName}</Text>
                      </View>

                      <View style={styles.correlationList}>
                        {panel.results.map((item) => (
                          <View
                            key={`${panel.playerId}-${item.label}`}
                            style={styles.correlationRow}
                          >
                            <Text style={styles.correlationRowLabel}>
                              {item.label}
                            </Text>
                            <View style={styles.correlationRowRight}>
                              <Text style={styles.correlationRowValue}>
                                {formatCorrelationValue(item.value)}
                              </Text>
                              <Text style={styles.correlationRowStrength}>
                                {item.strength}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={styles.controls}>
            <Pressable
              onPress={() => setSelectedGameIndex((i) => Math.max(0, i - 1))}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Text style={styles.controlText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setSelectedGameIndex((i) => Math.min(games.length - 1, i + 1))
              }
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Text style={styles.controlText}>Forward</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedGameIndex(games.length - 1)}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Text style={styles.controlText}>Latest</Text>
            </Pressable>
          </View>
        </>
      )}
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorWrap: { marginBottom: 10 },
  selectorTitle: {
    color: chartColors.subtext,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '700',
  },
  selectorRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorPill: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  selectorPillActive: {
    borderColor: chartColors.purple,
    backgroundColor: withAlpha(chartColors.purple, 0.2),
  },
  selectorPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  selectorPillTextActive: { color: chartColors.text },
  compareWrap: {
    marginBottom: 10,
    gap: 8,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  compareTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  compareSubtitle: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 17,
  },
  compareCount: {
    color: chartColors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  clearButtonText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  focusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '100%',
  },
  focusPillLocked: {
    opacity: 0.38,
  },
  focusPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  focusPillTextActive: {
    color: chartColors.text,
  },
  focusPillTextLocked: {
    color: chartColors.muted,
  },
  metricInfoCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
    marginBottom: 10,
  },
  metricInfoTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  metricInfoText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  emptySelectionCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    marginBottom: 10,
  },
  summaryGrid: {
    gap: 10,
    marginTop: 12,
  },
  selectedCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    gap: 6,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  selectedText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  correlationSection: {
    marginTop: 12,
    gap: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  correlationGrid: {
    gap: 10,
  },
  correlationCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 4,
  },
  correlationLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  correlationValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  correlationStrength: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  correlationList: {
    gap: 8,
    marginTop: 2,
  },
  correlationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  correlationRowLabel: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  correlationRowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  correlationRowValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  correlationRowStrength: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '700',
  },
  controls: { flexDirection: 'row', gap: 8, marginTop: 12 },
  controlBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
  },
  controlText: { color: chartColors.subtext, fontSize: 11, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 999 },
  emptyCard: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 12,
    padding: 12,
    backgroundColor: chartColors.panelBg,
  },
  emptyTitle: {
    fontSize: 14,
    marginBottom: 4,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  muted: { opacity: 0.7, color: '#CBD5E1', fontSize: 12 },
  pressed: { transform: [{ scale: 0.98 }] },
});
