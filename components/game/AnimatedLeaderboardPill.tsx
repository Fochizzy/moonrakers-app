import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import Text from '@/components/ui/Text';
import type { LeaderboardEntry } from '@/engine/gameEngine';
import { glowStyle, withAlpha } from '@/utils/gameScreenTheme';
import { resolveStoredPlayerColor } from '@/utils/playerColor';
import { getPlayerAccentColor } from '@/utils/turnTheme';

import { UI } from './gameScreenUi';
import { styles } from './gameScreenStyles';

export default function AnimatedLeaderboardPill({
  entry,
  rank,
  activePlayerId,
}: {
  entry: LeaderboardEntry;
  rank: number;
  activePlayerId?: string;
}) {
  const motion = React.useRef(new Animated.Value(0)).current;
  const previousRankRef = React.useRef(rank);

  useEffect(() => {
    const previousRank = previousRankRef.current;
    if (previousRank === rank) return;

    const direction = previousRank > rank ? -1 : 1;
    motion.stopAnimation();
    motion.setValue(direction);

    Animated.spring(motion, {
      toValue: 0,
      tension: 120,
      friction: 12,
      useNativeDriver: true,
    }).start();

    previousRankRef.current = rank;
  }, [rank, motion]);

  const accent = getPlayerAccentColor(resolveStoredPlayerColor(entry.color, rank));
  const isActive = entry.id === activePlayerId;

  return (
    <Animated.View
      style={{
        transform: [
          {
            translateY: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-10, 0, 10],
            }),
          },
          {
            scale: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [1.03, 1, 0.985],
            }),
          },
        ],
      }}
    >
      <View
        style={[
          styles.playerPill,
          {
            opacity: isActive ? 1 : 0.76,
            borderColor: withAlpha(accent, isActive ? 0.62 : 0.3),
            backgroundColor: UI.card,
          },
          isActive ? glowStyle(withAlpha(accent, 0.95), 0.3, 10, 10) : null,
        ]}
      >
        <View
          style={[
            styles.playerPillRail,
            { backgroundColor: withAlpha(accent, isActive ? 0.92 : 0.62) },
          ]}
        />
        <View style={styles.playerPillBody}>
          <Text style={styles.playerPillName} numberOfLines={1}>
            {entry.name}
          </Text>

          <View style={styles.playerPillMetrics}>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipText}>P: {entry.totalPrestige}</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipText}>S: {entry.score}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
