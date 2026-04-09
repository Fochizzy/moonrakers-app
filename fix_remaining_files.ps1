# Fix remaining uploaded files for current TypeScript errors

# 1) components/charts/MultiLineChart.tsx
@'
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

type ModeOption = {
  key: LineMode;
  label: string;
  description: string;
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

const MODE_OPTIONS: readonly ModeOption[] = [
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

  const safeAllowedModes: LineMode[] = allowedModes.length ? [...allowedModes] : ['raw'];

  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(
    pointCount > 0 ? pointCount - 1 : 0,
  );
  const [selectedMode, setSelectedMode] = useState<LineMode>(initialMode);
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null);

  const activeMode: LineMode =
    safeAllowedModes.includes(selectedMode) ? selectedMode : safeAllowedModes[0] ?? 'raw';

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
          values = rawValues.map((value, index) => value - (index > 0 ? rawValues[index - 1] ?? 0 : 0));
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
            active: focusedPlayerId === entry.id,
            onPress: () =>
              setFocusedPlayerId((current) => (current === entry.id ? null : entry.id)),
          }))}
        />
      }
    >
      <ModeSelector
        selectedMode={activeMode}
        allowedModes={safeAllowedModes}
        onSelect={setSelectedMode}
      />

      <View style={styles.chartWrap}>
        <Svg width={WIDTH} height={HEIGHT}>
          <Rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={18} fill={withAlpha(chartColors.panelBgStrong, 0.98)} />

          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = PAD_T + (1 - step) * plotH;
            const value = min + range * step;

            return (
              <React.Fragment key={`grid-${step}`}>
                <Line
                  x1={PAD_L}
                  y1={y}
                  x2={WIDTH - PAD_R}
                  y2={y}
                  stroke={withAlpha(chartColors.grid, 0.55)}
                  strokeWidth={1}
                />
                <SvgText
                  x={PAD_L - 8}
                  y={y + 4}
                  fill={chartColors.textMuted}
                  fontSize={10}
                  textAnchor="end"
                >
                  {formatValue(value, activeMode)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {Array.from({ length: pointCount }, (_, index) => {
            const x =
              pointCount <= 1
                ? PAD_L + plotW / 2
                : PAD_L + (index / Math.max(pointCount - 1, 1)) * plotW;

            return (
              <React.Fragment key={`tick-${index}`}>
                <Line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={PAD_T + plotH}
                  stroke={withAlpha(chartColors.grid, 0.2)}
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={HEIGHT - 10}
                  fill={chartColors.textMuted}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {rounds[index]?.label ?? String(rounds[index]?.round ?? index + 1)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {transformedSeries.map((entry) => {
            if (!entry.values.length) return null;

            const points = entry.values.map((value, index) => {
              const x =
                pointCount <= 1
                  ? PAD_L + plotW / 2
                  : PAD_L + (index / Math.max(pointCount - 1, 1)) * plotW;
              const y = PAD_T + (1 - (value - min) / range) * plotH;
              return { x, y, value };
            });

            const path = points
              .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
              .join(' ');

            const highlighted = !focused || focused.id === entry.id;
            const stroke = entry.colorValue ?? chartColors.purple;

            return (
              <React.Fragment key={entry.id}>
                <Path
                  d={path}
                  stroke={stroke}
                  strokeWidth={highlighted ? 3 : 2}
                  fill="none"
                  opacity={highlighted ? 1 : 0.4}
                />
                {points.map((point, index) => (
                  <Circle
                    key={`${entry.id}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={index === selectedRound ? 4.5 : 3}
                    fill={stroke}
                    opacity={highlighted ? 1 : 0.35}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roundSelectorRow}
      >
        {Array.from({ length: pointCount }, (_, index) => {
          const active = index === selectedRound;
          return (
            <Pressable
              key={`round-pill-${index}`}
              onPress={() => setSelectedRoundIndex(index)}
              style={({ pressed }) => [
                styles.roundPill,
                active && styles.roundPillActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.roundPillText, active && styles.roundPillTextActive]}>
                {rounds[index]?.label ?? `R${index + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.snapshotList}>
        {transformedSeries.map((entry) => (
          <View key={`snapshot-${entry.id}`} style={styles.snapshotRow}>
            <View style={[styles.snapshotDot, { backgroundColor: entry.colorValue ?? chartColors.purple }]} />
            <Text style={styles.snapshotLabel}>
              {entry.name}: {formatValue(entry.values[selectedRound] ?? 0, activeMode)}
            </Text>
          </View>
        ))}
      </View>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorWrap: {
    gap: 8,
    marginBottom: 12,
  },
  selectorTitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  selectorRow: {
    gap: 8,
    paddingRight: 8,
  },
  selectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: withAlpha(chartColors.panelBg, 0.9),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.grid, 0.55),
  },
  selectorPillActive: {
    backgroundColor: withAlpha(chartColors.purple, 0.18),
    borderColor: withAlpha(chartColors.purple, 0.7),
  },
  selectorPillText: {
    fontSize: 12,
    color: chartColors.text,
  },
  selectorPillTextActive: {
    color: chartColors.purple,
  },
  chartWrap: {
    alignItems: 'center',
  },
  roundSelectorRow: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
    paddingRight: 8,
  },
  roundPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: withAlpha(chartColors.panelBg, 0.85),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.grid, 0.45),
  },
  roundPillActive: {
    backgroundColor: withAlpha(chartColors.blue, 0.2),
    borderColor: withAlpha(chartColors.blue, 0.7),
  },
  roundPillText: {
    fontSize: 11,
    color: chartColors.text,
  },
  roundPillTextActive: {
    color: chartColors.blue,
  },
  snapshotList: {
    gap: 6,
    marginTop: 4,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snapshotDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  snapshotLabel: {
    fontSize: 12,
    color: chartColors.textMuted,
  },
  pressed: {
    opacity: 0.8,
  },
});
'@ | Set-Content .\components\charts\MultiLineChart.tsx

# 2) components/ui/StarryNight.tsx
@'
import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type Star = {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
};

type Layer = {
  stars: Star[];
  speed: number;
};

const createStars = (count: number): Star[] =>
  Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.2 + 0.8,
    twinkleOffset: Math.random(),
  }));

export default function StarryNight({ count = 70 }: { count?: number }) {
  const layers: Layer[] = useMemo(() => {
    const l1 = Math.floor(count * 0.5);
    const l2 = Math.floor(count * 0.3);
    const l3 = count - l1 - l2;

    return [
      { stars: createStars(l1), speed: 0.15 },
      { stars: createStars(l2), speed: 0.3 },
      { stars: createStars(l3), speed: 0.5 },
    ];
  }, [count]);

  const progress = useSharedValue(0);
  const twinkle = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 24000 }), -1, false);
    twinkle.value = withRepeat(withTiming(1, { duration: 3200 }), -1, true);
  }, [progress, twinkle]);

  return (
    <View style={styles.container} pointerEvents="none">
      {layers.map((layer, i) => (
        <StarLayer
          key={`layer-${i}`}
          stars={layer.stars}
          speed={layer.speed}
          progress={progress}
          twinkle={twinkle}
        />
      ))}
    </View>
  );
}

function StarLayer({
  stars,
  speed,
  progress,
  twinkle,
}: {
  stars: Star[];
  speed: number;
  progress: SharedValue<number>;
  twinkle: SharedValue<number>;
}) {
  const animatedLayerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, height]);
    return {
      transform: [{ translateY: translateY * speed }],
    };
  });

  return (
    <Animated.View style={[styles.layer, animatedLayerStyle]}>
      {stars.map((star, j) => (
        <StarItem key={j} star={star} twinkle={twinkle} />
      ))}
    </Animated.View>
  );
}

