import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';

export type RadarPoint = {
  key: string;
  label: string;
  value: number;
  comparisonValue?: number;
  delta?: number;
  meaning?: string;
};

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
}

function formatSignedPercent(value: number): string {
  const pct = Math.round((value ?? 0) * 100);
  if (pct === 0) return '0 pts';
  return `${pct > 0 ? '+' : ''}${pct} pts`;
}

type Props = {
  point: RadarPoint | null;
  playstyleReason?: string;
  primaryLabel: string;
  comparisonLabel: string;
  showComparisonDelta: boolean;
  onResetFocus: () => void;
  hasExplicitSelection: boolean;
};

function RadarChartInspectorComponent({
  point,
  playstyleReason,
  primaryLabel,
  comparisonLabel,
  showComparisonDelta,
  onResetFocus,
  hasExplicitSelection,
}: Props) {
  if (!point) return null;

  return (
    <View style={styles.selectedCard}>
      <View style={styles.selectedHeader}>
        <Text style={styles.selectedTitle}>
          {hasExplicitSelection ? point.label : 'Top Focus'}
        </Text>
        <Pressable onPress={onResetFocus} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset focus</Text>
        </Pressable>
      </View>

      <Text style={styles.selectedText}>
        {primaryLabel}: {formatPercent(point.value)}
      </Text>

      {showComparisonDelta ? (
        <>
          <Text style={styles.selectedText}>
            {comparisonLabel}: {formatPercent(point.comparisonValue ?? 0)}
          </Text>
          <Text
            style={[
              styles.selectedDelta,
              (point.delta ?? 0) > 0 && styles.deltaPositive,
              (point.delta ?? 0) < 0 && styles.deltaNegative,
            ]}
          >
            Delta: {formatSignedPercent(point.delta ?? 0)}
          </Text>
        </>
      ) : null}

      <Text style={styles.selectedMeaning}>{point.meaning ?? 'No extra meaning provided.'}</Text>
      <Text style={styles.selectedReason}>
        {playstyleReason ?? 'Profile summary unavailable.'}
      </Text>
    </View>
  );
}

const RadarChartInspector = memo(RadarChartInspectorComponent);
export default RadarChartInspector;

const styles = StyleSheet.create({
  selectedCard: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 12,
    padding: 10,
    backgroundColor: chartColors.panelBg,
    gap: 4,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  selectedTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  resetButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: withAlpha('#ffffff', 0.06),
    borderWidth: 1,
    borderColor: withAlpha('#ffffff', 0.12),
  },
  resetButtonText: {
    color: chartColors.subtext,
    fontSize: 10,
    fontWeight: '800',
  },
  selectedText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedDelta: {
    color: chartColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  deltaPositive: {
    color: '#22c55e',
  },
  deltaNegative: {
    color: '#ef4444',
  },
  selectedMeaning: {
    color: chartColors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  selectedReason: {
    color: chartColors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
});
