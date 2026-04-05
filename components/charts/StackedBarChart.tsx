import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import Text from '@/components/ui/Text';
import ChartLegend from './ChartLegend';
import ChartShell from './ChartShell';
import { chartColors, withAlpha } from '@/utils/chartTheme';
import type { EnrichedPlayerStats } from '@/utils/playerDerivedStats';

const WIDTH = 340;
const ROW_H = 56;
const PAD_X = 12;
const LABEL_W = 108;
const VALUE_W = 56;
const BAR_H = 12;
const BAR_RADIUS = 6;
const MIN_VISIBLE_SEGMENT_W = 4;

type Segment = {
  key: string;
  label: string;
  value: number;
  color?: string;
};

type Row = {
  id: string;
  label: string;
  color?: string;
  segments: Segment[];
};

type Player = {
  id: string;
  name: string;
  color?: string;
};

type StackMode =
  | 'rawPrestigeComposition'
  | 'prestigePerGame'
  | 'prestigePerRound'
  | 'perContract'
  | 'assistRatesPerGame'
  | 'contractFailureRatio';

type Props = {
  data?: Row[];
  players?: Player[];
  metricPlayers?: EnrichedPlayerStats[];
  initialMode?: StackMode;
  allowedModes?: StackMode[];
  initiallySelectedRowId?: string | null;
  title?: string;
  subtitle?: string;
  maxItems?: number;
  emptyText?: string;
};

type BuiltRow = {
  id: string;
  label: string;
  total: number;
  baseColor: string;
  segments: Segment[];
};

type ModeOption = {
  key: StackMode;
  label: string;
  description: string;
};

const DEFAULT_ALLOWED_MODES: StackMode[] = [
  'rawPrestigeComposition',
  'prestigePerGame',
  'prestigePerRound',
  'perContract',
  'assistRatesPerGame',
  'contractFailureRatio',
];

const MODE_OPTIONS: readonly ModeOption[] = [
  {
    key: 'rawPrestigeComposition',
    label: 'Prestige Mix',
    description: 'Split prestige into direct, objective, and assist components.',
  },
  {
    key: 'prestigePerGame',
    label: 'Per Game',
    description: 'Normalize segments per game.',
  },
  {
    key: 'prestigePerRound',
    label: 'Per Round',
    description: 'Normalize segments per round.',
  },
  {
    key: 'perContract',
    label: 'Per Contract',
    description: 'Compare production relative to contracts.',
  },
  {
    key: 'assistRatesPerGame',
    label: 'Assist Rates',
    description: 'Compare assists given and received per game.',
  },
  {
    key: 'contractFailureRatio',
    label: 'C/F Ratio',
    description: 'Compare contract volume against failures.',
  },
] as const;

