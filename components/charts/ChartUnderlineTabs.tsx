import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import Text from "@/components/ui/Text";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";

export type ChartUnderlineTab = {
  key: string;
  label: string;
};

type Props = {
  items: ChartUnderlineTab[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
};

export default function ChartUnderlineTabs({
  items,
  activeKey,
  onChange,
  style,
}: Props) {
  if (!items.length) return null;

  return (
    <View style={[styles.row, style]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            style={styles.tabButton}
            onPress={() => onChange(item.key)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {item.label}
            </Text>
            <View style={[styles.tabLine, active && styles.tabLineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabButton: {
    gap: 4,
  },
  tabText: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },
  tabTextActive: {
    color: CHART_COLORS.textStrong,
  },
  tabLine: {
    height: 2,
    borderRadius: 999,
    backgroundColor: withChartAlpha(CHART_COLORS.accent, 0),
  },
  tabLineActive: {
    backgroundColor: CHART_COLORS.accent,
  },
});
