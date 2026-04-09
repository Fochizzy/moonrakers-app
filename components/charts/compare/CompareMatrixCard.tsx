import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import {
  CompareRow,
  MatrixLayout,
  MetricDescriptor,
  SortDirection,
  VisibleMetricEntry,
} from '@/utils/compareTypes';
import { getMetricBestWorst, nearlyEqual } from '@/utils/compareHelpers';
import { getDeltaColor } from '@/utils/compareDelta';
import { getEfficiencyTier } from '@/utils/efficiencyUtils';

type Props = {
  title?: string;
  rows: CompareRow[];
  layout: MatrixLayout;
  visibleMetrics: VisibleMetricEntry[];
  sortMetric: MetricDescriptor;
  sortMetricKey: string;
  sortDirection: SortDirection;
  topMetricsOnly: boolean;
  hasAnalyzed: boolean;
  modeLabel: 'players' | 'groups';
  onToggleTopMetricsOnly: () => void;
  onMetricPress: (metric: MetricDescriptor) => void;
  onOpenMetricInfo: (metric: MetricDescriptor) => void;
  onToggleGroupCollapse: (groupKey: string) => void;
  collapsedGroups: Record<string, boolean>;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`;
}

function getMagnitudeWord(metricKey: string, value: number): string {
  const abs = Math.abs(value);

  switch (metricKey) {
    case 'winRate':
      if (abs >= 12) return 'much';
      if (abs >= 5) return 'clearly';
      return 'slightly';
    case 'avgPrestige':
    case 'avgPrestigePerGame':
    case 'prestige':
    case 'totalPrestige':
      if (abs >= 3) return 'much';
      if (abs >= 1.25) return 'clearly';
      return 'slightly';
    case 'assists':
    case 'avgAssists':
    case 'assistsPerGame':
    case 'netAssistBenefit':
      if (abs >= 2) return 'much';
      if (abs >= 0.75) return 'clearly';
      return 'slightly';
    case 'efficiency':
    case 'assistedEfficiency':
    case 'directEfficiency':
      if (abs >= 1) return 'much';
      if (abs >= 0.35) return 'clearly';
      return 'slightly';
    case 'synergyIndex':
      if (abs >= 0.75) return 'much';
      if (abs >= 0.25) return 'clearly';
      return 'slightly';
    case 'objectiveWinRateTracked':
    case 'objectiveShareOfPrestige':
      if (abs >= 12) return 'much';
      if (abs >= 5) return 'clearly';
      return 'slightly';
    case 'avgObjectivesPerTrackedGame':
      if (abs >= 1.5) return 'much';
      if (abs >= 0.5) return 'clearly';
      return 'slightly';
    case 'contractFailureRatio':
      if (abs >= 1) return 'much';
      if (abs >= 0.35) return 'clearly';
      return 'slightly';
    case 'avgStartOrder':
    case 'turnOrderWinCorrelation':
      if (abs >= 1) return 'much';
      if (abs >= 0.35) return 'clearly';
      return 'slightly';
    default:
      if (abs >= 2) return 'much';
      if (abs >= 0.75) return 'clearly';
      return 'slightly';
  }
}

function interpretDelta(
  metricKey: string,
  value: number,
  playerName: string,
  baselineName: string
): string {
  if (!Number.isFinite(value) || value === 0) {
    return `${playerName} is about the same as ${baselineName}.`;
  }

  const better = value > 0;
  const strength = getMagnitudeWord(metricKey, value);

  switch (metricKey) {
    case 'winRate':
      return better
        ? `${playerName} wins ${strength} more often than ${baselineName}.`
        : `${playerName} wins ${strength} less often than ${baselineName}.`;
    case 'avgPrestige':
    case 'avgPrestigePerGame':
      return better
        ? `${playerName} gets ${strength} more prestige each game than ${baselineName}.`
        : `${playerName} gets ${strength} less prestige each game than ${baselineName}.`;
    case 'efficiency':
      return better
        ? `${playerName} uses turns ${strength} better than ${baselineName}.`
        : `${playerName} uses turns ${strength} worse than ${baselineName}.`;
    case 'synergyIndex':
      return better
        ? `${playerName} fits this group ${strength} better than ${baselineName}.`
        : `${playerName} fits this group ${strength} worse than ${baselineName}.`;
    default:
      return better
        ? `${playerName} is ${strength} better than ${baselineName} here.`
        : `${playerName} is ${strength} worse than ${baselineName} here.`;
  }
}

function getMetricWeight(metricKey: string): number {
  switch (metricKey) {
    case 'winRate':
      return 1.3;
    case 'efficiency':
      return 1.15;
    case 'avgPrestige':
    case 'avgPrestigePerGame':
      return 1.1;
    case 'synergyIndex':
      return 1.05;
    default:
      return 1;
  }
}

function isLowerBetter(metricKey: string): boolean {
  return metricKey === 'contractFailureRatio' || metricKey === 'avgStartOrder';
}

function getNormalizedAdvantage(metricKey: string, value: number): number {
  const adjusted = isLowerBetter(metricKey) ? -value : value;
  return adjusted * getMetricWeight(metricKey);
}

function getBiggestAdvantageForRow(
  row: CompareRow,
  baseline: CompareRow | undefined,
  visibleMetrics: VisibleMetricEntry[]
): string | null {
  if (!baseline || row.id === baseline.id) return null;

  let bestMetricLabel = '';
  let bestMetricKey = '';
  let bestDelta = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const entry of visibleMetrics) {
    if (entry.type !== 'metric') continue;

    const metric = entry.metric;
    const value = toNumber(metric.getValue(row as any));
    const baseValue = toNumber(metric.getValue(baseline as any));
    const delta = value - baseValue;
    const score = getNormalizedAdvantage(String(metric.key), delta);

    if (score > bestScore && score > 0) {
      bestScore = score;
      bestDelta = delta;
      bestMetricLabel = metric.label;
      bestMetricKey = String(metric.key);
    }
  }

  if (!bestMetricLabel) return null;

  const strength = getMagnitudeWord(bestMetricKey, bestDelta);

  if (strength === 'slightly') {
    return `${row.label}'s best area is ${bestMetricLabel.toLowerCase()} versus ${baseline.label}.`;
  }
  if (strength === 'clearly') {
    return `${row.label}'s biggest edge over ${baseline.label} is ${bestMetricLabel.toLowerCase()}.`;
  }
  return `${row.label} is much better than ${baseline.label} in ${bestMetricLabel.toLowerCase()}.`;
}

