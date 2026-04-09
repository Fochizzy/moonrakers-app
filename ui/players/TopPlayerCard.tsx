import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useS } from '../ui/useS';
import RankBadge from './ui/RankBadge';
import { getPlayerBaseColor } from '@/utils/colors';

type Player = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  player: Player;
  rating: number;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();

function TopPlayerCard({ player, rating }: Props) {
  const { c, s, t } = useS();

  const initials = useMemo(
    () => getInitials(player.name),
    [player.name]
  );

  const avatarColor = getPlayerBaseColor(player.color);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface.elevated,
          padding: s.lg,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: avatarColor },
        ]}
      >
        <Text style={styles.initials}>{initials}</Text>
      </View>

      <Text style={[t.title, styles.name(c)]} numberOfLines={1}>
        🏆 {player.name}
      </Text>

      <RankBadge rating={rating} />

      <Text style={[t.caption, styles.subtitle(c)]}>
        Top Ranked Player
      </Text>
    </View>
  );
}

export default memo(TopPlayerCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  initials: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },

  name: (c: any) => ({
    color: c.text.primary,
    marginBottom: 6,
  }),

  subtitle: (c: any) => ({
    color: c.text.secondary,
    marginTop: 6,
  }),
});

