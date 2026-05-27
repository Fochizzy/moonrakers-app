import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

const variantStyles = {
  primary: {
    backgroundColor: withAlpha(chartColors.purple, 0.28),
    borderColor: withAlpha(chartColors.purple, 0.72),
    textColor: chartColors.textStrong,
    glowColor: chartColors.purple,
  },
  secondary: {
    backgroundColor: withAlpha(chartColors.cyan, 0.24),
    borderColor: withAlpha(chartColors.cyan, 0.62),
    textColor: chartColors.text,
    glowColor: chartColors.cyan,
  },
  ghost: {
    backgroundColor: withAlpha(chartColors.surfaceBg, 0.8),
    borderColor: withAlpha(chartColors.borderBright, 0.58),
    textColor: chartColors.subtext,
    glowColor: chartColors.blue,
  },
} as const;

export default function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}: ButtonProps) {
  const tone = variantStyles[variant];

  const getStyle = useCallback(
    ({ pressed, hovered }: { pressed: boolean; hovered: boolean }) => [
      styles.base,
      {
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
      },
      (hovered || pressed) && !disabled
        ? {
            backgroundColor:
              variant === 'ghost'
                ? withAlpha(chartColors.surfaceBg, 0.88)
                : withAlpha(tone.glowColor, variant === 'secondary' ? 0.3 : 0.34),
            borderColor: withAlpha(tone.glowColor, 0.88),
            transform: [{ scale: pressed ? 0.985 : 1 }],
          }
        : null,
      disabled && styles.disabled,
      style,
    ],
    [disabled, style, tone.backgroundColor, tone.borderColor, tone.glowColor, variant]
  );

  return (
    <Pressable onPress={onPress} disabled={disabled} style={getStyle}>
      {({ hovered, pressed }) => (
        <Text
          style={[
            styles.text,
            { color: tone.textColor, opacity: disabled ? 0.68 : hovered || pressed ? 1 : 0.96 },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.58,
  },
  text: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    backgroundColor: 'transparent',
  },
});

