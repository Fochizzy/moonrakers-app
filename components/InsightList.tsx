import React, { memo, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

import { useStore } from '@/store/useStore';
import { useS } from '@/theme/useS';
import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';

import InsightCard from './InsightCard';

type Insight = {
  type: string;
  label: string;
  value: number;
  playerId?: string;
};

type Props = {
  insights?: Insight[];
  title?: string;
};

function InsightList({
  insights = [],
  title = 'Insight Feed',
}: Props) {
  const s = useS();
  const { width } = useWindowDimensions();

  const players = useStore((state: any) => state.players ?? []);

  const playerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) {
      if (p?.id) map.set(p.id, p.name ?? 'Unknown');
    }
    return map;
  }, [players]);

  const visible = useMemo(() => insights.filter(Boolean), [insights]);

  const isTwoColumn = width >= 700;

  return (
    <View style={[styles.panel, { marginTop: s.md }]}>
      <View pointerEvents="none" style={styles.nebulaPurple} />
      <View pointerEvents="none" style={styles.nebulaBlue} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>INTELLIGENCE</Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.countChip}>
          <Text style={styles.countValue}>{visible.length}</Text>
          <Text style={styles.countLabel}>Signals</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No insights yet</Text>
          <Text style={styles.emptyText}>
            Play more games to generate analytics.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.list,
            isTwoColumn && styles.listTwoColumn,
          ]}
        >
          {visible.map((insight, index) => (
            <View
              key={`${insight.type}-${insight.playerId ?? 'global'}-${insight.label}-${index}`}
              style={[
                styles.cardCell,
                isTwoColumn && styles.cardCellTwoColumn,
              ]}
            >
              <InsightCard
                insight={insight}
                playerName={
                  insight.playerId
                    ? playerMap.get(insight.playerId)
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default memo(InsightList);

const styles = StyleSheet.create({
  panel: {
    borderRadius: 26,
    padding: 16,
    backgroundColor: '#040914',
    borderWidth: 1,
    borderColor: withAlpha('#3b82f6', 0.2),
    gap: 14,
    overflow: 'hidden',
  },

  nebulaPurple: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  nebulaBlue: {
    position: 'absolute',
    bottom: -50,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },

  header: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: chartColors?.cyan ?? '#67e8f9',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },

  countChip: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  countValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  countLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c084fc',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.15)',
  },

  list: {
    gap: 10,
  },
  listTwoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginHorizontal: -5,
  },

  cardCell: {
    width: '100%',
  },
  cardCellTwoColumn: {
    width: '50%',
    paddingHorizontal: 5,
  },

  empty: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(10,15,28,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
