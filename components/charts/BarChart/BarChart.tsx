import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ChartPlayerRow,
  MetricKey,
  MetricMode,
  METRIC_DEFINITIONS,
  EFFICIENCY_METRICS,
  RAW_METRICS,
  PER_TURN_METRICS,
} from '@/components/charts/core/metricSchema';
import { formatMetricValue, formatModeLabel } from '@/components/charts/core/chartFormatters';
import { getMetricTooltip } from '@/components/charts/core/chartTooltips';
import { withAlpha } from '@/components/charts/core/chartColors';
import { getDisplayValue } from '@/components/charts/core/buildChartData';

type Props = {
  data: ChartPlayerRow[];
  title?: string;
};

export default function BarChart({ data, title = 'Bar Chart' }: Props) {
  const [mode, setMode] = useState<MetricMode>('raw');
  const [metricKey, setMetricKey] = useState<MetricKey>('score');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [showZeros, setShowZeros] = useState(true);
  const [topN, setTopN] = useState<number>(999);
  const [pinnedPlayerId, setPinnedPlayerId] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const metricList = mode === 'efficiency'
    ? EFFICIENCY_METRICS
    : mode === 'perTurn'
      ? PER_TURN_METRICS
      : RAW_METRICS;

  const safeMetricKey = metricList.includes(metricKey) ? metricKey : metricList[0];

  const rows = useMemo(() => {
    const safeData = (Array.isArray(data) ? data : []).filter(
      (row): row is ChartPlayerRow =>
        !!row &&
        typeof row.id === 'string' &&
        typeof row.label === 'string' &&
        !!row.metrics
    );

    const filtered = showZeros
      ? safeData
      : safeData.filter((row) => getDisplayValue(row.metrics, safeMetricKey, mode) !== 0);

    const sorted = [...filtered].sort((left, right) => {
      const leftValue = getDisplayValue(left.metrics, safeMetricKey, mode);
      const rightValue = getDisplayValue(right.metrics, safeMetricKey, mode);
      const primary = sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;

      if (primary !== 0) {
        return primary;
      }

      return left.label.localeCompare(right.label);
    });

    const limited = topN >= 999 ? sorted : sorted.slice(0, topN);
    const pinnedIndex = limited.findIndex((row) => row.id === pinnedPlayerId);

    if (pinnedIndex <= 0) {
      return limited;
    }

    const clone = [...limited];
    const [pinned] = clone.splice(pinnedIndex, 1);
    clone.unshift(pinned);
    return clone;
  }, [data, mode, pinnedPlayerId, safeMetricKey, showZeros, sortDirection, topN]);

  const values = rows.map((row) => getDisplayValue(row.metrics, safeMetricKey, mode));
  const minValue = values.length ? Math.min(0, ...values) : 0;
  const maxValue = values.length ? Math.max(0, ...values, 1) : 1;
  const average = rows.length ? values.reduce((sum, value) => sum + value, 0) / rows.length : 0;

  const zeroLeftPercent = minValue < 0
    ? Math.abs(minValue) / (maxValue - minValue || 1)
    : 0;

  const leaderValue = values.length ? Math.max(...values) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {formatModeLabel(mode)} · {METRIC_DEFINITIONS[safeMetricKey].label} ·{' '}
            {METRIC_DEFINITIONS[safeMetricKey].higherIsBetter ? 'Higher is better' : 'Lower is better'}
          </Text>
        </View>
        <Pressable onPress={() => setShowTooltip((current) => !current)} style={styles.infoPill}>
          <Text style={styles.infoPillText}>?</Text>
        </Pressable>
      </View>

      {showTooltip ? (
        <View style={styles.tooltipCard}>
          <Text style={styles.tooltipTitle}>{METRIC_DEFINITIONS[safeMetricKey].label}</Text>
          <Text style={styles.tooltipBody}>{getMetricTooltip(safeMetricKey, mode)}</Text>
        </View>
      ) : null}

      <View style={styles.toggleRow}>
        {(['raw', 'perTurn', 'efficiency'] as MetricMode[]).map((nextMode) => (
          <TogglePill
            key={nextMode}
            active={mode === nextMode}
            label={formatModeLabel(nextMode)}
            onPress={() => {
              setMode(nextMode);

              const nextMetricList =
                nextMode === 'efficiency'
                  ? EFFICIENCY_METRICS
                  : nextMode === 'perTurn'
                    ? PER_TURN_METRICS
                    : RAW_METRICS;

              if (!nextMetricList.includes(metricKey)) {
                setMetricKey(nextMode === 'efficiency' ? 'allContractsEfficiency' : 'score');
              }
            }}
          />
        ))}
      </View>

      <View style={styles.metricRow}>
        {metricList.map((key) => (
          <TogglePill
            key={key}
            active={safeMetricKey === key}
            label={METRIC_DEFINITIONS[key].label}
            onPress={() => setMetricKey(key)}
          />
        ))}
      </View>

      <View style={styles.controlRow}>
        <TogglePill
          active={sortDirection === 'desc'}
          label={sortDirection === 'desc' ? 'High → Low' : 'Low → High'}
          onPress={() => setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
        />
        <TogglePill
          active={!showZeros}
          label={showZeros ? 'Show Zeros' : 'Hide Zeros'}
          onPress={() => setShowZeros((current) => !current)}
        />
        <TogglePill
          active={topN === 5}
          label={topN === 5 ? 'Top 5' : 'All'}
          onPress={() => setTopN((current) => (current === 5 ? 999 : 5))}
        />
      </View>

      <View style={styles.legendWrap}>
        {rows.map((row) => (
          <View key={`legend-${row.id}`} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: row.color }]} />
            <Text style={styles.legendText}>{row.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.averageRow}>
        <Text style={styles.averageLabel}>Average</Text>
        <Text style={styles.averageValue}>{formatMetricValue(safeMetricKey, average)}</Text>
      </View>

      {rows.map((row, index) => {
        const value = getDisplayValue(row.metrics, safeMetricKey, mode);
        const totalRange = maxValue - minValue || 1;
        const negativeShare = value < 0 ? Math.abs(value) / totalRange : 0;
        const positiveShare = value > 0 ? value / totalRange : 0;
        const isPinned = row.id === pinnedPlayerId;
        const isLeader = value === leaderValue;

        return (
          <Pressable
            key={row.id}
            style={[styles.playerCard, isPinned && styles.playerCardPinned]}
            onPress={() => setPinnedPlayerId((current) => (current === row.id ? null : row.id))}
          >
            <View style={styles.playerHeader}>
              <View style={styles.playerHeaderLeft}>
                <Text style={styles.rankText}>#{index + 1}</Text>
                <View style={[styles.legendColor, { backgroundColor: row.color }]} />
                <Text style={styles.playerName}>{row.label}</Text>
                {isLeader ? <Text style={styles.badge}>Leader</Text> : null}
                {isPinned ? <Text style={styles.badge}>Pinned</Text> : null}
              </View>
              <Text style={styles.valueText}>{formatMetricValue(safeMetricKey, value)}</Text>
            </View>

            <View style={styles.track}>
              {minValue < 0 ? (
                <View style={[styles.zeroLine, { left: `${zeroLeftPercent * 100}%` }]} />
              ) : null}

              <View
                style={[
                  styles.averageLine,
                  {
                    left: `${((average - minValue) / totalRange) * 100}%`,
                  },
                ]}
              />

              {value < 0 ? (
                <View
                  style={[
                    styles.negativeBar,
                    {
                      left: `${(zeroLeftPercent - negativeShare) * 100}%`,
                      width: `${negativeShare * 100}%`,
                      backgroundColor: withAlpha(row.color ?? '#8b5cf6', 'CC'),
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.positiveBar,
                    {
                      left: `${zeroLeftPercent * 100}%`,
                      width: `${positiveShare * 100}%`,
                      backgroundColor: withAlpha(row.color ?? '#8b5cf6', 'DD'),
                    },
                  ]}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function TogglePill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  infoPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPillText: {
    color: '#fff',
    fontWeight: '700',
  },
  tooltipCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tooltipTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipBody: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  pillActive: {
    backgroundColor: '#312e81',
    borderColor: '#8b5cf6',
  },
  pillText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  averageLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  averageValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  playerCard: {
    backgroundColor: '#0b1220',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  playerCardPinned: {
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  playerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rankText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  valueText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    position: 'relative',
    height: 24,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  zeroLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#6b7280',
    zIndex: 3,
  },
  averageLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fbbf24',
    zIndex: 3,
  },
  positiveBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  negativeBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
});
