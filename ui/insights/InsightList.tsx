import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useStore } from '../store/useStore';
import { useS } from '../ui/useS';

import InsightCard from './InsightCard';

// -----------------------------
// 🎯 Types
// -----------------------------
type Insight = {
  type: string;
  label: string;
  value: number;
  playerId?: string;
};

type Props = {
  insights: Insight[];
};

// -----------------------------
// 🧠 Component
// -----------------------------
function InsightsList({ insights }: Props) {
  const { s } = useS();

  const players = useStore((state) => state.players);

  // ✅ O(1) lookup instead of O(n) per item
  const playerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) {
      map.set(p.id, p.name);
    }
    return map;
  }, [players]);

  return (
    <View style={[styles.container, { marginTop: s.md }]}>
      {insights.map((insight) => (
        <InsightCard
          key={getInsightKey(insight)}
          insight={insight}
          playerName={
            insight.playerId
              ? playerMap.get(insight.playerId) ?? undefined
              : undefined
          }
        />
      ))}
    </View>
  );
}

// -----------------------------
// 🔑 Stable Key Generator
// -----------------------------
const getInsightKey = (insight: Insight) =>
  `${insight.type}-${insight.playerId ?? 'global'}-${insight.label}`;

// -----------------------------
// ⚡ Memo
// -----------------------------
export default memo(InsightsList);

// -----------------------------
// 🎨 Styles
// -----------------------------
const styles = StyleSheet.create({
  container: {},
});

