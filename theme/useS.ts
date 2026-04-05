import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';

export function useS() {
  const t = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: t.colors.background.primary,
        },

        text: {
          color: t.colors.text.primary,
        },

        card: {
          backgroundColor: t.colors.surface.card,
          borderRadius: 12,
          padding: t.spacing.md,
          borderWidth: 1,
          borderColor: t.colors.border.subtle,
        },
      }),
    [t]
  );
}