function getMatchupVerdict(
  metric: MetricDescriptor,
  rows: CompareRow[],
  baseline: CompareRow | undefined
): string {
  if (!baseline || rows.length <= 1) {
    return 'Add another player to compare this stat.';
  }

  const otherRows = rows.filter((row) => row.id !== baseline.id);

  if (rows.length === 2 && otherRows[0]) {
    const other = otherRows[0];
    const delta = toNumber(metric.getValue(other as any)) - toNumber(metric.getValue(baseline as any));

    if (delta === 0) {
      return `${other.label} and ${baseline.label} are about even in ${metric.label.toLowerCase()}.`;
    }

    const betterRow = delta > 0 ? other : baseline;
    const weakerRow = delta > 0 ? baseline : other;
    const strength = getMagnitudeWord(String(metric.key), delta);

    if (strength === 'slightly') {
      return `${betterRow.label} is a little better than ${weakerRow.label} in ${metric.label.toLowerCase()}.`;
    }
    if (strength === 'clearly') {
      return `${betterRow.label} is clearly better than ${weakerRow.label} in ${metric.label.toLowerCase()}.`;
    }
    return `${betterRow.label} is much better than ${weakerRow.label} in ${metric.label.toLowerCase()}.`;
  }

  let bestRow: CompareRow | null = baseline;
  let bestValue = toNumber(metric.getValue(baseline as any));
  let worstRow: CompareRow | null = baseline;
  let worstValue = toNumber(metric.getValue(baseline as any));

  for (const row of rows) {
    const value = toNumber(metric.getValue(row as any));
    if (value > bestValue) {
      bestValue = value;
      bestRow = row;
    }
    if (value < worstValue) {
      worstValue = value;
      worstRow = row;
    }
  }

  if (!bestRow || !worstRow) {
    return `This shows how the players compare in ${metric.label.toLowerCase()}.`;
  }

  const spread = bestValue - worstValue;
  const strength = getMagnitudeWord(String(metric.key), spread);

  if (spread === 0) {
    return `All selected players are about even in ${metric.label.toLowerCase()}.`;
  }
  if (strength === 'slightly') {
    return `${bestRow.label} is a little ahead in ${metric.label.toLowerCase()}, and ${worstRow.label} is lowest.`;
  }
  if (strength === 'clearly') {
    return `${bestRow.label} is clearly ahead in ${metric.label.toLowerCase()}, and ${worstRow.label} is furthest behind.`;
  }
  return `${bestRow.label} is much better than the rest in ${metric.label.toLowerCase()}, and ${worstRow.label} is furthest behind.`;
}

