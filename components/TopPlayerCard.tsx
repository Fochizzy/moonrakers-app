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

function MetricChip({
  label,
  primary = false,
}: {
  label: string;
  primary?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricChip,
        primary && styles.metricChipPrimary,
      ]}
    >
      <Text
        style={[
          styles.metricText,
          primary && styles.metricTextPrimary,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function TopPlayerCard({
  player,
  rating,
  totalPrestige,
  totalScore,
}: Props) {
  const { c, s } = useS();

  const initials = useMemo(() => getInitials(player.name), [player.name]);
  const avatarColor = getPlayerBaseColor(player.color);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c?.surface?.elevated ?? '#10172E',
          padding: s.lg,
        },
      ]}
    >
      <View style={styles.glowOrb} />

      <Text style={styles.eyebrow}>FLAGSHIP PLAYER</Text>

      <View style={styles.avatarShell}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      </View>

      <Text style={[styles.name, { color: c?.text?.primary ?? '#F4F7FF' }]} numberOfLines={1}>
        {player.name}
      </Text>

      <View style={styles.badgeWrap}>
        <RankBadge rating={rating} />
      </View>

      <View style={styles.metricsRow}>
        {typeof totalPrestige === 'number' && (
          <MetricChip label={`${totalPrestige} prestige`} primary />
        )}
        {typeof totalScore === 'number' && (
          <MetricChip label={`${totalScore} score`} />
        )}
      </View>

      <Text style={[styles.subtitle, { color: c?.text?.secondary ?? '#9FB0D3' }]}>
        Highest-ranked commander by Prestige output
      </Text>
    </View>
  );
}

export default memo(TopPlayerCard);

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.16)',
    shadowColor: '#63E6FF',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  glowOrb: {
    position: 'absolute',
    top: -36,
    right: -18,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(99,230,255,0.08)',
  },
  eyebrow: {
    color: '#63E6FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  avatarShell: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,230,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeWrap: {
    marginBottom: 10,
  },
  metricsRow: {
    marginTop: 2,
    alignItems: 'center',
    gap: 8,
  },
  metricChip: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  metricChipPrimary: {
    borderColor: 'rgba(99,230,255,0.25)',
    backgroundColor: 'rgba(99,230,255,0.10)',
  },
  metricText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B6C4E3',
  },
  metricTextPrimary: {
    color: '#DDF8FF',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
    maxWidth: 260,
  },
});


