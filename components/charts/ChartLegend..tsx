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
                  ? withAlpha(item.color, 0.16)
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
    gap: 6,
    paddingRight: 8,
  },
  pill: {
    minHeight: 34,
    maxWidth: 156,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  textWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  label: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '800',
  },
  labelActive: {
    color: chartColors.text,
  },
  value: {
    color: chartColors.muted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
});
