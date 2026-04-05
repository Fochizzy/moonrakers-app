import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import { chartColors, withAlpha, getPlayerColor } from '@/utils/chartTheme';

type HeatmapMode =
  | 'raw'
  | 'relativeToLobby'
  | 'relativeToPlayerAverage'
  | 'rank'
  | 'swing';

type SortMode =
  | 'default'
  | 'highestAvg'
  | 'lowestAvg'
  | 'highestPeak'
  | 'consistency'
  | 'latest';

type Player = {
  id: string;
  name: string;
  color?: string;
};

type SnapshotPoint = {
  round: number;
  snapshot: Record<string, any>;
};

type MatrixCell = {
  round: number;
  rawValue: number;
  displayValue: number;
  colorValue: string;
};

type MatrixRow = {
  id: string;
  name: string;
  colorValue: string;
  cells: MatrixCell[];
  avgRaw: number;
  peakRaw: number;
  latestRaw: number;
};

type SelectedCell = {
  playerId: string;
  playerName: string;
  round: number;
  rawValue: number;
  displayValue: number;
  color: string;
  mode: HeatmapMode;
};

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

const HEATMAP_LAYOUT = {
  width: 348,
  labelWidth: 92,
  cellWidth: 34,
  rowHeight: 28,
  topPad: 14,
  bottomPad: 16,
  leftPad: 10,
  rightPad: 10,
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function getModeOption(mode: HeatmapMode) {
  return MODE_OPTIONS.find((entry) => entry.key === mode) ?? MODE_OPTIONS[0];
}

function formatDisplayValue(value: number, mode: HeatmapMode): string {
  if (mode === 'rank') return `#${Math.round(value)}`;
  const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
  return `${value > 0 && mode !== 'raw' ? '+' : ''}${rounded}`;
}

function buildBaseMatrix(
  data: SnapshotPoint[],
  players: Player[],
  statKey: string,
  selectedMode: HeatmapMode,
): MatrixRow[] {
  return players.map((player) => {
    const rawValues = data.map((point) => {
      const playerSnapshot = point?.snapshot?.[player.id];
      return toNumber(playerSnapshot?.[statKey]);
    });

    const playerAverage = average(rawValues);

    const cells: MatrixCell[] = data.map((point, index) => {
      const rawValue = rawValues[index];
      const lobbyValues = players.map((entry) => {
        const playerSnapshot = point?.snapshot?.[entry.id];
        return toNumber(playerSnapshot?.[statKey]);
      });
      const lobbyAverage = average(lobbyValues);

      let displayValue = rawValue;

      if (selectedMode === 'relativeToLobby') {
        displayValue = rawValue - lobbyAverage;
      } else if (selectedMode === 'relativeToPlayerAverage') {
        displayValue = rawValue - playerAverage;
      } else if (selectedMode === 'rank') {
        const sorted = [...lobbyValues].sort((a, b) => b - a);
        const rank = sorted.findIndex((value) => value === rawValue);
        displayValue = rank >= 0 ? rank + 1 : sorted.length;
      } else if (selectedMode === 'swing') {
        const previous = index > 0 ? rawValues[index - 1] : rawValue;
        displayValue = rawValue - previous;
      }

      return {
        round: point.round ?? index + 1,
        rawValue,
        displayValue,
        colorValue: getPlayerColor(player.color),
      };
    });

    return {
      id: player.id,
      name: player.name,
      colorValue: getPlayerColor(player.color),
      cells,
      avgRaw: average(rawValues),
      peakRaw: Math.max(0, ...rawValues),
      latestRaw: rawValues.length ? rawValues[rawValues.length - 1] : 0,
    };
  });
}

function buildVisualMatrix(
  rows: MatrixRow[],
  selectedMode: HeatmapMode,
  _playerCount: number,
  selectedSort: SortMode,
): MatrixRow[] {
  const next = [...rows];

  const consistencyScore = (row: MatrixRow) => {
    if (row.cells.length <= 1) return 0;
    const values = row.cells.map((cell) => cell.rawValue);
    const avg = average(values);
    const variance =
      values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  };

  next.sort((a, b) => {
    if (selectedSort === 'highestAvg') return b.avgRaw - a.avgRaw;
    if (selectedSort === 'lowestAvg') return a.avgRaw - b.avgRaw;
    if (selectedSort === 'highestPeak') return b.peakRaw - a.peakRaw;
    if (selectedSort === 'consistency') return consistencyScore(a) - consistencyScore(b);
    if (selectedSort === 'latest') return b.latestRaw - a.latestRaw;
    return 0;
  });

  if (selectedMode === 'rank') {
    return next.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        colorValue: 'rgba(59,130,246,0.78)',
      })),
    }));
  }

  return next;
}