function StarItem({
  star,
  twinkle,
}: {
  star: Star;
  twinkle: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const phase = (twinkle.value + star.twinkleOffset) % 1;
    const opacity = interpolate(
      phase,
      [0, 0.5, 1],
      [0.12, 0.35, 0.12],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#E2E8F0',
  },
});
'@ | Set-Content .\components\ui\StarryNight.tsx

# 3) utils/importedGameResolver.ts
@'
import { Game, StoredRound } from '@/store/useStore';
import { SourcePlayerLike } from '@/components/charts/core/metricSchema';

type TotalsLike = {
  score?: number;
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assists?: number;
  contracts?: number;
  failures?: number;
};

function safeNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function resolveGameToPlayers(game: Game): SourcePlayerLike[] {
  if (!game || !game.players) return [];

  return game.players.map((player) => {
    const totals = (game.totals?.[player.id] ?? {}) as TotalsLike;

    return {
      id: player.id,
      name: player.name,
      color: player.color,
      score: safeNumber(totals.score),
      totalPrestige:
        safeNumber(totals.totalPrestige) ||
        safeNumber(totals.prestige),
      directPrestige: safeNumber(totals.directPrestige),
      assistPrestigeReceived: safeNumber(totals.assistPrestigeReceived),
      assists: safeNumber(totals.assists),
      contracts: safeNumber(totals.contracts),
      failures: safeNumber(totals.failures),
      turns: safeNumber(game.roundCount) || safeNumber(game.rounds?.length),
    };
  });
}

