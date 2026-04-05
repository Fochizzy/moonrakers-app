import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import HeatmapGrid from './HeatmapGrid';
import { chartColors, withAlpha, getPlayerColor } from '@/utils/chartTheme';
import { HeatmapMode, MatrixRow, SelectedCell } from './heatmapUtils';

type SortMode = 'default' | 'highestAvg' | 'lowestAvg' | 'highestPeak' | 'consistency' | 'latest';

type Player = { id: string; name: string; color?: string };
type SnapshotPoint = { round: number; snapshot: Record<string, any> };

type Props = {
  data?: SnapshotPoint[];
  players?: Player[];
  statKey?: string;
  title?: string;
  subtitle?: string;
  initialMode?: HeatmapMode;
  allowedModes?: HeatmapMode[];
};

const MODE_OPTIONS: readonly { key: HeatmapMode; label: string }[] = [
  { key: 'raw', label: 'Raw' },
  { key: 'relativeToLobby', label: 'Relative to Lobby' },
  { key: 'relativeToPlayerAverage', label: 'Relative to Player Avg' },
  { key: 'rank', label: 'Rank' },
  { key: 'swing', label: 'Swing' },
] as const;

const SORT_OPTIONS: readonly { key: SortMode; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'highestAvg', label: 'Highest Avg' },
  { key: 'lowestAvg', label: 'Lowest Avg' },
  { key: 'highestPeak', label: 'Highest Peak' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'latest', label: 'Latest' },
] as const;

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getModeOption(mode: HeatmapMode) {
  return MODE_OPTIONS.find((entry) => entry.key === mode) ?? MODE_OPTIONS[0];
}

function formatDisplayValue(value: number, mode: HeatmapMode): string {
  if (mode === 'rank') return `#${Math.round(value)}`;
  const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
  return `${value > 0 && mode !== 'raw' ? '+' : ''}${rounded}`;
}

function buildFill(mode: HeatmapMode, value: number) {
  if (mode === 'rank') {
    const opacity = Math.max(0.18, Math.min(0.82, 0.9 - value * 0.12));
    return { fill: `rgba(59,130,246,${opacity})`, intensity: opacity };
  }
  if (Math.abs(value) < 0.0001) return { fill: 'rgba(255,255,255,0.08)', intensity: 0.12 };
  const opacity = Math.max(0.14, Math.min(0.85, Math.abs(value) / 10));
  return {
    fill: value >= 0 ? `rgba(34,197,94,${opacity})` : `rgba(239,68,68,${opacity})`,
    intensity: opacity,
  };
}

function buildBaseMatrix(data: SnapshotPoint[], players: Player[], statKey: string, selectedMode: HeatmapMode): MatrixRow[] {
  return players.map((player) => {
    const rawValues = data.map((point) => n(point?.snapshot?.[player.id]?.[statKey]));
    const playerAverage = average(rawValues);

    const cells = data.map((point, index) => {
      const rawValue = rawValues[index];
      const lobbyValues = players.map((entry) => n(point?.snapshot?.[entry.id]?.[statKey]));
      const lobbyAverage = average(lobbyValues);

      let displayValue = rawValue;
      if (selectedMode === 'relativeToLobby') displayValue = rawValue - lobbyAverage;
      else if (selectedMode === 'relativeToPlayerAverage') displayValue = rawValue - playerAverage;
      else if (selectedMode === 'rank') displayValue = [...lobbyValues].sort((a, b) => b - a).findIndex((value) => value === rawValue) + 1;
      else if (selectedMode === 'swing') displayValue = rawValue - (index > 0 ? rawValues[index - 1] : rawValue);

      const visual = buildFill(selectedMode, displayValue);
      return {
        round: point.round ?? index + 1,
        rawValue,
        displayValue,
        fill: visual.fill,
        intensity: visual.intensity,
      };
    });

    return {
      id: player.id,
      name: player.name,
      colorValue: getPlayerColor(player.color),
      averageRaw: average(rawValues),
      peakRaw: rawValues.length ? Math.max(...rawValues) : 0,
      latestRaw: rawValues.length ? rawValues[rawValues.length - 1] : 0,
      cells,
    };
  });
}