function cellFill(mode: HeatmapMode, value: number): string {
  if (mode === 'rank') {
    const opacity = Math.max(0.18, Math.min(0.82, 0.9 - value * 0.12));
    return `rgba(59,130,246,${opacity})`;
  }

  if (Math.abs(value) < 0.0001) return 'rgba(255,255,255,0.08)';

  const opacity = Math.max(0.12, Math.min(0.82, Math.abs(value) / 10));
  return value >= 0
    ? `rgba(34,197,94,${opacity})`
    : `rgba(239,68,68,${opacity})`;
}

function Selector<T extends string>({
  title,
  options,
  selectedKey,
  onSelect,
}: {
  title: string;
  options: readonly { key: T; label: string }[];
  selectedKey: T;
  onSelect: (key: T) => void;
}) {
  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorRow}
      >
        {options.map((option) => {
          const active = option.key === selectedKey;

          return (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={({ pressed }) => [
                styles.selectorPill,
                active && styles.selectorPillActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.selectorPillText, active && styles.selectorPillTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HeatmapGrid({
  dataLength,
  matrix,
  selectedCell,
  selectedMode,
  onSelectCell,
}: {
  dataLength: number;
  matrix: MatrixRow[];
  selectedCell: SelectedCell | null;
  selectedMode: HeatmapMode;
  onSelectCell: (cell: SelectedCell) => void;
}) {
  const width =
    HEATMAP_LAYOUT.leftPad +
    HEATMAP_LAYOUT.labelWidth +
    dataLength * HEATMAP_LAYOUT.cellWidth +
    HEATMAP_LAYOUT.rightPad;

  const height =
    HEATMAP_LAYOUT.topPad +
    matrix.length * HEATMAP_LAYOUT.rowHeight +
    HEATMAP_LAYOUT.bottomPad;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={width} height={height}>
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={14}
          fill={chartColors.panelBg}
          stroke={chartColors.borderStrong}
        />

        {Array.from({ length: dataLength }).map((_, index) => {
          const x =
            HEATMAP_LAYOUT.leftPad +
            HEATMAP_LAYOUT.labelWidth +
            index * HEATMAP_LAYOUT.cellWidth +
            HEATMAP_LAYOUT.cellWidth / 2;

          return (
            <SvgText
              key={`header-${index}`}
              x={x}
              y={12}
              fill={chartColors.subtext}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {index + 1}
            </SvgText>
          );
        })}

        {matrix.map((row, rowIndex) => {
          const rowY =
            HEATMAP_LAYOUT.topPad + rowIndex * HEATMAP_LAYOUT.rowHeight;

          return (
            <React.Fragment key={row.id}>
              <SvgText
                x={HEATMAP_LAYOUT.leftPad}
                y={rowY + 17}
                fill={chartColors.text}
                fontSize="11"
                fontWeight="700"
              >
                {row.name}
              </SvgText>

              {row.cells.map((cell, cellIndex) => {
                const x =
                  HEATMAP_LAYOUT.leftPad +
                  HEATMAP_LAYOUT.labelWidth +
                  cellIndex * HEATMAP_LAYOUT.cellWidth;
                const selected =
                  selectedCell?.playerId === row.id &&
                  selectedCell?.round === cell.round;

                return (
                  <React.Fragment key={`${row.id}-${cell.round}`}>
                    <Rect
                      x={x}
                      y={rowY}
                      width={HEATMAP_LAYOUT.cellWidth - 4}
                      height={HEATMAP_LAYOUT.rowHeight - 4}
                      rx={6}
                      fill={cellFill(selectedMode, cell.displayValue)}
                      stroke={
                        selected
                          ? withAlpha(row.colorValue, 0.85)
                          : 'rgba(255,255,255,0.06)'
                      }
                      strokeWidth={selected ? 2 : 1}
                      onPress={() =>
                        onSelectCell({
                          playerId: row.id,
                          playerName: row.name,
                          round: cell.round,
                          rawValue: cell.rawValue,
                          displayValue: cell.displayValue,
                          color: row.colorValue,
                          mode: selectedMode,
                        })
                      }
                    />
                    <SvgText
                      x={x + (HEATMAP_LAYOUT.cellWidth - 4) / 2}
                      y={rowY + 17}
                      fill={chartColors.text}
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {selectedMode === 'rank'
                        ? String(Math.round(cell.displayValue))
                        : Math.abs(cell.displayValue) >= 100
                        ? cell.displayValue.toFixed(0)
                        : cell.displayValue.toFixed(1)}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
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
    if (!safeAllowedModes.includes(selectedMode)) {
      setSelectedMode(safeAllowedModes[0]);
    }
  }, [safeAllowedModes, selectedMode]);

  const modeOptions = useMemo(
    () => MODE_OPTIONS.filter((option) => safeAllowedModes.includes(option.key)),
    [safeAllowedModes]
  );

  const baseMatrix = useMemo(
    () => buildBaseMatrix(data, players, statKey, selectedMode),
    [data, players, statKey, selectedMode]
  );

  const matrix = useMemo<MatrixRow[]>(
    () => buildVisualMatrix(baseMatrix, selectedMode, players.length, selectedSort),
    [baseMatrix, selectedMode, players.length, selectedSort]
  );

  useEffect(() => {
    if (!selectedCell) return;

    const row = matrix.find((entry) => entry.id === selectedCell.playerId);
    const cell = row?.cells.find((entry) => entry.round === selectedCell.round);

    if (!row || !cell) {
      setSelectedCell(null);
      return;
    }

    const nextSelectedCell: SelectedCell = {
      playerId: row.id,
      playerName: row.name,
      round: cell.round,
      rawValue: cell.rawValue,
      displayValue: cell.displayValue,
      color: row.colorValue,
      mode: selectedMode,
    };

    const unchanged =
      selectedCell.playerId === nextSelectedCell.playerId &&
      selectedCell.round === nextSelectedCell.round &&
      selectedCell.rawValue === nextSelectedCell.rawValue &&
      selectedCell.displayValue === nextSelectedCell.displayValue &&
      selectedCell.color === nextSelectedCell.color &&
      selectedCell.mode === nextSelectedCell.mode &&
      selectedCell.playerName === nextSelectedCell.playerName;

    if (!unchanged) {
      setSelectedCell(nextSelectedCell);
    }
  }, [matrix, selectedCell, selectedMode]);

  const isEmpty = !players.length || !data.length;
  const selectedModeInfo = getModeOption(selectedMode);
  const selectedRowColor = selectedCell?.color ?? chartColors.purple;

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      playerColor={selectedRowColor}
      badge={selectedCell ? `Round ${selectedCell.round}` : selectedModeInfo.label}
      topStats={
        selectedCell
          ? [
              { label: 'Player', value: selectedCell.playerName },
              { label: 'Raw', value: selectedCell.rawValue.toFixed(1) },
              {
                label: 'Display',
                value: formatDisplayValue(selectedCell.displayValue, selectedCell.mode),
              },
              { label: 'Mode', value: selectedModeInfo.label },
            ]
          : !isEmpty
          ? [
              { label: 'Players', value: String(players.length) },
              { label: 'Rounds', value: String(data.length) },
              { label: 'Mode', value: selectedModeInfo.label },
              { label: 'Sort', value: selectedSort },
            ]
          : undefined
      }
      explanation="Each row is a player and each column is a round. The active mode changes what each cell means, while sorting surfaces dominant, volatile, or late-surging players faster."
      meaning="Green trends positive, red trends negative, blue is used for rank mode."
      legend={
        <ChartLegend
          items={
            selectedMode === 'rank'
              ? [
                  { key: 'best', label: 'Best rank', color: 'rgba(59,130,246,0.78)' },
                  { key: 'mid', label: 'Mid rank', color: 'rgba(59,130,246,0.45)' },
                  { key: 'low', label: 'Lower rank', color: 'rgba(59,130,246,0.22)' },
                ]
              : [
                  { key: 'positive', label: 'Positive', color: 'rgba(34,197,94,0.78)' },
                  { key: 'negative', label: 'Negative', color: 'rgba(239,68,68,0.78)' },
                  { key: 'neutral', label: 'Near zero', color: 'rgba(255,255,255,0.10)' },
                ]
          }
        />
      }
    >
      <Selector<HeatmapMode>
        title="Mode"
        options={modeOptions}
        selectedKey={selectedMode}
        onSelect={setSelectedMode}
      />

      <Selector<SortMode>
        title="Sort"
        options={SORT_OPTIONS}
        selectedKey={selectedSort}
        onSelect={setSelectedSort}
      />

      {selectedCell ? (
        <View style={[styles.selectedCard, { borderColor: withAlpha(selectedCell.color, 0.5) }]}>
          <Text style={styles.selectedTitle}>{selectedCell.playerName}</Text>
          <Text style={styles.selectedText}>
            Round {selectedCell.round} · Raw {selectedCell.rawValue.toFixed(1)} · Display{' '}
            {formatDisplayValue(selectedCell.displayValue, selectedCell.mode)}
          </Text>

          <Pressable
            onPress={() => setSelectedCell(null)}
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
          >
            <Text style={styles.clearButtonText}>Clear selection</Text>
          </Pressable>
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No heatmap data</Text>
          <Text style={styles.emptyText}>
            Add players and round snapshots to render this stat heatmap.
          </Text>
        </View>
      ) : (
        <HeatmapGrid
          dataLength={data.length}
          matrix={matrix}
          selectedCell={selectedCell}
          selectedMode={selectedMode}
          onSelectCell={setSelectedCell}
        />
      )}
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorWrap: { marginBottom: 10 },
  selectorTitle: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectorRow: { gap: 8, paddingRight: 12 },

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
    backgroundColor: withAlpha(chartColors.purple, 0.16),
  },
  selectorPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  selectorPillTextActive: {
    color: chartColors.text,
  },

  selectedCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: chartColors.panelBg,
    gap: 8,
    marginBottom: 10,
  },
  selectedTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },

  clearButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearButtonText: {
    color: chartColors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 12,
    padding: 12,
    backgroundColor: chartColors.panelBg,
  },
  emptyTitle: {
    color: chartColors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },

  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
