import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type Star = {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
};

type Layer = {
  stars: Star[];
  speed: number;
};

const createStars = (count: number): Star[] =>
  Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.2 + 0.8,
    twinkleOffset: Math.random(),
  }));

export default function StarryNight({ count = 70 }: { count?: number }) {
  const layers: Layer[] = useMemo(() => {
    const l1 = Math.floor(count * 0.5);
    const l2 = Math.floor(count * 0.3);
    const l3 = count - l1 - l2;

    return [
      { stars: createStars(l1), speed: 0.15 },
      { stars: createStars(l2), speed: 0.3 },
      { stars: createStars(l3), speed: 0.5 },
    ];
  }, [count]);

  const progress = useSharedValue(0);
  const twinkle = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 24000 }),
      -1,
      false
    );

    twinkle.value = withRepeat(
      withTiming(1, { duration: 3200 }),
      -1,
      true
    );
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {layers.map((layer, i) => (
        <StarLayer
          key={`layer-${i}`}
          stars={layer.stars}
          speed={layer.speed}
          progress={progress}
          twinkle={twinkle}
        />
      ))}
    </View>
  );
}

function StarLayer({
  stars,
  speed,
  progress,
  twinkle,
}: {
  stars: Star[];
  speed: number;
  progress: Animated.SharedValue<number>;
  twinkle: Animated.SharedValue<number>;
}) {
  const animatedLayerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, height]);

    return {
      transform: [{ translateY: translateY * speed }],
    };
  });

  return (
    <Animated.View style={[styles.layer, animatedLayerStyle]}>
      {stars.map((star, j) => (
        <StarItem key={j} star={star} twinkle={twinkle} />
      ))}
    </Animated.View>
  );
}

function StarItem({
  star,
  twinkle,
}: {
  star: Star;
  twinkle: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const phase = (twinkle.value + star.twinkleOffset) % 1;

    const opacity = interpolate(
      phase,
      [0, 0.5, 1],
      [0.12, 0.35, 0.12],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#E2E8F0',
  },
});
