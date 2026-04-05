import React from 'react';
import { View, StyleSheet } from 'react-native';

import Text from './ui/Text';
import { getPlayerBaseColor } from '@/utils/colors';

type Player = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  player: Player;
  children?: React.ReactNode;
};

function getInitials(name: string): string {
  if (!name?.trim()) return '';

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayerCardBase({ player, children }: Props) {
  const badgeColor = getPlayerBaseColor(player.color);

  return (
    <View style={styles.container}>
      <View style={styles.glowLayer} />

      <View style={styles.header}>
        <View style={[styles.badgeShell, { borderColor: 'rgba(99,230,255,0.28)' }]}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{getInitials(player.name)}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.label}>PLAYER</Text>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
        </View>
      </View>

      {!!children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.14)',
    backgroundColor: '#0E152C',
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(99,230,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  badge: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  titleBlock: {
    flex: 1,
  },
  label: {
    color: '#8FA1C7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F4F7FF',
  },
  content: {
    marginTop: 12,
  },
});
