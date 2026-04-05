import React from 'react';
import { Pressable, View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';
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

    case 'wins':
      return better
        ? `${playerName} has ${strength} more wins than ${baselineName}.`
        : `${playerName} has ${strength} fewer wins than ${baselineName}.`;

    case 'avgPrestige':
    case 'avgPrestigePerGame':
      return better
        ? `${playerName} gets ${strength} more prestige each game than ${baselineName}.`
        : `${playerName} gets ${strength} less prestige each game than ${baselineName}.`;

    case 'prestige':
    case 'totalPrestige':
      return better
        ? `${playerName} has ${strength} more total prestige than ${baselineName}.`
        : `${playerName} has ${strength} less total prestige than ${baselineName}.`;

    case 'assists':
    case 'avgAssists':
    case 'assistsPerGame':
    case 'netAssistBenefit':
      return better
        ? `${playerName} gives ${strength} more assist value than ${baselineName}.`
        : `${playerName} gives ${strength} less assist value than ${baselineName}.`;

    case 'efficiency':
      return better
        ? `${playerName} uses turns ${strength} better than ${baselineName}.`
        : `${playerName} uses turns ${strength} worse than ${baselineName}.`;

    case 'assistedEfficiency':
      return better
        ? `${playerName} gets ${strength} more from team play than ${baselineName}.`
        : `${playerName} gets ${strength} less from team play than ${baselineName}.`;

    case 'directEfficiency':
      return better
        ? `${playerName} is ${strength} better at solo scoring than ${baselineName}.`
        : `${playerName} is ${strength} worse at solo scoring than ${baselineName}.`;

    case 'synergyIndex':
      return better
        ? `${playerName} fits this group ${strength} better than ${baselineName}.`
        : `${playerName} fits this group ${strength} worse than ${baselineName}.`;

    case 'objectiveWinRateTracked':
      return better
        ? `${playerName} does ${strength} better on objectives than ${baselineName}.`
        : `${playerName} does ${strength} worse on objectives than ${baselineName}.`;

    case 'objectiveShareOfPrestige':
      return better
        ? `${playerName} gets ${strength} more of their points from objectives than ${baselineName}.`
        : `${playerName} gets ${strength} less of their points from objectives than ${baselineName}.`;

    case 'avgObjectivesPerTrackedGame':
      return better
        ? `${playerName} completes ${strength} more objectives than ${baselineName}.`
        : `${playerName} completes ${strength} fewer objectives than ${baselineName}.`;

    case 'contractFailureRatio':
      return better
        ? `${playerName} fails ${strength} more contracts than ${baselineName}.`
        : `${playerName} fails ${strength} fewer contracts than ${baselineName}.`;

    case 'turnOrderWinCorrelation':
      return better
        ? `${playerName} depends ${strength} more on turn order than ${baselineName}.`
        : `${playerName} depends ${strength} less on turn order than ${baselineName}.`;

    case 'avgStartOrder':
      return better
        ? `${playerName} usually goes ${strength} later than ${baselineName}.`
        : `${playerName} usually goes ${strength} earlier than ${baselineName}.`;

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
    case 'assists':
    case 'avgAssists':
    case 'assistsPerGame':
    case 'netAssistBenefit':
      return 1;
    case 'objectiveWinRateTracked':
    case 'objectiveShareOfPrestige':
    case 'avgObjectivesPerTrackedGame':
      return 1;
    case 'contractFailureRatio':
      return 0.95;
    case 'turnOrderWinCorrelation':
    case 'avgStartOrder':
      return 0.85;
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
    return `${row.label}'s best area is ${bestMetricLabel.toLowerCase()} compared with ${baseline.label}.`;
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
    const otherValue = toNumber(metric.getValue(other as any));
    const baselineValue = toNumber(metric.getValue(baseline as any));
    const delta = otherValue - baselineValue;

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
  onMetricPress,
  onOpenMetricInfo,
  onToggleGroupCollapse,
}: Props) {
  const baseline = rows[0];

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={{ gap: 10 }}>
        {visibleMetrics.map((entry) => {
          if (entry.type === 'group') {
            return (
              <Pressable
                key={`group-${entry.group.key}`}
                onPress={() => onToggleGroupCollapse(entry.group.key)}
                style={styles.matrixGroupRow}
              >
                <Text style={styles.legendTitle}>{entry.group.label}</Text>
              </Pressable>
            );
          }

          const metric = entry.metric;
          const bestWorst = getMetricBestWorst(metric, rows);
          const verdict = getMatchupVerdict(metric, rows, baseline);

          return (
            <View
              key={`metric-${String(metric.key)}`}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: 'rgba(15,23,42,0.72)',
                borderWidth: 1,
                borderColor: 'rgba(71,85,105,0.22)',
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => onMetricPress(metric)}
                onLongPress={() => onOpenMetricInfo(metric)}
              >
                <Text style={styles.matrixMetricLabel}>{metric.label}</Text>
              </Pressable>

              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  color: '#93c5fd',
                  fontWeight: '700',
                }}
              >
                {verdict}
              </Text>

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
                  <View
                    key={`${String(metric.key)}-${row.id}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      paddingVertical: 6,
                      borderBottomWidth: row.id === rows[rows.length - 1]?.id ? 0 : 1,
                      borderBottomColor: 'rgba(71,85,105,0.16)',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        style={{
                          color: '#e2e8f0',
                          fontSize: 13,
                          fontWeight: '800',
                        }}
                        numberOfLines={1}
                      >
                        {row.label}
                      </Text>

                      {row.id !== baseline?.id && biggestAdvantage ? (
                        <Text
                          style={{
                            fontSize: 10,
                            lineHeight: 13,
                            color: '#a7f3d0',
                            marginTop: 3,
                          }}
                        >
                          {biggestAdvantage}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flex: 1.15, alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.matrixValueText,
                          isBest ? styles.matrixValueBest : null,
                          isWorst ? styles.matrixValueWorst : null,
                          tier ? { color: tier.color } : null,
                        ]}
                      >
                        {metric.format(row as any)}
                      </Text>

                      {row.id !== baseline?.id ? (
                        <View style={{ alignItems: 'flex-end', marginTop: 2, maxWidth: 220 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: deltaColor }}>
                            {formatDelta(delta)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              lineHeight: 13,
                              color: '#94a3b8',
                              textAlign: 'right',
                              marginTop: 1,
                            }}
                          >
                            {interpretDelta(
                              String(metric.key),
                              delta,
                              row.label,
                              baseline?.label ?? 'baseline'
                            )}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            fontSize: 10,
                            lineHeight: 13,
                            color: '#64748b',
                            textAlign: 'right',
                            marginTop: 2,
                          }}
                        >
                          {baseline?.label ?? 'This player'} is the baseline everyone else is compared to.
                        </Text>
                      )}

                      {tier ? (
                        <Text style={{ fontSize: 10, color: tier.color, marginTop: 2 }}>
                          {tier.label}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}
