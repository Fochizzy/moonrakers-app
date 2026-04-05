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

const getInitials = (name: string) => {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
};

function PlayerProfileHeader({ player, rating }: Props) {
  const { c, s, t } = useS();

  const initials = useMemo(
    () => (player.name ? getInitials(player.name) : '?'),
    [player.name]
  );

  const avatarColor = getPlayerBaseColor(player.color);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surface.card,
          padding: s.md,
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

      <View style={styles.info}>
        <Text style={[t.subtitle, styles.name(c)]} numberOfLines={1}>
          {player.name}
        </Text>

        <RankBadge rating={rating} />
      </View>
    </View>
  );
}

export default memo(PlayerProfileHeader);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  initials: {
    color: '#fff',
    fontWeight: '800',
  },

  info: {
    marginLeft: 10,
    flex: 1,
  },

  name: (c: any) => ({
    color: c.text.primary,
  }),
});