const MODE_MAP: ReadonlyMap<StackMode, ModeOption> = new Map(
  MODE_OPTIONS.map((option) => [option.key, option]),
);

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clampNonNegative(value: unknown): number {
  return Math.max(0, toNumber(value));
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function getPlayerColor(color?: string): string {
  return typeof color === 'string' && color.trim() ? color : chartColors.purple;
}

function getTotal(segments: Segment[]): number {
  return segments.reduce((sum, segment) => sum + clampNonNegative(segment.value), 0);
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function truncateLabel(value: string, max = 16): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function getSegmentFallbackColor(baseColor: string, index: number): string {
  switch (index) {
    case 0:
      return baseColor;
    case 1:
      return '#f97316';
    case 2:
      return withAlpha(baseColor, 0.62);
    default:
      return withAlpha(baseColor, 0.5);
  }
}

function normalizeSegments(segments: Segment[], baseColor: string): Segment[] {
  return segments.map((segment, index) => ({
    ...segment,
    value: clampNonNegative(segment.value),
    color: segment.color ?? getSegmentFallbackColor(baseColor, index),
  }));
}

function buildMetricSegments(
  player: EnrichedPlayerStats,
  baseColor: string,
  mode: StackMode,
): Segment[] {
  const p = player as any;

  const directPrestige = clampNonNegative(p.directPrestige);
  const assistPrestigeReceived = clampNonNegative(p.assistPrestigeReceived);
  const objectivePrestige = clampNonNegative(p.objectivePrestige);
  const contracts = clampNonNegative(p.contracts);
  const failures = clampNonNegative(p.failures);
  const assistsGiven = clampNonNegative(p.assistsGiven ?? p.assists);
  const assistsReceived = clampNonNegative(p.assistsReceived);
  const gamesPlayed = Math.max(1, clampNonNegative(p.gamesPlayed));
  const roundsPlayed = Math.max(1, clampNonNegative(p.roundsPlayed ?? p.turns ?? p.totalTurns));

  switch (mode) {
    case 'prestigePerGame':
      return [
        {
          key: 'directPrestigePerGame',
          label: 'Direct / Game',
          value: safeDiv(directPrestige, gamesPlayed),
          color: baseColor,
        },
        {
          key: 'objectivePrestigePerGame',
          label: 'Objectives / Game',
          value: safeDiv(objectivePrestige, gamesPlayed),
          color: '#f97316',
        },
        {
          key: 'assistPrestigePerGame',
          label: 'Assist / Game',
          value: safeDiv(assistPrestigeReceived, gamesPlayed),
          color: withAlpha(baseColor, 0.62),
        },
      ];

    case 'prestigePerRound':
      return [
        {
          key: 'directPrestigePerRound',
          label: 'Direct / Round',
          value: safeDiv(directPrestige, roundsPlayed),
          color: baseColor,
        },
        {
          key: 'objectivePrestigePerRound',
          label: 'Objectives / Round',
          value: safeDiv(objectivePrestige, roundsPlayed),
          color: '#f97316',
        },
        {
          key: 'assistPrestigePerRound',
          label: 'Assist / Round',
          value: safeDiv(assistPrestigeReceived, roundsPlayed),
          color: withAlpha(baseColor, 0.62),
        },
      ];

    case 'perContract':
      return [
        {
          key: 'directPrestigePerContract',
          label: 'Direct / Contract',
          value: safeDiv(directPrestige, contracts),
          color: baseColor,
        },
        {
          key: 'objectivePrestigePerContract',
          label: 'Objectives / Contract',
          value: safeDiv(objectivePrestige, contracts),
          color: '#f97316',
        },
        {
          key: 'assistPrestigePerContract',
          label: 'Assist / Contract',
          value: safeDiv(assistPrestigeReceived, contracts),
          color: withAlpha(baseColor, 0.62),
        },
      ];

    case 'assistRatesPerGame':
      return [
        {
          key: 'assistsGivenPerGame',
          label: 'Assists Given / Game',
          value: safeDiv(assistsGiven, gamesPlayed),
          color: baseColor,
        },
        {
          key: 'assistsReceivedPerGame',
          label: 'Assists Rec / Game',
          value: safeDiv(assistsReceived, gamesPlayed),
          color: withAlpha(baseColor, 0.62),
        },
      ];

    case 'contractFailureRatio':
      return [
        { key: 'contracts', label: 'Contracts', value: contracts, color: baseColor },
        { key: 'failures', label: 'Failures', value: failures, color: '#ef4444' },
      ];

    case 'rawPrestigeComposition':
    default:
      return [
        {
          key: 'directPrestige',
          label: 'Direct Prestige',
          value: directPrestige,
          color: baseColor,
        },
        {
          key: 'objectivePrestige',
          label: 'Objective Prestige',
          value: objectivePrestige,
          color: '#f97316',
        },
        {
          key: 'assistPrestigeReceived',
          label: 'Assist Prestige',
          value: assistPrestigeReceived,
          color: withAlpha(baseColor, 0.62),
        },
      ];
  }
}

function buildRowsFromMetricPlayers(
  metricPlayers: EnrichedPlayerStats[],
  mode: StackMode,
  maxItems: number,
): BuiltRow[] {
  return [...metricPlayers]
    .map((player) => {
      const p = player as any;
      const id = String(p.id ?? '');
      const label = String(p.name ?? 'Unknown');
      const baseColor = getPlayerColor(p.color);
      const segments = normalizeSegments(buildMetricSegments(player, baseColor, mode), baseColor);

      return {
        id,
        label,
        baseColor,
        segments,
        total: getTotal(segments),
      };
    })
    .filter((row) => row.id.length > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, maxItems);
}

function buildRowsFromData(data: Row[], players: Player[], maxItems: number): BuiltRow[] {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return [...data]
    .map((row) => {
      const player = playerMap.get(row.id);
      const baseColor = getPlayerColor(player?.color ?? row.color);
      const segments = normalizeSegments(row.segments ?? [], baseColor);

      return {
        id: row.id,
        label: row.label ?? player?.name ?? 'Unknown',
        baseColor,
        segments,
        total: getTotal(segments),
      };
    })
    .filter((row) => row.id.length > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, maxItems);
}

function resolveAllowedModes(
  allowedModes: StackMode[] | undefined,
  initialMode: StackMode,
): StackMode[] {
  const safeAllowedModes =
    allowedModes && allowedModes.length > 0 ? allowedModes : DEFAULT_ALLOWED_MODES;

  return safeAllowedModes.includes(initialMode) ? safeAllowedModes : safeAllowedModes;
}

function getInitialSelectedMode(
  allowedModes: StackMode[],
  initialMode: StackMode,
): StackMode {
  return allowedModes.includes(initialMode) ? initialMode : allowedModes[0];
}

function resolveSelectedRow(
  rows: BuiltRow[],
  controlledSelectedRowId: string | null | undefined,
  internalSelectedRowId: string | null,
): BuiltRow | null {
  if (!rows.length) return null;

  const targetId = controlledSelectedRowId ?? internalSelectedRowId;
  if (targetId) {
    const match = rows.find((row) => row.id === targetId);
    if (match) return match;
  }

  return rows[0];
}

function getSegmentWidth(
  segmentValue: number,
  rowTotal: number,
  stackWidth: number,
): number {
  if (rowTotal <= 0 || segmentValue <= 0) return 0;
  return Math.max(MIN_VISIBLE_SEGMENT_W, (segmentValue / rowTotal) * stackWidth);
}

function ModeSelector({
  selectedMode,
  allowedModes,
  onSelect,
}: {
  selectedMode: StackMode;
  allowedModes: StackMode[];
  onSelect: (mode: StackMode) => void;
}) {
  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorTitle}>Mode</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorRow}
      >
        {MODE_OPTIONS.filter((option) => allowedModes.includes(option.key)).map((mode) => {
          const active = mode.key === selectedMode;

          return (
            <Pressable
              key={mode.key}
              onPress={() => onSelect(mode.key)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.selectorPill,
                active && styles.selectorPillActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.selectorPillText, active && styles.selectorPillTextActive]}>
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function StackedBarChart({
  data = [],
  players = [],
  metricPlayers = [],
  initialMode = 'prestigePerGame',
  allowedModes,
  initiallySelectedRowId = null,
  title = 'Stacked Bar Chart',
  subtitle = 'Composition of a total across multiple stat segments.',
  maxItems = 12,
  emptyText = 'No stacked chart data available.',
}: Props) {
  const safeAllowedModes = useMemo(
    () => resolveAllowedModes(allowedModes, initialMode),
    [allowedModes, initialMode],
  );

  const [selectedMode, setSelectedMode] = useState<StackMode>(() =>
    getInitialSelectedMode(safeAllowedModes, initialMode),
  );
  const [internalSelectedRowId, setInternalSelectedRowId] = useState<string | null>(
    initiallySelectedRowId,
  );

  useEffect(() => {
    setInternalSelectedRowId(initiallySelectedRowId ?? null);
  }, [initiallySelectedRowId]);

  const activeMode = safeAllowedModes.includes(selectedMode)
    ? selectedMode
    : safeAllowedModes[0];

  const selectedModeInfo = MODE_MAP.get(activeMode) ?? MODE_OPTIONS[0];

  const rows = useMemo(() => {
    if (metricPlayers.length > 0) {
      return buildRowsFromMetricPlayers(metricPlayers, activeMode, maxItems);
    }
    return buildRowsFromData(data, players, maxItems);
  }, [metricPlayers, activeMode, maxItems, data, players]);

  const selectedRow = useMemo(
    () => resolveSelectedRow(rows, initiallySelectedRowId, internalSelectedRowId),
    [rows, initiallySelectedRowId, internalSelectedRowId],
  );

  const maxTotal = useMemo(() => Math.max(1, ...rows.map((row) => row.total)), [rows]);

  const height = Math.max(92, rows.length * ROW_H + 14);
  const trackW = WIDTH - PAD_X * 2 - LABEL_W - VALUE_W;

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      playerColor={selectedRow?.baseColor}
      badge={selectedModeInfo.label}
      topStats={
        selectedRow
          ? [
              { label: 'Row', value: selectedRow.label },
              { label: 'Total', value: formatValue(selectedRow.total) },
              { label: 'Mode', value: selectedModeInfo.label },
              { label: 'Segments', value: String(selectedRow.segments.length) },
            ]
          : undefined
      }
      explanation={selectedModeInfo.description}
      meaning="The selected row gets the strongest glow. Segment width shows composition, not just rank."
      legend={
        <ChartLegend
          items={(selectedRow?.segments ?? []).map((segment) => ({
            key: segment.key,
            label: segment.label,
            color: segment.color ?? chartColors.subtext,
            value: formatValue(segment.value),
          }))}
        />
      }
    >
      {metricPlayers.length > 0 ? (
        <>
          <ModeSelector
            selectedMode={activeMode}
            allowedModes={safeAllowedModes}
            onSelect={setSelectedMode}
          />
          <View style={styles.metricInfoCard}>
            <Text style={styles.metricInfoTitle}>{selectedModeInfo.label}</Text>
            <Text style={styles.metricInfoText}>{selectedModeInfo.description}</Text>
          </View>
        </>
      ) : null}

      {!rows.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No data</Text>
          <Text style={styles.muted}>{emptyText}</Text>
        </View>
      ) : (
        <>
          {selectedRow ? (
            <View
              style={[
                styles.selectedCard,
                { borderColor: withAlpha(selectedRow.baseColor, 0.5) },
              ]}
            >
              <Text style={styles.selectedTitle}>{selectedRow.label}</Text>
              <Text style={styles.selectedText}>Total: {formatValue(selectedRow.total)}</Text>
              {selectedRow.segments.map((segment) => (
                <Text key={segment.key} style={styles.selectedText}>
                  {segment.label}: {formatValue(segment.value)}
                </Text>
              ))}
            </View>
          ) : null}

          <Svg width={WIDTH} height={height} style={styles.svg}>
            <Rect
              x={0}
              y={0}
              width={WIDTH}
              height={height}
              rx={14}
              fill={chartColors.bg}
              stroke={chartColors.border}
            />

            {rows.map((row, index) => {
              const y = 10 + index * ROW_H;
              const isSelected = row.id === selectedRow?.id;
              const stackW = Math.max(8, (row.total / maxTotal) * trackW);
              let cursor = PAD_X + LABEL_W;

              return (
                <G key={row.id}>
                  <Rect
                    x={PAD_X - 4}
                    y={y - 4}
                    width={WIDTH - PAD_X * 2 + 8}
                    height={ROW_H - 6}
                    rx={10}
                    fill={isSelected ? withAlpha(row.baseColor, 0.12) : 'transparent'}
                    onPress={() => setInternalSelectedRowId(row.id)}
                  />

                  <SvgText
                    x={PAD_X}
                    y={y + 17}
                    fill={chartColors.text}
                    fontSize="12"
                    fontWeight="700"
                  >
                    {truncateLabel(row.label)}
                  </SvgText>

                  <Rect
                    x={PAD_X + LABEL_W}
                    y={y + 5}
                    width={trackW}
                    height={BAR_H}
                    rx={BAR_RADIUS}
                    fill={chartColors.track}
                    onPress={() => setInternalSelectedRowId(row.id)}
                  />

                  {row.segments.map((segment) => {
                    const segmentW = getSegmentWidth(segment.value, row.total, stackW);
                    const node = (
                      <Rect
                        key={segment.key}
                        x={cursor}
                        y={y + 5}
                        width={segmentW}
                        height={BAR_H}
                        fill={segment.color}
                        opacity={isSelected ? 1 : 0.84}
                        onPress={() => setInternalSelectedRowId(row.id)}
                      />
                    );

                    cursor += segmentW;
                    return node;
                  })}

                  <SvgText
                    x={WIDTH - PAD_X}
                    y={y + 17}
                    fill={chartColors.subtext}
                    fontSize="12"
                    fontWeight="800"
                    textAnchor="end"
                  >
                    {formatValue(row.total)}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </>
      )}
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  svg: {
    alignSelf: 'center',
  },

  selectorWrap: {
    marginBottom: 10,
  },
  selectorTitle: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectorRow: {
    gap: 8,
    paddingRight: 12,
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
    backgroundColor: withAlpha(chartColors.purple, 0.18),
  },
  selectorPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  selectorPillTextActive: {
    color: chartColors.text,
  },

  metricInfoCard: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 12,
    padding: 10,
    backgroundColor: chartColors.panelBg,
    gap: 6,
    marginBottom: 10,
  },
  metricInfoTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  metricInfoText: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  selectedCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: chartColors.panelBg,
    gap: 6,
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
    color: chartColors.text,
    fontWeight: '800',
  },
  muted: {
    opacity: 0.8,
    color: chartColors.subtext,
    fontSize: 12,
  },

  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
