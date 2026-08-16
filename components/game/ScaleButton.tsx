import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { UI } from './gameScreenUi';
import { styles } from './gameScreenStyles';

export default function ScaleButton({
  onPress,
  disabled,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'radio' | 'tab' | 'link';
  accessibilityState?: { disabled?: boolean; selected?: boolean; checked?: boolean };
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), ...(accessibilityState ?? {}) }}
      style={({ pressed }) => [
        style,
        pressed && { transform: [{ scale: UI.pressedScale }] },
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}
