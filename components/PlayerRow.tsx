import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Text from '../ui/Text';

type RankedPlayerLike = {
  id: string;
  name: string;
  elo?: number;
  score?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  bestStreak?: number;
};

type Props = {
  player: RankedPlayerLike;
  rank: number;
};

const sciFi = {
  panel: '#0E1428',
  panelTop: '#121B36',
  border: 'rgba(120,160,255,0.14)',
  borderStrong: 'rgba(99,230,255,0.34)',
  text: '#F4F7FF',
  subtext: '#9AA8C7',
  dim: '#6C7896',
  cyan: '#63E6FF',
  violet: '#B57CFF',
  gold: '#FFD76A',
  silver: '#C9D4E8',
  bronze: '#D39A64',
};

function getRankAccent(rank: number) {
  if (rank === 1) return sciFi.gold;
  if (rank === 2) return sciFi.silver;
  if (rank === 3) return sciFi.bronze;
  return sciFi.cyan;
}

export default function PlayerRow({ player, rank }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.stopAnimation();
    glow.stopAnimation();

    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.015,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 180,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 280,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [player, scale, glow]);

  const isTop3 = rank <= 3;
  const accent = getRankAccent(rank);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isTop3 ? 'rgba(255,255,255,0.10)' : sciFi.border,
      accent,
    ],
  });

  return (
    <Animated.View
      style={[
        styles.row,
        isTop3 && styles.topRow,
        {
          borderColor,
          transform: [{ scale }],
          shadowColor: accent,
        },
      ]}
    >
      <View style={[styles.rankPill, { borderColor: accent, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
        <Text style={[styles.rank, { color: accent }]}>#{rank}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>

        <Text style={styles.sub} numberOfLines={1}>
          {(player.wins ?? 0)}-{(player.losses ?? 0)} • {((player.winRate ?? 0) * 100).toFixed(1)}% WR • Streak {player.bestStreak ?? 0}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.elo}>{player.elo ?? 0}</Text>
        <Text style={styles.score}>{Math.round(player.score ?? 0)} pts</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#0E1428',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  topRow: {
    backgroundColor: '#121B36',
  },
  rankPill: {
    minWidth: 50,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rank: {
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: sciFi.text,
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 11,
    color: sciFi.subtext,
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  elo: {
    fontWeight: '900',
    fontSize: 16,
    color: sciFi.text,
  },
  score: {
    fontSize: 11,
    color: sciFi.cyan,
    marginTop: 2,
    fontWeight: '700',
  },
});