export default function CompareMatrixCard({
  title = 'Data Summary',
  rows,
  visibleMetrics,
  topMetricsOnly,
  onToggleTopMetricsOnly,
  onMetricPress,
  onOpenMetricInfo,
  onToggleGroupCollapse,
}: Props) {
  const baseline = rows[0];

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>

        <Pressable onPress={onToggleTopMetricsOnly} style={[styles.filterCard, topMetricsOnly && styles.filterCardActive]}>
          <Text style={[styles.filterLabel, topMetricsOnly && styles.filterLabelActive]}>
            {topMetricsOnly ? 'Top metrics only' : 'All visible metrics'}
          </Text>
          <Text style={[styles.filterSub, topMetricsOnly && styles.filterSubActive]}>
            Tap to {topMetricsOnly ? 'show all' : 'trim the list'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stack}>
        {visibleMetrics.map((entry) => {
          if (entry.type === 'group') {
            return (
              <Pressable
                key={`group-${entry.group.key}`}
                onPress={() => onToggleGroupCollapse(entry.group.key)}
                style={styles.groupCard}
              >
                <Text style={styles.groupLabel}>{entry.group.label}</Text>
                <Text style={styles.groupSub}>Tap to collapse or expand this metric family</Text>
              </Pressable>
            );
          }

          const metric = entry.metric;
          const bestWorst = getMetricBestWorst(metric, rows);
          const verdict = getMatchupVerdict(metric, rows, baseline);

          return (
            <View key={`metric-${String(metric.key)}`} style={styles.metricCard}>
              <Pressable onPress={() => onMetricPress(metric)} onLongPress={() => onOpenMetricInfo(metric)}>
                <Text style={styles.metricTitle}>{metric.label}</Text>
                <Text style={styles.metricVerdict}>{verdict}</Text>
              </Pressable>

              <View style={styles.rowStack}>
                {rows.map((row) => {
                  const value = metric.getValue(row as any);
                  const numericValue = toNumber(value);
                  const baseValue = baseline ? toNumber(metric.getValue(baseline as any)) : 0;
                  const delta = row.id !== baseline?.id ? numericValue - baseValue : 0;
                  const deltaColor = getDeltaColor(delta);
                  const tier =
                    metric.key === 'efficiency' ||
                    metric.key === 'assistedEfficiency' ||
                    metric.key === 'directEfficiency'
                      ? getEfficiencyTier(value)
                      : null;
                  const isBest = bestWorst.best !== null && nearlyEqual(value, bestWorst.best);
                  const isWorst = bestWorst.worst !== null && nearlyEqual(value, bestWorst.worst);
                  const biggestAdvantage = getBiggestAdvantageForRow(row, baseline, visibleMetrics);

                  return (
                    <View key={`${String(metric.key)}-${row.id}`} style={styles.playerRow}>
                      <View style={styles.playerMain}>
                        <Text style={styles.playerName}>{row.label}</Text>
                        {row.id !== baseline?.id && biggestAdvantage ? (
                          <Text style={styles.playerInsight}>{biggestAdvantage}</Text>
                        ) : (
                          <Text style={styles.playerInsightMuted}>
                            {baseline?.id === row.id
                              ? `${baseline?.label ?? 'Baseline'} is the comparison anchor.`
                              : 'Compared against the current baseline.'}
                          </Text>
                        )}
                      </View>

                      <View style={styles.valuePanel}>
                        <Text
                          style={[
                            styles.metricValue,
                            isBest ? styles.metricValueBest : null,
                            isWorst ? styles.metricValueWorst : null,
                            tier ? { color: tier.color } : null,
                          ]}
                        >
                          {metric.format(row as any)}
                        </Text>

                        {row.id !== baseline?.id ? (
                          <>
                            <Text style={[styles.deltaValue, { color: deltaColor }]}>{formatDelta(delta)}</Text>
                            <Text style={styles.deltaSentence}>
                              {interpretDelta(String(metric.key), delta, row.label, baseline?.label ?? 'baseline')}
                            </Text>
                          </>
                        ) : null}

                        {tier ? <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  title: {
    flex: 1,
    color: '#F8FBFF',
    fontSize: 18,
    fontWeight: '900',
    paddingTop: 8,
  },
  filterCard: {
    minWidth: 170,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    justifyContent: 'center',
  },
  filterCardActive: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderColor: 'rgba(74,222,128,0.36)',
  },
  filterLabel: {
    color: '#E5EEF9',
    fontSize: 11,
    fontWeight: '800',
  },
  filterLabelActive: {
    color: '#F8FBFF',
  },
  filterSub: {
    color: '#8FA6C4',
    fontSize: 11,
    marginTop: 4,
  },
  filterSubActive: {
    color: '#CFFFE0',
  },
  stack: {
    gap: 10,
  },
  groupCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(86, 120, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(125, 235, 255, 0.22)',
  },
  groupLabel: {
    color: '#F8FBFF',
    fontSize: 14,
    fontWeight: '900',
  },
  groupSub: {
    color: '#D7F7FF',
    fontSize: 10,
    marginTop: 4,
  },
  metricCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.24)',
    gap: 12,
  },
  metricTitle: {
    color: '#F8FBFF',
    fontSize: 15,
    fontWeight: '900',
  },
  metricVerdict: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 18,
    color: '#93C5FD',
    fontWeight: '700',
  },
  rowStack: {
    gap: 10,
  },
  playerRow: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(8,14,28,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.18)',
  },
  playerMain: {
    flex: 1,
  },
  playerName: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '800',
  },
  playerInsight: {
    marginTop: 4,
    color: '#A7F3D0',
    fontSize: 11,
    lineHeight: 16,
  },
  playerInsightMuted: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  valuePanel: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricValue: {
    color: '#F8FBFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  metricValueBest: {
    color: '#86EFAC',
  },
  metricValueWorst: {
    color: '#FCA5A5',
  },
  deltaValue: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '900',
  },
  deltaSentence: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'right',
    maxWidth: 220,
  },
  tierText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
});


