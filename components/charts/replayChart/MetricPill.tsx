import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '../chartTheme';

type Props = Readonly<{
  label: string;
  active: boolean;
  onPress: () => void;
}>;

function MetricPill({ label, active, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.pill,
        active && styles.pillActive,
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default memo(MetricPill);

const styles = StyleSheet.create({
  pill: {
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: withAlpha(chartColors.purple, 0.16),
    borderColor: withAlpha(chartColors.purple, 0.45),
  },
  pillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  pillTextActive: {
    color: chartColors.text,
  },
});
