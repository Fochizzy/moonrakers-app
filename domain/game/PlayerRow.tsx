import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { useS } from '../ui/useS';
import RankBadge from './ui/RankBadge';

// -----------------------------
// 🎯 Types
// -----------------------------
type Player = {
  id: string;
  name: string;
};

type Props = {
  player: Player;
  rating: number;
  onPress?: () => void;
};

// -----------------------------
// 🧠 Component
// -----------------------------
function PlayerRow({ player, rating, onPress }: Props) {
  const { c, s, t } = useS();

  const interactive = Boolean(onPress);

  const handlePress = useCallback(() => {
    if (interactive) onPress?.();
  }, [interactive, onPress]);

  return (
    <Pressable
      onPress={interactive ? handlePress : undefined}
      disabled={!interactive}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: c.background.secondary,
          padding: s.md,
        },
        interactive && pressed && styles.pressed,
      ]}
    >
      {/* Name */}
      <Text style={[t.body, styles.name(c)]} numberOfLines={1}>
        {player.name}
      </Text>

      {/* Rank */}
      <RankBadge rating={rating} size="sm" />
    </Pressable>
  );
}

export default memo(PlayerRow);

// -----------------------------
// 🎨 Styles
// -----------------------------
const styles = StyleSheet.create({
  row: {
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.85,
  },

  name: (c: any) => ({
    color: c.text.primary,
    flex: 1,
    marginRight: 8,
  }),
});
