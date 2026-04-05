import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type LegendItem = {
  key: string;
  label: string;
  color: string;
  value?: string;
};

type Props = {
  items?: LegendItem[];
  activeKey?: string | null;
  onPressItem?: (key: string) => void;
};

export default function ChartLegend({
  items = [],
  activeKey = null,
  onPressItem,
}: Props) {
  if (!items.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const active = activeKey === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={onPressItem ? () => onPressItem(item.key) : undefined}
            disabled={!onPressItem}
            style={[
              styles.pill,
              {
                borderColor: active ? item.color : chartColors.borderStrong,
                backgroundColor: active
                  ? withAlpha(item.color, 0.18)
                  : chartColors.panelBg,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View style={styles.textWrap}>
              <Text
                style={[styles.label, active ? styles.labelActive : null]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {item.value ? (
                <Text style={styles.value} numberOfLines={1}>
                  {item.value}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingRight: 12,
  },
  pill: {
    minHeight: 42,
    maxWidth: 180,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  textWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  label: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  labelActive: {
    color: chartColors.text,
  },
  value: {
    color: chartColors.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
});
