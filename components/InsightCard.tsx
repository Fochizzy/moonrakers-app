import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import Text from '@/components/ui/Text';
import { withAlpha } from '@/utils/chartTheme';

type Insight = {
  type: string;
  label: string;
  value: number;
  playerId?: string;
};

type Props = {
  insight: Insight;
  playerName?: string;
};

function formatInsightValue(type: string, value: number) {
  switch (type) {
    case 'winRate':
    case 'failureRate':
    case 'assistShare':
    case 'consistencyScore':
    case 'impactScore':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return Number.isFinite(value)
        ? value.toFixed(2).replace(/\.00$/, '')
        : '0';
  }
}

function getTone(type: string, value: number) {
  switch (type) {
    case 'winRate':
      return { accent: '#22c55e', label: 'WIN' };
    case 'failureRate':
      return { accent: '#fb7185', label: 'FAIL' };
    case 'assistShare':
      return { accent: '#38bdf8', label: 'ASSIST' };
    case 'consistencyScore':
      return { accent: '#a855f7', label: 'CONSISTENT' };
    case 'impactScore':
      return { accent: '#3B82F6', label: 'IMPACT' };
    default:
      return {
        accent: value >= 0 ? '#67e8f9' : '#94a3b8',
        label: 'SIGNAL',
      };
  }
}

function InsightCard({ insight, playerName }: Props) {
  const tone = useMemo(() => getTone(insight.type, insight.value), [insight.type, insight.value]);
  const value = formatInsightValue(insight.type, insight.value);

  return (
    <View style={styles.cardWrapper}>
      <View style={[styles.card, { borderColor: withAlpha(tone.accent, 0.3) }]}>
        <View pointerEvents="none" style={[styles.glow, { backgroundColor: withAlpha(tone.accent, 0.18) }]} />

        <View style={styles.header}>
          <Text style={styles.label}>{insight.label}</Text>

          <View
            style={[
              styles.badgeCard,
              {
                borderColor: withAlpha(tone.accent, 0.4),
                backgroundColor: withAlpha(tone.accent, 0.12),
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: tone.accent }]}>{tone.label}</Text>
          </View>
        </View>

        <Text style={styles.value}>{value}</Text>

        {!!playerName && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Player</Text>
            <Text style={styles.player}>{playerName}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default memo(InsightCard);

const styles = StyleSheet.create({
  cardWrapper: {
    minWidth: 0,
  },
  card: {
    position: 'relative',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#08101f',
    borderWidth: 1,
    overflow: 'hidden',
    gap: 8,
    minHeight: 92,
  },
  glow: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 100,
    height: 100,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badgeCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  player: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e2e8f0',
  },
});

