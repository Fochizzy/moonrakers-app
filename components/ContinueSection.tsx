// components/ContinueSection.tsx

import React, { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';

type Props = {
  onContinue?: () => void;
  onNewGame?: () => void;
  hasActiveGame?: boolean;
  title?: string;
  helperText?: string;
  continueLabel?: string;
  newGameLabel?: string;
};

type ButtonProps = {
  label: string;
  subLabel?: string;
  onPress?: () => void;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
};

const ActionButton = memo(
  ({
    label,
    subLabel,
    onPress,
    variant,
    disabled = false,
  }: ButtonProps) => {
    const t = useTheme();
    const isPrimary = variant === 'primary';
    const interactive = Boolean(onPress) && !disabled;

    const pressableStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        styles.buttonBase,
        {
          backgroundColor: isPrimary
            ? 'rgba(59,130,246,0.20)'
            : 'rgba(255,255,255,0.045)',
          borderColor: isPrimary
            ? 'rgba(59,130,246,0.38)'
            : 'rgba(255,255,255,0.10)',
          padding: t.spacing.lg,
          opacity: disabled ? 0.42 : pressed ? 0.9 : 1,
          transform: [{ scale: interactive && pressed ? 0.985 : 1 }],
        },
      ],
      [disabled, interactive, isPrimary, t.spacing.lg]
    );

    return (
      <Pressable
        onPress={interactive ? onPress : undefined}
        disabled={!interactive}
        style={pressableStyle}
        android_ripple={
          interactive
            ? { color: 'rgba(255,255,255,0.08)' }
            : undefined
        }
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !interactive }}
      >
        <View style={styles.buttonOverlay} />

        <View style={styles.buttonContent}>
          <Text
            style={{
              fontSize: t.fonts.size.lg,
              color: '#FFFFFF',
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            {label}
          </Text>

          {!!subLabel && (
            <Text
              style={{
                marginTop: t.spacing.xs,
                fontSize: t.fonts.size.sm,
                color: isPrimary
                  ? 'rgba(255,255,255,0.82)'
                  : t.colors.text.secondary,
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              {subLabel}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }
);

ActionButton.displayName = 'ActionButton';

function ContinueSection({
  onContinue,
  onNewGame,
  hasActiveGame = false,
  title = 'Ready to Play',
  helperText,
  continueLabel = 'Continue Game',
  newGameLabel = 'Start New Game',
}: Props) {
  const t = useTheme();

  const resolvedHelperText =
    helperText ??
    (hasActiveGame
      ? 'Resume your current session. Winner tracking uses Prestige first, while score is informational.'
      : 'No active game found. Start a fresh session to begin tracking.');

  const continueSubLabel = hasActiveGame
    ? 'Jump back into your current match'
    : 'No resumable game is available right now';

  const newGameSubLabel = hasActiveGame
    ? 'Start over with a fresh setup'
    : 'Add players and begin a fresh session';

  return (
    <View
      style={{
        marginVertical: t.spacing.lg,
        gap: t.spacing.sm,
      }}
    >
      <View style={styles.headerBlock}>
        <Text
          style={{
            fontSize: t.fonts.size.xl,
            fontWeight: '800',
            color: t.colors.text.primary,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            marginTop: t.spacing.xs,
            fontSize: t.fonts.size.sm,
            color: t.colors.text.secondary,
            lineHeight: 20,
          }}
        >
          {resolvedHelperText}
        </Text>
      </View>

      <ActionButton
        label={continueLabel}
        subLabel={continueSubLabel}
        onPress={onContinue}
        variant="primary"
        disabled={!hasActiveGame}
      />

      <ActionButton
        label={newGameLabel}
        subLabel={newGameSubLabel}
        onPress={onNewGame}
        variant="secondary"
      />
    </View>
  );
}

export default memo(ContinueSection);

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 6,
  },
  buttonBase: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 84,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,15,30,0.14)',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});


