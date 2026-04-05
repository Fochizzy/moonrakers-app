import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

import LeaderboardRow from './LeaderboardRow';

// -----------------------------
// 🎯 Types
// -----------------------------
type Entry = {
  player: any;
  rank: number;
  total: any;
  change: number;
};

type Props = {
  entry: Entry;
  index: number;
};

// -----------------------------
// 🧠 Component
// -----------------------------
export default function AnimatedLeaderboardRow({
  entry,
  index,
}: Props) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  // -----------------------------
  // 🧠 SCALE ON RANK CHANGE
  // -----------------------------
  useEffect(() => {
    if (entry.change !== 0) {
      scale.value = withSpring(1.05);
      scale.value = withSpring(1);
    }
  }, [entry.change, scale]);

  // -----------------------------
  // 👑 LEADER GLOW
  // -----------------------------
  useEffect(() => {
    cancelAnimation(glow);

    if (index === 0) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      glow.value = withTiming(0);
    }
  }, [index, glow]);

  // -----------------------------
  // 🎨 Animated Style
  // -----------------------------
  const anim = useAnimatedStyle(() => {
    const opacity =
      index === 0
        ? interpolate(glow.value, [0, 1], [0.9, 1])
        : 1;

    return {
      transform: [{ scale: scale.value }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ marginBottom: 10 }, anim]}>
      <LeaderboardRow
        player={entry.player}
        rank={entry.rank}
        total={entry.total}
        isLeader={index === 0}
        rankChange={entry.change}
      />
    </Animated.View>
  );
}
