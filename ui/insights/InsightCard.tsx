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
  insights?: Insight[];
};

// -----------------------------
// 🧠 Component
// -----------------------------
function InsightsList({ insights = [] }: Props) {
  const { s } = useS();

  // ✅ fallback prevents crash
  const players = useStore((state) => state.players ?? []);

  // ✅ O(1) lookup instead of O(n)
  const playerMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const p of players) {
      if (p?.id) {
        map.set(p.id, p.name ?? 'Unknown');
      }
    }

    return map;
  }, [players]);

  // ✅ empty state (prevents blank UI confusion)
  if (insights.length === 0) {
    return <View style={{ marginTop: s.md }} />;
  }

  return (
    <View style={[styles.container, { marginTop: s.md }]}>
      {insights.map((insight, index) => {
        if (!insight) return null;

        return (
          <InsightCard
            key={getInsightKey(insight, index)}
            insight={insight}
            playerName={
              insight.playerId
                ? playerMap.get(insight.playerId) ?? undefined
                : undefined
            }
          />
        );
      })}
    </View>
  );
}

// -----------------------------
// 🔑 Stable Key Generator
// -----------------------------
const getInsightKey = (
  insight: Insight,
  index: number
) =>
  `${insight.type}-${insight.playerId ?? 'global'}-${
    insight.label
  }-${index}`;

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

