import React, { memo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { useS } from '../ui/useS';

// -----------------------------
// 🎯 Types
// -----------------------------
type Player = {
  id: string;
  name: string;
  rounds?: any[];
};

type Totals = {
  score: number;
  prestige: number;
};

type Props = {
  player: Player;
  totals: Totals;
  isWinner?: boolean;
};

// -----------------------------
// 🧠 Component
// -----------------------------
function PlayerCard({ player, totals, isWinner }: Props) {
  const { c, s, t } = useS();
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.surface.card,
          borderColor: isWinner
            ? c.accent.warning
            : c.border.subtle,
          padding: s.md,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[t.subtitle, styles.name(c)]}
          numberOfLines={1}
        >
          {player.name}
        </Text>

        {isWinner && <Text style={styles.trophy}>🏆</Text>}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={[t.body, styles.secondary(c)]}>
          Score: {totals.score}
        </Text>

        <Text style={[t.body, styles.secondary(c)]}>
          Prestige: {totals.prestige}
        </Text>
      </View>

      {/* Expanded */}
      {expanded && (
        <View style={[styles.expanded, { marginTop: s.sm }]}>
          <Text style={[t.caption, styles.secondary(c)]}>
            Tap to collapse
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default memo(PlayerCard);

// -----------------------------
// 🎨 Styles
// -----------------------------
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },

  pressed: {
    opacity: 0.9,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stats: {
    marginTop: 6,
    gap: 2,
  },

  expanded: {},

  trophy: {
    fontSize: 18,
  },

  name: (c: any) => ({
    color: c.text.primary,
  }),

  secondary: (c: any) => ({
    color: c.text.secondary,
  }),
});


