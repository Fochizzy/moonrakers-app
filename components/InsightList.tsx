import React, { memo, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

import { useStore } from '@/store/useStore';
import EmptyStateCard from '@/components/ui/EmptyStateCard';
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
  embedded?: boolean;
  showHeader?: boolean;
};

function InsightList({
  insights = [],
  title = 'Insight Feed',
  embedded = false,
  showHeader = true,
}: Props) {
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
  const isTwoColumn = width >= 360;

  const body = (
    <>
      {showHeader ? (
        <>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>Intelligence</Text>
              <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.countCard}>
              <Text style={styles.countValue}>{visible.length}</Text>
              <Text style={styles.countLabel}>Signals</Text>
            </View>
          </View>

          <View style={styles.divider} />
        </>
      ) : null}

      {visible.length === 0 ? (
        <EmptyStateCard
          message="No insights yet"
          hint="Play more games to generate analytics."
        />
      ) : (
        <View style={[styles.list, isTwoColumn && styles.listTwoColumn]}>
          {visible.map((insight, index) => (
            <View
              key={`${insight.type}-${insight.playerId ?? 'global'}-${insight.label}-${index}`}
              style={[styles.cardCell, isTwoColumn && styles.cardCellTwoColumn]}
            >
              <InsightCard
                insight={insight}
                playerName={insight.playerId ? playerMap.get(insight.playerId) : undefined}
              />
            </View>
          ))}
        </View>
      )}
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedBody}>{body}</View>;
  }

  return (
    <View style={styles.panel}>
      <View pointerEvents="none" style={styles.nebulaPurple} />
      <View pointerEvents="none" style={styles.nebulaBlue} />
      {body}
    </View>
  );
}

export default memo(InsightList);

const styles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#040914',
    borderWidth: 1,
    borderColor: withAlpha('#3b82f6', 0.2),
    gap: 10,
    overflow: 'hidden',
  },
  embeddedBody: {
    gap: 10,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: chartColors?.cyan ?? '#67e8f9',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  countCard: {
    minWidth: 62,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center',
  },
  countValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  countLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c084fc',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  list: {
    gap: 8,
  },
  listTwoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 0,
    rowGap: 8,
    justifyContent: 'space-between',
  },
  cardCell: {
    width: '100%',
  },
  cardCellTwoColumn: {
    width: '49%',
  },
});
