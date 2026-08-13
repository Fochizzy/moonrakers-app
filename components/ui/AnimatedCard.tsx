import React, { memo, useCallback, useMemo } from 'react';
import {
  Pressable,
  PressableStateCallbackType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  Insets,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  hitSlop?: Insets;
  pressScale?: number;
  glowColor?: string;
  starCount?: number;
};

type Star = {
  id: number;
  x: number;
  y: number;
  r: number;
  o: number;
};

function createSeededStars(count: number): Star[] {
  let seed = 42;

  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    r: 0.35 + rand() * 1.35,
    o: 0.2 + rand() * 0.7,
  }));
}

function Starfield({
  stars,
  active,
  glowColor,
}: {
  stars: Star[];
  active: boolean;
  glowColor: string;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="nebula" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={withAlpha('#ffffff', active ? 0.1 : 0.05)} />
            <Stop offset="45%" stopColor={withAlpha(glowColor, active ? 0.18 : 0.1)} />
            <Stop offset="100%" stopColor={withAlpha(chartColors.blue ?? '#3b82f6', active ? 0.12 : 0.06)} />
          </SvgLinearGradient>
        </Defs>

        <Circle cx="18" cy="12" r="22" fill="url(#nebula)" />
        <Circle
          cx="82"
          cy="24"
          r="20"
          fill={withAlpha(chartColors.purple, active ? 0.12 : 0.07)}
        />
        <Circle
          cx="66"
          cy="78"
          r="24"
          fill={withAlpha(chartColors.blue ?? '#60a5fa', active ? 0.1 : 0.05)}
        />

        {stars.map((star) => (
          <Circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={active ? star.r * 1.08 : star.r}
            fill={withAlpha('#ffffff', Math.min(0.95, star.o + (active ? 0.08 : 0)))}
          />
        ))}
      </Svg>
    </View>
  );
}

function AnimatedCard({
  children,
  style,
  contentStyle,
  onPress,
  disabled = false,
  hitSlop,
  pressScale = 0.965,
  glowColor = chartColors.purple,
  starCount = 26,
}: Props) {
  const interactive = Boolean(onPress) && !disabled;

  const stars = useMemo(() => createSeededStars(starCount), [starCount]);

  const getPressableStyle = useCallback(
    ({ pressed, hovered }: { pressed: boolean; hovered: boolean }) => {
      const active = interactive && (pressed || hovered);

      return [
        styles.pressable,
        {
          opacity: disabled ? 0.56 : 1,
          transform: [{ scale: active && pressed ? pressScale : 1 }],
        },
        style,
      ];
    },
    [disabled, interactive, pressScale, style]
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={getPressableStyle}
    >
      {/* `hovered` is a react-native-web addition that RN's types omit. */}
      {({ pressed, hovered }: PressableStateCallbackType & { hovered?: boolean }) => {
        const active = interactive && (pressed || Boolean(hovered));

        return (
          <View style={styles.shell}>
            <View
              pointerEvents="none"
              style={[
                styles.outerAura,
                {
                  backgroundColor: withAlpha(glowColor, active ? 0.18 : 0.08),
                  shadowColor: glowColor,
                  shadowOpacity: active ? 0.42 : 0.22,
                  shadowRadius: active ? 30 : 18,
                },
              ]}
            />

            <LinearGradient
              pointerEvents="none"
              colors={[
                withAlpha('#0b1020', 0.98),
                withAlpha('#0a0f1c', 0.94),
                withAlpha('#060913', 0.98),
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.background}
            />

            <View
              style={[
                styles.card,
                {
                  borderColor: withAlpha(glowColor, active ? 0.48 : 0.2),
                  shadowColor: glowColor,
                  shadowOpacity: active ? 0.38 : 0.16,
                  shadowRadius: active ? 26 : 12,
                },
              ]}
            >
              <Starfield stars={stars} active={active} glowColor={glowColor} />

              <LinearGradient
                pointerEvents="none"
                colors={[
                  withAlpha('#ffffff', active ? 0.08 : 0.04),
                  withAlpha(glowColor, active ? 0.14 : 0.06),
                  withAlpha('#000000', 0.16),
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.surfaceGradient}
              />

              <View
                pointerEvents="none"
                style={[
                  styles.ring,
                  {
                    borderColor: withAlpha('#ffffff', active ? 0.12 : 0.06),
                  },
                ]}
              />

              <View
                pointerEvents="none"
                style={[
                  styles.topEdge,
                  { backgroundColor: withAlpha('#ffffff', active ? 0.16 : 0.08) },
                ]}
              />

              <View style={[styles.content, contentStyle]}>{children}</View>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

export default memo(AnimatedCard);

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 24,
  },
  shell: {
    position: 'relative',
    borderRadius: 24,
  },
  outerAura: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    transform: [{ scale: 1.03 }],
    shadowOffset: { width: 0, height: 0 },
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: withAlpha('#09111f', 0.88),
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    minHeight: 72,
  },
  surfaceGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  ring: {
    position: 'absolute',
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1.5,
    borderRadius: 999,
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
});


