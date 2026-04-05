import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import { chartColors, getPlayerColor, withAlpha } from '@/utils/chartTheme';

const WIDTH = 340;
const HEIGHT = 268;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;

export type LineMode =
  | 'raw'
  | 'cumulativePrestige'
  | 'netGainPerRound'
  | 'rolling3RoundAverage'
  | 'leadMarginPerRound'
  | 'comebackDelta'
  | 'firstPlaceOccupancy';

export type LineChartSeries = {
  id: string;
  name: string;
  color?: string;
  values: number[];
};

export type LineChartRound = {
  round?: number;
  label?: string;
};

type Props = {
  series?: LineChartSeries[];
  rounds?: LineChartRound[];
  title?: string;
  subtitle?: string;
  initialMode?: LineMode;
  allowedModes?: LineMode[];
};

function formatValue(value: number, mode: LineMode): string {
  if (mode === 'firstPlaceOccupancy') return `${(value * 100).toFixed(1)}%`;
  if (
    mode === 'leadMarginPerRound' ||
    mode === 'netGainPerRound' ||
    mode === 'comebackDelta'
  ) {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
  }
  return value.toFixed(2);
}

function rollingAverage(values: number[], windowSize: number): number[] {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1);
    return slice.length ? slice.reduce((acc, val) => acc + val, 0) / slice.length : 0;
  });
}

function getLeaderIds(snapshot: Record<string, number>): string[] {
  const entries = Object.entries(snapshot);
  if (!entries.length) return [];
  const maxValue = Math.max(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === maxValue).map(([id]) => id);
}

const MODE_OPTIONS = [
  { key: 'cumulativePrestige', label: 'Cumulative', description: 'Running prestige total.' },
  { key: 'netGainPerRound', label: 'Net Gain', description: 'Round-by-round prestige gain.' },
  { key: 'rolling3RoundAverage', label: 'Rolling Avg', description: 'Rolling 3-round average.' },
  { key: 'leadMarginPerRound', label: 'Lead Margin', description: 'Player value minus the leader that round.' },
  { key: 'comebackDelta', label: 'Comeback Δ', description: 'Current value minus round 1 value.' },
  { key: 'firstPlaceOccupancy', label: '1st Place %', description: 'How often a player held or shared first.' },
  { key: 'raw', label: 'Raw Stat', description: 'Uses the selected stat directly.' },
] as const;

