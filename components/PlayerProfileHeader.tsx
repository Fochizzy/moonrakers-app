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
  totalPrestige?: number;
  totalScore?: number;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();

function StatChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function PlayerProfileHeader({
  player,
  rating,
  totalPrestige,
  totalScore,
}: Props) {
  const { c } = useS();

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
          backgroundColor: c?.surface?.card ?? '#10172E',
        },
      ]}
    >
      <View style={[styles.avatarShell, { borderColor: 'rgba(99,230,255,0.35)' }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={[styles.eyebrow, { color: '#8FA1C7' }]}>
          PILOT PROFILE
        </Text>

        <Text style={[styles.name, { color: c?.text?.primary ?? '#F4F7FF' }]} numberOfLines={1}>
          {player.name}
        </Text>

        <View style={styles.metaRow}>
          <RankBadge rating={rating} />
          {typeof totalPrestige === 'number' && (
            <StatChip label={`${totalPrestige} prestige`} />
          )}
          {typeof totalScore === 'number' && (
            <StatChip label={`${totalScore} score`} />
          )}
        </View>
      </View>
    </View>
  );
}

export default memo(PlayerProfileHeader);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 22,
    marginBottom: 14,
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.16)',
    shadowColor: '#63E6FF',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarShell: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  info: {
    marginLeft: 14,
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B6C3E1',
  },
});


