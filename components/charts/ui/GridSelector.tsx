import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';

export type GridSelectorOption = {
  id: string;
  label: string;
  color?: string;
};

type Props = {
  options: GridSelectorOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxSelections?: number;
  minCellWidth?: number;
};

export default function GridSelector({
  options,
  selectedIds,
  onToggle,
  maxSelections = Number.POSITIVE_INFINITY,
  minCellWidth = 68,
}: Props) {
  const selectedSet = new Set(selectedIds);

  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const active = selectedSet.has(option.id);
        const locked = !active && selectedIds.length >= maxSelections;
        const color = option.color || chartColors.purple;

        return (
          <Pressable
            key={option.id}
            onPress={() => onToggle(option.id)}
            disabled={locked}
            hitSlop={4}
            style={({ pressed }) => [
              styles.cell,
              { minWidth: minCellWidth },
              active && {
                borderColor: withAlpha(color, 0.55),
                backgroundColor: withAlpha(color, 0.16),
                shadowColor: color,
              },
              locked && styles.cellLocked,
              pressed && !locked && styles.pressed,
            ]}
          >
            {active ? <View style={[styles.activeBar, { backgroundColor: color }]} /> : null}
            <Text
              numberOfLines={1}
              style={[
                styles.cellText,
                active && styles.cellTextActive,
                locked && styles.cellTextLocked,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowOpacity: 0,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cellLocked: {
    opacity: 0.35,
  },
  cellText: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '800',
  },
  cellTextActive: {
    color: chartColors.text,
  },
  cellTextLocked: {
    color: chartColors.muted,
  },
  pressed: {
    transform: [{ scale: 0.975 }],
  },
});