function ModeSelector({
  selectedMode,
  allowedModes,
  onSelect,
}: {
  selectedMode: LineMode;
  allowedModes: LineMode[];
  onSelect: (mode: LineMode) => void;
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

export default function MultiLineChart({
  series = [],
  rounds = [],
  title = 'Multi Line Chart',
  subtitle = 'Track multiple players over time.',
  initialMode = 'raw',
  allowedModes = ['raw'],
}: Props) {
  const pointCount = Math.max(
    rounds.length,
    ...series.map((entry) => (Array.isArray(entry.values) ? entry.values.length : 0)),
    0,
  );

  const safeAllowedModes = allowedModes.length ? allowedModes : ['raw'];

  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(
    pointCount > 0 ? pointCount - 1 : 0,
  );
  const [selectedMode, setSelectedMode] = useState<LineMode>(initialMode);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);

  const activeMode = safeAllowedModes.includes(selectedMode) ? selectedMode : safeAllowedModes[0];

  const paddedSeries = useMemo(
    () =>
      series.map((entry) => {
        const values = Array.isArray(entry.values) ? entry.values.slice(0, pointCount) : [];
        const paddedValues =
          values.length >= pointCount
            ? values
            : [...values, ...Array.from({ length: pointCount - values.length }, () => 0)];

        return {
          ...entry,
          colorValue: getPlayerColor(entry.color),
          rawValues: paddedValues.map((value) =>
            typeof value === 'number' && Number.isFinite(value) ? value : 0,
          ),
        };
      }),
    [series, pointCount],
  );

  const rawSnapshotValuesByRound = useMemo(
    () =>
      Array.from({ length: pointCount }, (_, index) => {
        const snapshot: Record<string, number> = {};
        paddedSeries.forEach((entry) => {
          snapshot[entry.id] = entry.rawValues[index] ?? 0;
        });
        return snapshot;
      }),
    [paddedSeries, pointCount],
  );

  const transformedSeries = useMemo(
    () =>
      paddedSeries.map((entry) => {
        const rawValues = entry.rawValues;
        let values = rawValues;

        if (activeMode === 'cumulativePrestige') {
          values = rawValues.map((_, index) =>
            rawValues.slice(0, index + 1).reduce((sum, value) => sum + value, 0),
          );
        }

        if (activeMode === 'netGainPerRound') {
          values = rawValues.map((value, index) => value - (index > 0 ? rawValues[index - 1] : 0));
        }

        if (activeMode === 'rolling3RoundAverage') {
          values = rollingAverage(rawValues, 3);
        }

        if (activeMode === 'leadMarginPerRound') {
          values = rawValues.map((value, index) => {
            const roundMax = Math.max(...Object.values(rawSnapshotValuesByRound[index] ?? {}), 0);
            return value - roundMax;
          });
        }

        if (activeMode === 'comebackDelta') {
          const first = rawValues[0] ?? 0;
          values = rawValues.map((value) => value - first);
        }

        if (activeMode === 'firstPlaceOccupancy') {
          let running = 0;
          values = rawValues.map((_, index) => {
            const leaderIds = getLeaderIds(rawSnapshotValuesByRound[index] ?? {});
            if (leaderIds.includes(entry.id)) running += 1;
            return running / (index + 1);
          });
        }

        return { ...entry, values };
      }),
    [activeMode, paddedSeries, rawSnapshotValuesByRound],
  );

  const allValues = transformedSeries.flatMap((entry) => entry.values);
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 1);
  const range = max - min || 1;
  const plotW = WIDTH - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;
  const safeMaxIndex = Math.max(0, pointCount - 1);
  const selectedRound = Math.max(0, Math.min(selectedRoundIndex, safeMaxIndex));
  const focused =
    focusedPlayerId != null
      ? transformedSeries.find((entry) => entry.id === focusedPlayerId) ?? null
      : null;

  const modeDescription =
    MODE_OPTIONS.find((option) => option.key === activeMode)?.description ?? 'Mode';

  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      playerColor={focused?.colorValue ?? chartColors.purple}
      badge={focused ? focused.name : 'All Players'}
      topStats={
        focused
          ? [
              { label: 'Round', value: String(selectedRound + 1) },
              { label: 'Current', value: formatValue(focused.values[selectedRound] ?? 0, activeMode) },
              { label: 'Peak', value: formatValue(Math.max(...focused.values, 0), activeMode) },
              { label: 'Player', value: focused.name },
            ]
          : [
              { label: 'Round', value: String(selectedRound + 1) },
              { label: 'Players', value: String(transformedSeries.length) },
              { label: 'Mode', value: activeMode },
              { label: 'Focus', value: 'None' },
            ]
      }
      explanation="Each line is one player over the recorded rounds. Tap a player to focus it."
      meaning={modeDescription}
      legend={
        <ChartLegend
          items={transformedSeries.map((entry) => ({
            key: entry.id,
            label: entry.name,
            color: entry.colorValue,
          }))}
          activeKey={focused?.id ?? null}
          onPressItem={setFocusedPlayerId}
        />
      }
    >
      <ModeSelector
        selectedMode={activeMode}
        allowedModes={safeAllowedModes}
        onSelect={setSelectedMode}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.focusRow}
      >
        <Pressable
          onPress={() => setFocusedPlayerId(null)}
          style={({ pressed }) => [
            styles.focusPill,
            !focused && styles.focusPillActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.focusPillText, !focused && styles.focusPillTextActive]}>
            No Focus
          </Text>
        </Pressable>

        {transformedSeries.map((entry) => {
          const active = entry.id === focused?.id;

          return (
            <Pressable
              key={entry.id}
              onPress={() => setFocusedPlayerId(entry.id)}
              style={({ pressed }) => [
                styles.focusPill,
                active && {
                  borderColor: entry.colorValue,
                  backgroundColor: withAlpha(entry.colorValue, 0.15),
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: entry.colorValue }]} />
              <Text style={[styles.focusPillText, active && { color: chartColors.text }]}>
                {entry.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.selectedCard}>
        <Text style={styles.selectedTitle}>Round {selectedRound + 1}</Text>
        {transformedSeries.map((entry) => (
          <Text
            key={entry.id}
            style={[styles.selectedText, entry.id === focused?.id && { color: entry.colorValue }]}
          >
            {entry.name}: {formatValue(entry.values[selectedRound] ?? 0, activeMode)}
          </Text>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={WIDTH} height={HEIGHT}>
          <Rect
            x={0}
            y={0}
            width={WIDTH}
            height={HEIGHT}
            rx={14}
            fill={chartColors.panelBg}
            stroke={chartColors.borderStrong}
          />
          <Line
            x1={PAD_L}
            y1={PAD_T + plotH}
            x2={WIDTH - PAD_R}
            y2={PAD_T + plotH}
            stroke={chartColors.grid}
          />
          <Line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + plotH}
            stroke={chartColors.grid}
          />

          {transformedSeries.map((entry) => {
            const points = entry.values.map((value, index) => ({
              x:
                PAD_L +
                (pointCount <= 1 ? 0 : (index / Math.max(1, pointCount - 1)) * plotW),
              y: PAD_T + plotH - ((value - min) / range) * plotH,
              value,
            }));

            const path = points
              .map((point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
              )
              .join(' ');

            const isFocused = entry.id === focused?.id;
            const opacity = focused ? (isFocused ? 1 : 0.24) : 0.92;

            return (
              <React.Fragment key={entry.id}>
                {isFocused ? (
                  <Path
                    d={path}
                    fill="none"
                    stroke={withAlpha(entry.colorValue, 0.18)}
                    strokeWidth={7}
                  />
                ) : null}
                <Path
                  d={path}
                  fill="none"
                  stroke={entry.colorValue}
                  strokeOpacity={opacity}
                  strokeWidth={isFocused ? 2.8 : 1.8}
                />
                {points.map((point, index) => (
                  <Circle
                    key={`${entry.id}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={selectedRound === index ? 4.2 : 2.6}
                    fill={
                      selectedRound === index
                        ? withAlpha(entry.colorValue, 0.9)
                        : entry.colorValue
                    }
                    opacity={opacity}
                    onPress={() => setSelectedRoundIndex(index)}
                  />
                ))}
              </React.Fragment>
            );
          })}

          {Array.from({ length: pointCount }, (_, index) => {
            const roundMeta = rounds[index];
            const label = roundMeta?.label ?? `${roundMeta?.round ?? index + 1}`;
            const x =
              PAD_L + (pointCount <= 1 ? plotW / 2 : (index / Math.max(1, pointCount - 1)) * plotW);

            return (
              <SvgText
                key={`label-${index}`}
                x={x}
                y={HEIGHT - 10}
                fill={chartColors.subtext}
                fontSize="10"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      </ScrollView>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorWrap: { marginBottom: 10 },
  selectorTitle: { color: chartColors.subtext, fontSize: 12, fontWeight: '800', marginBottom: 8 },
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
  selectorPillText: { color: chartColors.subtext, fontSize: 12, fontWeight: '800' },
  selectorPillTextActive: { color: chartColors.text },
  focusRow: { gap: 8, paddingRight: 12 },
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
  },
  focusPillActive: {
    borderColor: chartColors.purple,
    backgroundColor: withAlpha(chartColors.purple, 0.16),
  },
  focusPillText: { color: chartColors.subtext, fontSize: 12, fontWeight: '800' },
  focusPillTextActive: { color: chartColors.text },
  dot: { width: 9, height: 9, borderRadius: 999 },
  selectedCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    padding: 10,
    gap: 4,
  },
  selectedTitle: { color: chartColors.text, fontSize: 13, fontWeight: '900' },
  selectedText: { color: chartColors.subtext, fontSize: 12, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.98 }] },
});
