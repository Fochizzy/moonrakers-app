import React, { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import MultiLineChart from './MultiLineChart';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type SnapshotPoint = {
  round?: number;
  snapshot?: Record<string, any>;
};

type Player = {
  id: string;
  name: string;
  color?: string;
};

type MetricKey =
  | 'totalPrestige'
  | 'score'
  | 'directPrestige'
  | 'assistPrestigeReceived'
  | 'assists'
  | 'contracts'
  | 'failures';

type Props = {
  replay?: SnapshotPoint[];
  players?: Player[];
  statKey?: MetricKey;
  title?: string;
};

const METRICS: Array<{ key: MetricKey; label: string; meaning: string }> = [
  { key: 'totalPrestige', label: 'Total Prestige', meaning: 'Running prestige accumulation across the game.' },
  { key: 'score', label: 'Score', meaning: 'Score progression across rounds.' },
  { key: 'directPrestige', label: 'Direct Prestige', meaning: 'Only direct prestige gained each round.' },
  { key: 'assistPrestigeReceived', label: 'Assist Prestige', meaning: 'Prestige received from assists.' },
  { key: 'assists', label: 'Assists', meaning: 'Assist count over time.' },
  { key: 'contracts', label: 'Contracts', meaning: 'Contract count progression.' },
  { key: 'failures', label: 'Failures', meaning: 'Failure count progression.' },
];

function getMetricOption(metric?: string) {
  return METRICS.find((entry) => entry.key === metric) ?? METRICS[0];
}

function getPeakDisplay(replay: SnapshotPoint[], players: Player[], key: MetricKey) {
  let peak = 0;
  replay.forEach((point) => {
    players.forEach((player) => {
      const entry = point.snapshot?.[player.id];
      const value =
        typeof entry === 'number'
          ? Number(entry)
          : Number(entry?.[key] ?? 0);
      if (Number.isFinite(value)) peak = Math.max(peak, value);
    });
  });
  return peak.toFixed(1);
}

function getLeadingPlayer(replay: SnapshotPoint[], players: Player[], key: MetricKey) {
  const latest = replay[replay.length - 1]?.snapshot ?? {};
  let best: Player | null = null;
  let bestValue = -Infinity;
  players.forEach((player) => {
    const entry = latest[player.id];
    const value =
      typeof entry === 'number'
        ? Number(entry)
        : Number(entry?.[key] ?? 0);
    if (Number.isFinite(value) && value > bestValue) {
      bestValue = value;
      best = player;
    }
  });
  return best;
}

function ReplayChart({
  replay = [],
  players = [],
  statKey = 'totalPrestige',
  title = 'Replay Chart',
}: Props) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>(
    getMetricOption(statKey).key
  );

  useEffect(() => {
    setSelectedMetric(getMetricOption(statKey).key);
  }, [statKey]);

  const metric = useMemo(() => getMetricOption(selectedMetric), [selectedMetric]);
  const safeReplay = Array.isArray(replay) ? replay : [];
  const safePlayers = Array.isArray(players) ? players : [];

  const leadingPlayer = useMemo(
    () => getLeadingPlayer(safeReplay, safePlayers, metric.key),
    [safePlayers, safeReplay, metric.key]
  );

  const peakDisplay = useMemo(
    () => getPeakDisplay(safeReplay, safePlayers, metric.key),
    [safePlayers, safeReplay, metric.key]
  );

  const allowedModes =
    metric.key === 'totalPrestige'
      ? ['raw', 'cumulativePrestige', 'netGainPerRound', 'rolling3RoundAverage', 'leadMarginPerRound', 'comebackDelta', 'firstPlaceOccupancy']
      : ['raw'];

  const accentColor = leadingPlayer?.color || chartColors.purple;

  return (
    <ChartShell
      title={title}
      subtitle="Review round progression with alternate replay metrics."
      accentColor={accentColor}
      tintColor={withAlpha(accentColor, 0.12)}
      playerColor={accentColor}
      badge="Replay"
      explanation={metric.meaning}
      meaning="Choose a metric, then inspect how the game unfolded round by round."
      topStats={[
        { label: 'Metric', value: metric.label },
        { label: 'Rounds', value: String(safeReplay.length) },
        { label: 'Leader', value: leadingPlayer?.name ?? '—' },
        { label: 'Peak', value: peakDisplay },
      ]}
    >
      <View style={styles.metricRow}>
        {METRICS.map((entry) => {
          const active = entry.key === metric.key;
          return (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.metricPill,
                active && {
                  backgroundColor: withAlpha(chartColors.purple, 0.16),
                  borderColor: withAlpha(chartColors.purple, 0.45),
                },
              ]}
              onPress={() => setSelectedMetric(entry.key)}
            >
              <Text
                style={[
                  styles.metricPillText,
                  active && styles.metricPillTextActive,
                ]}
              >
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chartWrap}>
        <MultiLineChart
          data={safeReplay}
          players={safePlayers}
          statKey={metric.key}
          title={metric.label}
          subtitle={metric.meaning}
          initialMode="raw"
          allowedModes={allowedModes as any}
        />
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Selected metric</Text>
        <Text style={styles.noteText}>{metric.meaning}</Text>
      </View>
    </ChartShell>
  );
}

ReplayChart.displayName = 'ReplayChart';

export default memo(ReplayChart);

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricPill: {
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metricPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  metricPillTextActive: {
    color: chartColors.text,
  },
  chartWrap: {
    backgroundColor: chartColors.panelBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    padding: 8,
  },
  noteCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 4,
  },
  noteTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  noteText: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
});
