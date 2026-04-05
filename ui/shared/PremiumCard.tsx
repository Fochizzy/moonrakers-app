import React, { memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Insets,
  Platform,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  hitSlop?: Insets;
  pressScale?: number;
};

function PremiumCard({
  children,
  style,
  onPress,
  disabled = false,
  hitSlop,
  pressScale = 0.98,
}: Props) {
  const interactive = Boolean(onPress) && !disabled;

  const baseStyle = useMemo(
    () => [styles.card, style] as StyleProp<ViewStyle>,
    [style]
  );

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      hitSlop={hitSlop}
      accessibilityRole={interactive ? 'button' : undefined}
      android_ripple={
        interactive
          ? { color: 'rgba(255,255,255,0.08)' }
          : undefined
      }
      style={({ pressed }) => {
        if (!interactive || !pressed) {
          return baseStyle;
        }

        return [
          styles.card,
          style,
          styles.pressed,
          pressScale !== 1
            ? { transform: [{ scale: pressScale }] }
            : null,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

export default memo(PremiumCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#121218',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: '#1F2937',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },

    elevation: 4,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },

  pressed: {
    opacity: 0.92,
  },
});