export function resolveAllGamesToPlayers(games: Game[]): SourcePlayerLike[] {
  if (!Array.isArray(games)) return [];

  const aggregate = new Map<string, SourcePlayerLike>();

  for (const game of games) {
    const players = resolveGameToPlayers(game);

    for (const p of players) {
      const id = String(p.id ?? '');
      if (!id) continue;

      if (!aggregate.has(id)) {
        aggregate.set(id, {
          ...p,
          score: safeNumber(p.score),
          totalPrestige: safeNumber(p.totalPrestige),
          directPrestige: safeNumber(p.directPrestige),
          assistPrestigeReceived: safeNumber(p.assistPrestigeReceived),
          assists: safeNumber(p.assists),
          contracts: safeNumber(p.contracts),
          failures: safeNumber(p.failures),
          turns: safeNumber(p.turns),
        });
      } else {
        const existing = aggregate.get(id)!;
        existing.score = safeNumber(existing.score) + safeNumber(p.score);
        existing.totalPrestige = safeNumber(existing.totalPrestige) + safeNumber(p.totalPrestige);
        existing.directPrestige = safeNumber(existing.directPrestige) + safeNumber(p.directPrestige);
        existing.assistPrestigeReceived =
          safeNumber(existing.assistPrestigeReceived) + safeNumber(p.assistPrestigeReceived);
        existing.assists = safeNumber(existing.assists) + safeNumber(p.assists);
        existing.contracts = safeNumber(existing.contracts) + safeNumber(p.contracts);
        existing.failures = safeNumber(existing.failures) + safeNumber(p.failures);
        existing.turns = safeNumber(existing.turns) + safeNumber(p.turns);
      }
    }
  }

  return Array.from(aggregate.values());
}
'@ | Set-Content .\utils\importedGameResolver.ts

# 4) utils/elo/metricInsights.ts
@'
import { formatDecimal, formatElo, formatPercent } from "./eloFormatting";
import { computeMetric, EloMetricTab } from "./metricRegistry";
import { EloGameRecord } from "./eloTransforms";

export type MetricInsight = {
  tab: EloMetricTab;
  title: string;
  body: string;
  tone?: "default" | "accent" | "blue" | "green" | "amber";
};