function buildVisualMatrix(rows: MatrixRow[], selectedSort: SortMode): MatrixRow[] {
  const next = [...rows];
  next.sort((a, b) => {
    if (selectedSort === 'highestAvg') return b.averageRaw - a.averageRaw;
    if (selectedSort === 'lowestAvg') return a.averageRaw - b.averageRaw;
    if (selectedSort === 'highestPeak') return b.peakRaw - a.peakRaw;
    if (selectedSort === 'consistency') return stdDev(a.cells.map((cell) => cell.rawValue)) - stdDev(b.cells.map((cell) => cell.rawValue));
    if (selectedSort === 'latest') return b.latestRaw - a.latestRaw;
    return 0;
  });
  return next;
}

export default function Heatmap({
  data = [],
  players = [],
  statKey = 'totalPrestige',
  title = 'Heatmap',
  subtitle = 'Round-by-round intensity for the selected stat.',
  initialMode = 'relativeToLobby',
  allowedModes = ['raw', 'relativeToLobby', 'relativeToPlayerAverage', 'rank', 'swing'],
}: Props) {
  const safeAllowedModes = allowedModes.length ? allowedModes : ['raw'];
  const safeInitialMode = safeAllowedModes.includes(initialMode) ? initialMode : safeAllowedModes[0];

  const [selectedMode, setSelectedMode] = useState<HeatmapMode>(safeInitialMode);
  const [selectedSort, setSelectedSort] = useState<SortMode>('default');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  useEffect(() => {
    setSelectedMode(safeInitialMode);
  }, [safeInitialMode]);

  const safePlayers = Array.isArray(players) ? players : [];
  const safeData = Array.isArray(data) ? data : [];
  const activeModes = MODE_OPTIONS.filter((option) => safeAllowedModes.includes(option.key));

  const baseMatrix = useMemo(() => buildBaseMatrix(safeData, safePlayers, statKey, selectedMode), [safeData, safePlayers, statKey, selectedMode]);
  const matrix = useMemo(() => buildVisualMatrix(baseMatrix, selectedSort), [baseMatrix, selectedSort]);

  useEffect(() => {
    if (!matrix.length || !matrix[0]?.cells?.length) {
      setSelectedCell(null);
      return;
    }
    const match = matrix.some((row) => row.id === selectedCell?.playerId && row.cells.some((cell) => cell.round === selectedCell?.round));
    if (!match) {
      const first = matrix[0];
      const firstCell = first.cells[0];
      setSelectedCell({
        playerId: first.id,
        playerName: first.name,
        round: firstCell.round,
        rawValue: firstCell.rawValue,
        displayValue: firstCell.displayValue,
        color: first.colorValue,
        mode: selectedMode,
      });
    }
  }, [matrix, selectedCell?.playerId, selectedCell?.round, selectedMode]);

  const selectedRow = matrix.find((row) => row.id === selectedCell?.playerId) ?? matrix[0] ?? null;
  const selectedCellData = selectedRow?.cells.find((cell) => cell.round === selectedCell?.round) ?? selectedRow?.cells[0] ?? null;
  const legendItems = matrix.map((row) => ({ key: row.id, label: row.name, color: row.colorValue, value: row.averageRaw.toFixed(1) }));

  if (!safeData.length || !safePlayers.length) {
    return (
      <ChartShell
        title={title}
        subtitle={subtitle}
        explanation="Each row is a player and each column is a tracked round or saved-game step."
        meaning="Positive cells mean stronger-than-baseline performance in the selected mode."
      >
        <View style={styles.emptyCard}><Text style={styles.emptyText}>Not enough data for heatmap yet.</Text></View>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      playerColor={selectedRow?.colorValue}
      badge={getModeOption(selectedMode).label}
      topStats={selectedRow && selectedCellData ? [
        { label: 'Player', value: selectedRow.name },
        { label: 'Round', value: String(selectedCellData.round) },
        { label: 'Raw', value: selectedCellData.rawValue.toFixed(1) },
        { label: 'Display', value: formatDisplayValue(selectedCellData.displayValue, selectedMode) },
      ] : undefined}
      explanation="The selected mode controls how each cell is transformed before coloring."
      meaning="Raw shows actual totals. Relative modes show over- or under-performance. Rank shows table position. Swing shows change versus the previous step."
      legend={<ChartLegend items={legendItems} activeKey={selectedRow?.id ?? null} onPressItem={(id) => {
        const row = matrix.find((entry) => entry.id === id);
        if (!row?.cells?.length) return;
        const targetCell = row.cells[0];
        setSelectedCell({ playerId: row.id, playerName: row.name, round: targetCell.round, rawValue: targetCell.rawValue, displayValue: targetCell.displayValue, color: row.colorValue, mode: selectedMode });
      }} />}
    >
      <View style={styles.selectorWrap}>
        <Text style={styles.selectorTitle}>Mode</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {activeModes.map((option) => {
            const active = option.key === selectedMode;
            return (
              <Pressable key={option.key} onPress={() => setSelectedMode(option.key)} style={[styles.selectorPill, active && styles.selectorPillActive]}>
                <Text style={[styles.selectorPillText, active && styles.selectorPillTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.selectorWrap}>
        <Text style={styles.selectorTitle}>Sort</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {SORT_OPTIONS.map((option) => {
            const active = option.key === selectedSort;
            return (
              <Pressable key={option.key} onPress={() => setSelectedSort(option.key)} style={[styles.selectorPill, active && styles.selectorPillActive]}>
                <Text style={[styles.selectorPillText, active && styles.selectorPillTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <HeatmapGrid dataLength={safeData.length} matrix={matrix} selectedCell={selectedCell} selectedMode={selectedMode} onSelectCell={setSelectedCell} />

      {selectedRow && selectedCellData ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{selectedRow.name}</Text>
          <Text style={styles.summaryText}>Round {selectedCellData.round} · raw {selectedCellData.rawValue.toFixed(1)} · display {formatDisplayValue(selectedCellData.displayValue, selectedMode)}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}><Text style={styles.summaryLabel}>Average</Text><Text style={styles.summaryValue}>{selectedRow.averageRaw.toFixed(1)}</Text></View>
            <View style={styles.summaryTile}><Text style={styles.summaryLabel}>Peak</Text><Text style={styles.summaryValue}>{selectedRow.peakRaw.toFixed(1)}</Text></View>
            <View style={styles.summaryTile}><Text style={styles.summaryLabel}>Latest</Text><Text style={styles.summaryValue}>{selectedRow.latestRaw.toFixed(1)}</Text></View>
          </View>
        </View>
      ) : null}
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorWrap: { gap: 8, marginBottom: 10 },
  selectorTitle: { color: chartColors.subtext, fontSize: 12, fontWeight: '800' },
  selectorRow: { gap: 8, paddingRight: 12 },
  selectorPill: { borderRadius: 999, borderWidth: 1, borderColor: chartColors.borderStrong, backgroundColor: chartColors.panelBg, paddingHorizontal: 12, paddingVertical: 8 },
  selectorPillActive: { borderColor: chartColors.purple, backgroundColor: withAlpha(chartColors.purple, 0.18) },
  selectorPillText: { color: chartColors.subtext, fontSize: 12, fontWeight: '800' },
  selectorPillTextActive: { color: chartColors.text },
  emptyCard: { borderRadius: 16, padding: 18, backgroundColor: chartColors.panelBg, borderWidth: 1, borderColor: chartColors.borderStrong },
  emptyText: { color: chartColors.subtext, fontSize: 13, fontWeight: '700' },
  summaryCard: { marginTop: 12, borderRadius: 16, padding: 14, backgroundColor: chartColors.panelBg, borderWidth: 1, borderColor: chartColors.borderStrong, gap: 10 },
  summaryTitle: { color: chartColors.text, fontSize: 16, fontWeight: '900' },
  summaryText: { color: chartColors.subtext, fontSize: 12, lineHeight: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryTile: { minWidth: 110, flexGrow: 1, borderRadius: 12, padding: 10, backgroundColor: withAlpha(chartColors.text, 0.04) },
  summaryLabel: { color: chartColors.subtext, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  summaryValue: { color: chartColors.text, fontSize: 15, fontWeight: '900' },
});
