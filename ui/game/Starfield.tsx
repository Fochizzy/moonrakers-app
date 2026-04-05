import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

type Star = {
  x: number;
  y: number;
  size: number;
  bucket: number;
};

type Layer = {
  stars: Star[];
  speed: number;
  y: Animated.Value;
};

export default function Starfield({ count = 80 }: { count?: number }) {
  // -----------------------------
  // ✨ Twinkle values (stable)
  // -----------------------------
  const twinkle = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  // -----------------------------
  // 🌌 Generate layers once (memo)
  // -----------------------------
  const layers: Layer[] = useMemo(() => {
    const rand = () => Math.random();

    const createStars = (n: number): Star[] =>
      Array.from({ length: n }, () => ({
        x: rand() * width,
        y: rand() * height,
        size: rand() * 2 + 1,
        bucket: Math.floor(rand() * 4),
      }));

    // Distribute dynamically instead of hardcoding
    const l1 = Math.floor(count * 0.5);
    const l2 = Math.floor(count * 0.3);
    const l3 = count - l1 - l2;

    return [
      { stars: createStars(l1), speed: 10, y: new Animated.Value(0) },
      { stars: createStars(l2), speed: 20, y: new Animated.Value(0) },
      { stars: createStars(l3), speed: 40, y: new Animated.Value(0) },
    ];
  }, [count]);

  // -----------------------------
  // 🎞 Animations
  // -----------------------------
  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    // Parallax scroll
    layers.forEach((layer) => {
      const anim = Animated.loop(
        Animated.timing(layer.y, {
          toValue: height,
          duration: 20000 / layer.speed,
          useNativeDriver: true,
        })
      );
      anim.start();
      animations.push(anim);
    });

    // Twinkle
    twinkle.forEach((t, i) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(t, {
            toValue: 1,
            duration: 1000 + i * 200,
            useNativeDriver: true,
          }),
          Animated.timing(t, {
            toValue: 0,
            duration: 1000 + i * 200,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      animations.push(anim);
    });

    return () => animations.forEach((a) => a.stop());
  }, [layers, twinkle]);

  // -----------------------------
  // 🎨 Render
  // -----------------------------
  return (
    <View style={styles.container} pointerEvents="none">
      {layers.map((layer, i) => (
        <Animated.View
          key={`layer-${i}`}
          style={[
            styles.layer,
            { transform: [{ translateY: layer.y }] },
          ]}
        >
          {layer.stars.map((s, j) => (
            <Animated.View
              key={`star-${i}-${j}`}
              style={[
                styles.star,
                {
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                  borderRadius: s.size,
                  opacity: twinkle[s.bucket],
                },
              ]}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}

// -----------------------------
// 🎨 Styles
// -----------------------------
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
});