function signedNumber(value: number, digits = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function signedElo(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}`;
}

export function buildLeaderboardInsight(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[]
): MetricInsight {
  const current = computeMetric("elo_current", rows, allRows);
  const peak = computeMetric("elo_peak", rows, allRows);
  const confidence = computeMetric("elo_confidence", rows, allRows);

  return {
    tab: "Leaderboard",
    title: "Current rating snapshot",
    body: `Current ELO is ${formatElo(current)}. Peak ELO is ${formatElo(
      peak
    )}, and the rating confidence is ${formatPercent(confidence)}.`,
    tone: confidence >= 0.6 ? "green" : "blue",
  };
}

export function buildMomentumInsight(rows: EloGameRecord[]): MetricInsight {
  const last5 = computeMetric("elo_change_last_5", rows);
  const last10 = computeMetric("elo_change_last_10", rows);
  const rollingWinRate10 = computeMetric("elo_rolling_win_rate_10", rows);
  const momentum = computeMetric("elo_momentum", rows);

  const trendText =
    last5 > 0 && last10 > 0
      ? "the player is climbing"
      : last5 < 0 && last10 < 0
        ? "the player is sliding"
        : "recent results are mixed";

  return {
    tab: "Momentum",
    title: "Recent trend",
    body: `Last 5 is ${signedElo(last5)}, last 10 is ${signedElo(
      last10
    )}, rolling win rate is ${formatPercent(
      rollingWinRate10
    )}, momentum is ${signedNumber(momentum, 1)}, and ${trendText}.`,
    tone: last5 > 0 ? "green" : last5 < 0 ? "amber" : "blue",
  };
}

export function buildSkillsInsight(rows: EloGameRecord[]): MetricInsight {
  const expectedVsActual = computeMetric("elo_expected_vs_actual", rows);
  const clutch = computeMetric("elo_clutch", rows);
  const upsetRate = computeMetric("elo_upset_rate", rows);

  return {
    tab: "Skills",
    title: "Skill signal read",
    body: `Expected vs actual is ${formatDecimal(
      expectedVsActual,
      2
    )}, upset rate is ${formatPercent(
      upsetRate
    )}, and clutch ELO contribution is ${signedElo(clutch)}.`,
    tone: expectedVsActual > 0 ? "green" : expectedVsActual < 0 ? "amber" : "blue",
  };
}

export function buildContextInsight(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  selectedOpponentId?: string | null
): MetricInsight {
  const h2hTrend = computeMetric("elo_h2h_trend", rows, allRows, { selectedOpponentId });
  const h2hLast5 = computeMetric("elo_h2h_last_5", rows, allRows, { selectedOpponentId });
  const h2hRecentWinRate = computeMetric("elo_h2h_recent_win_rate", rows, allRows, { selectedOpponentId });

  return {
    tab: "Context",
    title: "Matchup view",
    body: `Head-to-head trend is ${formatDecimal(h2hTrend, 2)}, last-5 ELO is ${formatElo(
      h2hLast5
    )}, and recent head-to-head win rate is ${formatPercent(h2hRecentWinRate)}.`,
    tone: "blue",
  };
}

export function buildProjectionInsight(rows: EloGameRecord[]): MetricInsight {
  const expectedWinProb = computeMetric("elo_expected_win_prob", rows);
  const projection5 = computeMetric("elo_projection_5", rows);
  const projection10 = computeMetric("elo_projection_10", rows);

  return {
    tab: "Projection",
    title: "Forward outlook",
    body: `Expected win probability is ${formatPercent(
      expectedWinProb
    )}, projected ELO is ${formatElo(projection5)} in 5 games and ${formatElo(
      projection10
    )} in 10 games.`,
    tone: projection5 >= 0 ? "accent" : "amber",
  };
}

export function buildMetricInsight(
  tab: EloMetricTab,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  selectedOpponentId?: string | null
): MetricInsight {
  switch (tab) {
    case "Leaderboard":
      return buildLeaderboardInsight(rows, allRows);
    case "Momentum":
      return buildMomentumInsight(rows);
    case "Skills":
      return buildSkillsInsight(rows);
    case "Context":
      return buildContextInsight(rows, allRows, selectedOpponentId);
    case "Projection":
      return buildProjectionInsight(rows);
    default:
      return { tab, title: tab, body: "No insight available.", tone: "default" };
  }
}

export function buildMetricInsights(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  selectedOpponentId?: string | null
): Record<EloMetricTab, MetricInsight> {
  return {
    Leaderboard: buildLeaderboardInsight(rows, allRows),
    Momentum: buildMomentumInsight(rows),
    Skills: buildSkillsInsight(rows),
    Context: buildContextInsight(rows, allRows, selectedOpponentId),
    Projection: buildProjectionInsight(rows),
  };
}
'@ | Set-Content .\utils\elo\metricInsights.ts

# 5) utils/elo/metricRegistry.ts
@'
import { mean, safeDivide, slope, sum } from "./eloMath";
import { EloGameRecord } from "./eloTransforms";

export type EloMetricTab =
  | "Leaderboard"
  | "Momentum"
  | "Skills"
  | "Context"
  | "Projection";

export type EloMetricFormat =
  | "number"
  | "percent"
  | "elo"
  | "rank"
  | "decimal";

export type MetricKey =
  | "elo_current"
  | "elo_peak"
  | "elo_confidence"
  | "elo_change_last_5"
  | "elo_change_last_10"
  | "elo_rolling_win_rate_10"
  | "elo_momentum"
  | "elo_expected_vs_actual"
  | "elo_clutch"
  | "elo_upset_rate"
  | "elo_h2h_trend"
  | "elo_h2h_last_5"
  | "elo_h2h_recent_win_rate"
  | "elo_expected_win_prob"
  | "elo_projection_5"
  | "elo_projection_10";

export type MetricContext = {
  selectedSeat?: number;
  selectedOpponentId?: string | null;
};

export type MetricDef = {
  key: MetricKey;
  label: string;
  tab: EloMetricTab;
  format: EloMetricFormat;
  requiredFields: string[];
  description?: string;
  compute: (
    rows: EloGameRecord[],
    allRows?: EloGameRecord[],
    context?: MetricContext
  ) => number;
};

function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function currentElo(rows: EloGameRecord[]): number {
  if (!rows.length) return 0;
  return rows[rows.length - 1]?.postGameElo ?? 0;
}

function peakElo(rows: EloGameRecord[]): number {
  return rows.length ? Math.max(...rows.map((r) => r.postGameElo || 0), 0) : 0;
}

function expectedWinProbFromRow(row: EloGameRecord): number {
  const diff = (row.preGameElo || 0) - (row.opponentAvgElo || 0);
  return 1 / (1 + Math.pow(10, -diff / 400));
}

export const metricRegistry: Record<MetricKey, MetricDef> = {
  elo_current: {
    key: "elo_current",
    label: "Current ELO",
    tab: "Leaderboard",
    format: "elo",
    requiredFields: ["postGameElo"],
    compute: (rows) => currentElo(rows),
  },
  elo_peak: {
    key: "elo_peak",
    label: "Peak ELO",
    tab: "Leaderboard",
    format: "elo",
    requiredFields: ["postGameElo"],
    compute: (rows) => peakElo(rows),
  },
  elo_confidence: {
    key: "elo_confidence",
    label: "Confidence",
    tab: "Leaderboard",
    format: "percent",
    requiredFields: ["gameId"],
    compute: (rows) => Math.min(1, rows.length / 30),
  },
  elo_change_last_5: {
    key: "elo_change_last_5",
    label: "Last 5",
    tab: "Momentum",
    format: "elo",
    requiredFields: ["eloDelta"],
    compute: (rows) => sum(lastN(rows, 5).map((r) => r.eloDelta || 0)),
  },
  elo_change_last_10: {
    key: "elo_change_last_10",
    label: "Last 10",
    tab: "Momentum",
    format: "elo",
    requiredFields: ["eloDelta"],
    compute: (rows) => sum(lastN(rows, 10).map((r) => r.eloDelta || 0)),
  },
  elo_rolling_win_rate_10: {
    key: "elo_rolling_win_rate_10",
    label: "Win Rate (10)",
    tab: "Momentum",
    format: "percent",
    requiredFields: ["win"],
    compute: (rows) => {
      const recent = lastN(rows, 10);
      return safeDivide(recent.filter((r) => r.win === 1).length, recent.length);
    },
  },
  elo_momentum: {
    key: "elo_momentum",
    label: "Momentum",
    tab: "Momentum",
    format: "number",
    requiredFields: ["postGameElo"],
    compute: (rows) => {
      if (rows.length < 2) return 0;
      return slope(
        rows.map((_, i) => i + 1),
        rows.map((r) => r.postGameElo || 0)
      );
    },
  },
  elo_expected_vs_actual: {
    key: "elo_expected_vs_actual",
    label: "Expected vs Actual",
    tab: "Skills",
    format: "decimal",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) =>
      mean(rows.map((r) => (r.win ? 1 : 0) - expectedWinProbFromRow(r))),
  },
  elo_clutch: {
    key: "elo_clutch",
    label: "Clutch",
    tab: "Skills",
    format: "elo",
    requiredFields: ["win", "eloDelta"],
    compute: (rows) =>
      sum(rows.filter((r) => r.win === 1).map((r) => r.eloDelta || 0)),
  },
  elo_upset_rate: {
    key: "elo_upset_rate",
    label: "Upset Rate",
    tab: "Skills",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) =>
      safeDivide(
        rows.filter((r) => r.win === 1 && (r.preGameElo || 0) < (r.opponentAvgElo || 0)).length,
        rows.length
      ),
  },
  elo_h2h_trend: {
    key: "elo_h2h_trend",
    label: "H2H Trend",
    tab: "Context",
    format: "number",
    requiredFields: ["playerId", "opponentIds", "postGameElo"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      const playerId = rows[0]?.playerId;
      if (!opponentId || !playerId || !allRows?.length) return 0;

      const h2h = allRows.filter(
        (r) => r.playerId === playerId && Array.isArray(r.opponentIds) && r.opponentIds.includes(opponentId)
      );
      if (h2h.length < 2) return 0;

      return slope(
        h2h.map((_, i) => i + 1),
        h2h.map((r) => r.postGameElo || 0)
      );
    },
  },
  elo_h2h_last_5: {
    key: "elo_h2h_last_5",
    label: "H2H Last 5",
    tab: "Context",
    format: "elo",
    requiredFields: ["playerId", "opponentIds", "eloDelta"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      const playerId = rows[0]?.playerId;
      if (!opponentId || !playerId || !allRows?.length) return 0;

      const h2h = allRows.filter(
        (r) => r.playerId === playerId && Array.isArray(r.opponentIds) && r.opponentIds.includes(opponentId)
      );

      return sum(lastN(h2h, 5).map((r) => r.eloDelta || 0));
    },
  },
  elo_h2h_recent_win_rate: {
    key: "elo_h2h_recent_win_rate",
    label: "H2H Win Rate",
    tab: "Context",
    format: "percent",
    requiredFields: ["playerId", "opponentIds", "win"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      const playerId = rows[0]?.playerId;
      if (!opponentId || !playerId || !allRows?.length) return 0;

      const h2h = lastN(
        allRows.filter(
          (r) => r.playerId === playerId && Array.isArray(r.opponentIds) && r.opponentIds.includes(opponentId)
        ),
        5
      );

      return safeDivide(h2h.filter((r) => r.win === 1).length, h2h.length);
    },
  },
  elo_expected_win_prob: {
    key: "elo_expected_win_prob",
    label: "Expected Win %",
    tab: "Projection",
    format: "percent",
    requiredFields: ["preGameElo", "opponentAvgElo"],
    compute: (rows) => mean(rows.map(expectedWinProbFromRow)),
  },
  elo_projection_5: {
    key: "elo_projection_5",
    label: "Projection (5)",
    tab: "Projection",
    format: "elo",
    requiredFields: ["postGameElo", "eloDelta"],
    compute: (rows) =>
      currentElo(rows) + ((rows[rows.length - 1]?.eloDelta ?? 0) * 5),
  },
  elo_projection_10: {
    key: "elo_projection_10",
    label: "Projection (10)",
    tab: "Projection",
    format: "elo",
    requiredFields: ["postGameElo", "eloDelta"],
    compute: (rows) =>
      currentElo(rows) + ((rows[rows.length - 1]?.eloDelta ?? 0) * 10),
  },
};

export const metricOrderByTab: Record<EloMetricTab, MetricKey[]> = {
  Leaderboard: ["elo_current", "elo_peak", "elo_confidence"],
  Momentum: ["elo_change_last_5", "elo_change_last_10", "elo_rolling_win_rate_10", "elo_momentum"],
  Skills: ["elo_expected_vs_actual", "elo_clutch", "elo_upset_rate"],
  Context: ["elo_h2h_trend", "elo_h2h_last_5", "elo_h2h_recent_win_rate"],
  Projection: ["elo_expected_win_prob", "elo_projection_5", "elo_projection_10"],
};

export function getMetricsForTab(tab: EloMetricTab): MetricDef[] {
  return metricOrderByTab[tab].map((key) => metricRegistry[key]);
}

export function computeMetric(
  key: MetricKey,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): number {
  return metricRegistry[key]?.compute(rows, allRows, context) ?? 0;
}
'@ | Set-Content .\utils\elo\metricRegistry.ts

# 6) utils/elo/metricCards.ts
@'
import { EloMetricTab, MetricContext } from "./metricRegistry";
import { PresentedMetric, presentMetric, presentMetricsForTab } from "./metricPresenter";
import { EloGameRecord } from "./eloTransforms";

export type MetricCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "blue" | "green" | "amber";
};

export type MetricCardSection = {
  key: string;
  title: string;
  tab: EloMetricTab;
  cards: MetricCard[];
};

function toneForMetric(key: string): MetricCard["tone"] {
  if (key.includes("projection") || key.includes("confidence")) return "accent";
  if (key.includes("win_rate") || key.includes("momentum")) return "green";
  if (key.includes("expected") || key.includes("h2h")) return "blue";
  if (key.includes("clutch") || key.includes("upset")) return "amber";
  return "default";
}

function subForMetric(metric: PresentedMetric): string | undefined {
  switch (metric.key) {
    case "elo_current":
      return "Live rating";
    case "elo_peak":
      return "Best rating reached";
    case "elo_change_last_5":
      return "Recent 5-game change";
    case "elo_change_last_10":
      return "Recent 10-game change";
    case "elo_momentum":
      return "Weighted recent trend";
    case "elo_expected_vs_actual":
      return "Expected finish vs actual";
    case "elo_clutch":
      return "Wins contribution";
    case "elo_upset_rate":
      return "Wins as underdog";
    case "elo_h2h_trend":
      return "Positive means the matchup is improving";
    case "elo_h2h_last_5":
      return "Combined ELO change in last 5 shared games";
    case "elo_h2h_recent_win_rate":
      return "Win rate in last 5 shared games";
    case "elo_expected_win_prob":
      return "Average pre-game win chance";
    case "elo_projection_10":
      return "Projected 10 games out";
    default:
      return metric.description;
  }
}

function metricToCard(metric: PresentedMetric): MetricCard {
  return {
    key: metric.key,
    label: metric.label,
    value: metric.displayValue,
    sub: subForMetric(metric),
    tone: toneForMetric(metric.key),
  };
}

export function buildMetricCardsForTab(
  tab: EloMetricTab,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  return presentMetricsForTab(tab, rows, allRows, context).map(metricToCard);
}

export function buildMetricCardSection(
  tab: EloMetricTab,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCardSection {
  return {
    key: tab.toLowerCase(),
    title: tab,
    tab,
    cards: buildMetricCardsForTab(tab, rows, allRows, context),
  };
}

export function buildMetricCardSections(
  tabs: EloMetricTab[],
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCardSection[] {
  return tabs.map((tab) => buildMetricCardSection(tab, rows, allRows, context));
}

export function buildTopMetricCards(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  const keys = [
    "elo_current",
    "elo_peak",
    "elo_change_last_10",
    "elo_projection_10",
  ] as const;

  return keys.map((key) => metricToCard(presentMetric(key, rows, allRows, context)));
}

export function buildCompactLeaderboardCards(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  const keys = ["elo_current", "elo_peak", "elo_confidence"] as const;
  return keys.map((key) => metricToCard(presentMetric(key, rows, allRows, context)));
}

export function buildMomentumCards(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  const keys = [
    "elo_change_last_5",
    "elo_change_last_10",
    "elo_rolling_win_rate_10",
    "elo_momentum",
  ] as const;

  return keys.map((key) => metricToCard(presentMetric(key, rows, allRows, context)));
}

export function buildSkillCards(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  const keys = [
    "elo_expected_vs_actual",
    "elo_clutch",
    "elo_upset_rate",
  ] as const;

  return keys.map((key) => metricToCard(presentMetric(key, rows, allRows, context)));
}

export function buildContextCards(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  const keys = [
    "elo_h2h_trend",
    "elo_h2h_last_5",
    "elo_h2h_recent_win_rate",
  ] as const;

  return keys.map((key) => metricToCard(presentMetric(key, rows, allRows, context)));
}

export function buildProjectionCards(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): MetricCard[] {
  const keys = [
    "elo_expected_win_prob",
    "elo_projection_5",
    "elo_projection_10",
  ] as const;

  return keys.map((key) => metricToCard(presentMetric(key, rows, allRows, context)));
}
'@ | Set-Content .\utils\elo\metricCards.ts

# 7) utils/elo/eloTransforms.ts
@'
import { mean, safeNum } from "./eloMath";
import {
  dedupeGames,
  getAggroIndex,
  getAssistsGiven,
  getAssistsReceived,
  getClutchScore,
  getDidWin,
  getEarlyLead,
  getEfficiency,
  getFailureRate,
  getFailures,
  getFinalMargin,
  getGameId,
  getGameParticipants,
  getGameTimestamp,
  getInteractionIndex,
  getLateLead,
  getObjectivePrestige,
  getParticipantId,
  getParticipantName,
  getPostGameElo,
  getPreGameElo,
  getPrestigePerTurn,
  getScore,
  getTempoIndex,
  getTurns,
  getAttempts,
} from "./sourceResolvers";

export type EloGameRecord = {
  gameId: string;
  date: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  preGameElo: number;
  postGameElo: number;
  eloDelta: number;
  finishPosition: number;
  win: 0 | 1;
  lobbySize: number;
  seat?: number;
  opponentIds: string[];
  opponentElos: number[];
  opponentAvgElo: number;
  wasHighestRated: boolean;
  turns?: number;
  finalMargin?: number;
  score?: number;
  attempts?: number;
  failures?: number;
  efficiency?: number;
  prestigePerTurn?: number;
  objectivePrestige?: number;
  assistsGiven?: number;
  assistsReceived?: number;
  failureRate?: number;
  earlyLead?: 0 | 1;
  lateLead?: 0 | 1;
  clutchScore?: number;
  interactionIndex?: number;
  aggroIndex?: number;
  tempoIndex?: number;
};

type PreparedEntry = {
  participant: any;
  participantIndex: number;
  playerId: string;
  preGameElo: number;
  postGameElo: number;
  normalizedPreGameElo: number;
  normalizedPostGameElo: number;
  score: number;
  eloDelta: number;
  didWin: 0 | 1;
  finishPosition: number;
};

export function buildEloRecords(games: any[], players: any[]): EloGameRecord[] {
  const safeGames = dedupeGames(Array.isArray(games) ? games : []);
  const records: EloGameRecord[] = [];

  safeGames.forEach((game: any, gameIndex: number) => {
    const participants = getGameParticipants(game);
    if (!participants.length) return;

    const gameId = getGameId(game, gameIndex);
    const timestamp = getGameTimestamp(game);
    const totalsMap =
      game?.totals && typeof game.totals === "object" ? game.totals : {};
    const winnerId = String(
      game?.manualWinnerId ?? game?.selectedWinnerId ?? game?.winnerId ?? ""
    );

    let prepared = participants
      .map((participant: any, participantIndex: number): PreparedEntry | null => {
        const playerId = getParticipantId(participant);
        if (!playerId) return null;

        const totals = totalsMap?.[playerId] ?? null;
        const merged = totals ? { ...participant, ...totals } : participant;

        const preGameElo = getPreGameElo(merged);
        const postGameElo = getPostGameElo(merged);
        const score = getScore(merged);
        const didWin: 0 | 1 =
          winnerId && winnerId === playerId ? 1 : getDidWin(merged);

        let eloDelta = 0;
        let normalizedPreGameElo = preGameElo;
        let normalizedPostGameElo = postGameElo;

        if (preGameElo && postGameElo) {
          eloDelta = postGameElo - preGameElo;
        } else if (Number.isFinite(Number((merged as any)?.eloDelta))) {
          eloDelta = Number((merged as any).eloDelta);
        } else if (Number.isFinite(Number((participant as any)?.eloDelta))) {
          eloDelta = Number((participant as any).eloDelta);
        } else {
          const syntheticBase = 1000 + score * 4;
          const syntheticResultBonus =
            (didWin ? 24 : -12) +
            safeNum((merged as any)?.totalPrestige ?? (merged as any)?.score ?? score) * 0.15;

          normalizedPreGameElo = syntheticBase;
          eloDelta = syntheticResultBonus;
          normalizedPostGameElo = normalizedPreGameElo + eloDelta;
        }

        if (!normalizedPreGameElo && normalizedPostGameElo) {
          normalizedPreGameElo = normalizedPostGameElo - eloDelta;
        }
        if (!normalizedPostGameElo && normalizedPreGameElo) {
          normalizedPostGameElo = normalizedPreGameElo + eloDelta;
        }

        const rawFinishPosition = safeNum(
          (merged as any)?.rank ??
            (merged as any)?.place ??
            (merged as any)?.placement ??
            (merged as any)?.finishPosition ??
            (merged as any)?.position
        );
        const finishPosition =
          rawFinishPosition > 0 ? rawFinishPosition : didWin ? 1 : 0;

        return {
          participant: merged,
          participantIndex,
          playerId,
          preGameElo,
          postGameElo,
          normalizedPreGameElo,
          normalizedPostGameElo,
          score,
          eloDelta,
          didWin,
          finishPosition,
        };
      })
      .filter(Boolean) as PreparedEntry[];

    if (!prepared.length) return;

    const inferredWinnerId =
      winnerId ||
      [...prepared].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.playerId ||
      "";

    prepared = prepared.map((entry) => ({
      ...entry,
      didWin:
        entry.didWin ||
        (inferredWinnerId && entry.playerId === inferredWinnerId ? 1 : 0),
      finishPosition:
        entry.finishPosition > 0
          ? entry.finishPosition
          : inferredWinnerId && entry.playerId === inferredWinnerId
            ? 1
            : entry.finishPosition,
    }));

    const lobbyReferences = prepared
      .map((entry) => entry.normalizedPreGameElo || entry.normalizedPostGameElo || entry.score)
      .filter((value) => Number.isFinite(value));

    const highestLobbyRating = lobbyReferences.length ? Math.max(...lobbyReferences) : 0;

    prepared.forEach((entry) => {
      const p = entry.participant;
      const opponentEntries = prepared.filter((other) => other.playerId !== entry.playerId);

      const opponentIds = opponentEntries.map((other) => other.playerId);
      const opponentElos = opponentEntries
        .map((other) => other.normalizedPreGameElo || other.normalizedPostGameElo || other.score)
        .filter((value) => Number.isFinite(value));

      const opponentAvgElo = opponentElos.length ? mean(opponentElos) : 0;
      const myReferenceRating =
        entry.normalizedPreGameElo || entry.normalizedPostGameElo || entry.score;

      records.push({
        gameId,
        date: timestamp ? new Date(timestamp).toISOString() : "",
        timestamp,
        playerId: entry.playerId,
        playerName: getParticipantName(p, players),
        preGameElo: entry.normalizedPreGameElo || entry.preGameElo,
        postGameElo: entry.normalizedPostGameElo || entry.postGameElo,
        eloDelta: entry.eloDelta,
        finishPosition: entry.finishPosition,
        win: entry.didWin,
        lobbySize: prepared.length,
        seat: entry.participantIndex + 1,
        opponentIds,
        opponentElos,
        opponentAvgElo,
        wasHighestRated:
          highestLobbyRating > 0 && myReferenceRating >= highestLobbyRating,
        turns: getTurns(p),
        finalMargin: getFinalMargin(p),
        score: entry.score,
        attempts: getAttempts(p),
        failures: getFailures(p),
        efficiency: getEfficiency(p),
        prestigePerTurn: getPrestigePerTurn(p),
        objectivePrestige: getObjectivePrestige(p),
        assistsGiven: getAssistsGiven(p),
        assistsReceived: getAssistsReceived(p),
        failureRate: getFailureRate(p),
        earlyLead: getEarlyLead(p),
        lateLead: getLateLead(p),
        clutchScore: getClutchScore(p),
        interactionIndex: getInteractionIndex(p),
        aggroIndex: getAggroIndex(p),
        tempoIndex: getTempoIndex(p),
      });
    });
  });

  return records.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.gameId !== b.gameId) return a.gameId.localeCompare(b.gameId);
    return a.playerId.localeCompare(b.playerId);
  });
}
'@ | Set-Content .\utils\elo\eloTransforms.ts

# 8) utils/compareHelpers.ts targeted fixes
$comparePath = ".\utils\compareHelpers.ts"
$compare = Get-Content $comparePath -Raw

$compare = $compare -replace 'playerOverall\.assistPrestigeReceived \?\? playerOverall\.assistReceived', 'playerOverall.assistReceived'
$compare = $compare -replace 'playerOverall\.assistPrestigeSent \?\? playerOverall\.assistGiven', 'playerOverall.assistGiven'
$compare = $compare -replace 'playerOverall\.assists \?\? playerOverall\.assistGiven', 'playerOverall.assistGiven'

$compare = $compare -replace 'sent \+= Object\.values\(recipients\)\.reduce\(', 'sent += Number(Object.values(recipients).reduce('
$compare = $compare -replace '\n\s*0\s*\n\s*\);', "`n      0`n    ));"

Set-Content $comparePath $compare

Write-Host "Fixed remaining uploaded files."
