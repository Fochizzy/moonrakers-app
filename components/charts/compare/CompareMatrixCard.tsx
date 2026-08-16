import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import { buildDefinitionsRoute } from '@/utils/appRoutes';
import {
  CompareRow,
  MatrixLayout,
  MetricDescriptor,
  SortDirection,
  VisibleMetricEntry,
} from '@/utils/compareTypes';
import { getMetricBestWorst, nearlyEqual } from '@/utils/compareHelpers';
import { getDeltaColor } from '@/utils/compareDelta';
import { resolveDefinitionTarget } from '@/utils/definitionTargets';
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

function getMatchupVerdict(
  metric: MetricDescriptor,
  rows: CompareRow[],
  baseline: CompareRow | undefined
): string {
  if (!baseline || rows.length <= 1) {
    return 'Add another player.';
  }

  const otherRows = rows.filter((row) => row.id !== baseline.id);

  if (rows.length === 2 && otherRows[0]) {
    const other = otherRows[0];
    const delta = toNumber(metric.getValue(other)) - toNumber(metric.getValue(baseline));

    if (delta === 0) {
      return `Even on ${metric.label.toLowerCase()}.`;
    }

    const betterRow = delta > 0 ? other : baseline;
    return `${betterRow.label} leads ${metric.label.toLowerCase()}.`;
  }

  let bestRow: CompareRow | null = baseline;
  let bestValue = toNumber(metric.getValue(baseline));
  let worstRow: CompareRow | null = baseline;
  let worstValue = toNumber(metric.getValue(baseline));

  for (const row of rows) {
    const value = toNumber(metric.getValue(row));
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
    return `Compare ${metric.label.toLowerCase()}.`;
  }

  const spread = bestValue - worstValue;

  if (spread === 0) {
    return `Even on ${metric.label.toLowerCase()}.`;
  }
  return `${bestRow.label} leads ${metric.label.toLowerCase()}.`;
}

function isMetricFlat(metric: MetricDescriptor, rows: CompareRow[]): boolean {
  if (rows.length < 2) return false;

  const values = rows.map((row) => toNumber(metric.getValue(row)));
  const first = values[0] ?? 0;

  return values.every((value) => nearlyEqual(value, first));
}

export default function CompareMatrixCard({
  title,
  rows,
  visibleMetrics,
  topMetricsOnly,
  onToggleTopMetricsOnly,
  onMetricPress,
  onOpenMetricInfo,
  onToggleGroupCollapse,
}: Props) {
  const router = useRouter();
  const baseline = rows[0];
  const displayEntries = useMemo(() => {
    const filteredEntries: VisibleMetricEntry[] = [];
    let pendingGroup: VisibleMetricEntry | null = null;
    let pendingMetrics: VisibleMetricEntry[] = [];

    function flushPendingGroup() {
      if (!pendingGroup) return;
      if (pendingMetrics.length > 0) {
        filteredEntries.push(pendingGroup, ...pendingMetrics);
      }
      pendingGroup = null;
      pendingMetrics = [];
    }

    for (const entry of visibleMetrics) {
      if (entry.type === 'group') {
        flushPendingGroup();
        pendingGroup = entry;
        continue;
      }

      if (isMetricFlat(entry.metric, rows)) {
        continue;
      }

      if (pendingGroup) {
        pendingMetrics.push(entry);
      } else {
        filteredEntries.push(entry);
      }
    }

    flushPendingGroup();

    return filteredEntries;
  }, [rows, visibleMetrics]);

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.headerSpacer} />}

        <Pressable onPress={onToggleTopMetricsOnly} style={[styles.filterCard, topMetricsOnly && styles.filterCardActive]}>
          <Text style={[styles.filterLabel, topMetricsOnly && styles.filterLabelActive]}>
            {topMetricsOnly ? 'Top metrics' : 'All metrics'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stack}>
        {displayEntries.map((entry) => {
          if (entry.type === 'group') {
            return (
              <Pressable
                key={`group-${entry.group.key}`}
                onPress={() => onToggleGroupCollapse(entry.group.key)}
                style={styles.groupCard}
              >
                <Text style={styles.groupLabel}>{entry.group.label}</Text>
              </Pressable>
            );
          }

          const metric = entry.metric;
          const bestWorst = getMetricBestWorst(metric, rows);
          const verdict = getMatchupVerdict(metric, rows, baseline);
          const definitionTarget = resolveDefinitionTarget({
            label: metric.label,
            metric: String(metric.key),
          });

          return (
            <View key={`metric-${String(metric.key)}`} style={styles.metricCard}>
              <View style={styles.metricHeaderRow}>
                <View style={styles.metricHeaderCopy}>
                  {definitionTarget ? (
                    <Pressable
                      onPress={() =>
                        router.push(buildDefinitionsRoute(definitionTarget))
                      }
                      style={styles.metricTitleButton}
                    >
                      <Text style={styles.metricTitle}>{metric.label}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.metricTitle}>{metric.label}</Text>
                  )}

                  {definitionTarget ? (
                    <Text style={styles.metricDefinitionHint}>Definition</Text>
                  ) : null}

                  <Text style={styles.metricVerdict}>{verdict}</Text>
                </View>

                <Pressable
                  onPress={() => onMetricPress(metric)}
                  onLongPress={() => onOpenMetricInfo(metric)}
                  style={styles.metricSortButton}
                >
                  <Text style={styles.metricSortLabel}>Sort</Text>
                  <Text style={styles.metricSortHint}>Hold for info</Text>
                </Pressable>
              </View>

              <View style={styles.rowStack}>
                {rows.map((row) => {
                  const value = metric.getValue(row);
                  const numericValue = toNumber(value);
                  const baseValue = baseline ? toNumber(metric.getValue(baseline)) : 0;
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

                  return (
                    <View key={`${String(metric.key)}-${row.id}`} style={styles.playerRow}>
                      <View style={styles.playerMain}>
                        <Text style={styles.playerName}>{row.label}</Text>
                        {baseline?.id === row.id ? <Text style={styles.playerMeta}>Anchor</Text> : null}
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
                          {metric.format(row)}
                        </Text>

                        {row.id !== baseline?.id ? (
                          <>
                            <Text style={[styles.deltaValue, { color: deltaColor }]}>{formatDelta(delta)}</Text>
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
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  headerSpacer: {
    flex: 1,
  },
  title: {
    flex: 1,
    color: '#F8FBFF',
    fontSize: 18,
    fontWeight: '900',
    paddingTop: 6,
  },
  filterCard: {
    minWidth: 148,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
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
  stack: {
    gap: 8,
  },
  groupCard: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(86, 120, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(125, 235, 255, 0.22)',
  },
  groupLabel: {
    color: '#F8FBFF',
    fontSize: 14,
    fontWeight: '900',
  },
  metricCard: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(15,23,42,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.24)',
    gap: 6,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metricHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  metricTitleButton: {
    alignSelf: 'flex-start',
  },
  metricTitle: {
    color: '#F8FBFF',
    fontSize: 15,
    fontWeight: '900',
  },
  metricDefinitionHint: {
    marginTop: 2,
    color: '#7DD3FC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.24,
    textTransform: 'uppercase',
  },
  metricVerdict: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: '#93C5FD',
    fontWeight: '700',
  },
  metricSortButton: {
    minWidth: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.26)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  metricSortLabel: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.28,
  },
  metricSortHint: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '700',
  },
  rowStack: {
    gap: 6,
  },
  playerRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    padding: 8,
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
  playerMeta: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
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
    marginTop: 2,
    fontSize: 10,
    fontWeight: '900',
  },
  tierText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
  },
});

