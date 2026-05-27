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
  badge?: string | null;
  kind?: "default" | "action";
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
            style={[
              styles.tabButton,
              item.kind === "action" && styles.tabButtonAction,
            ]}
            onPress={() => onChange(item.key)}
          >
            <View style={styles.tabLabelRow}>
              <Text
                style={[
                  styles.tabText,
                  item.kind === "action" && styles.tabTextAction,
                  active && styles.tabTextActive,
                ]}
              >
                {item.label}
              </Text>
              {item.badge ? (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text
                    style={[
                      styles.tabBadgeText,
                      active && styles.tabBadgeTextActive,
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.tabLine,
                item.kind === "action" && styles.tabLineAction,
                active && styles.tabLineActive,
              ]}
            />
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
  tabButtonAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_COLORS.accent,
    backgroundColor: withChartAlpha(CHART_COLORS.panel, 0.72),
  },
  tabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabText: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },
  tabTextAction: {
    color: CHART_COLORS.textStrong,
  },
  tabTextActive: {
    color: CHART_COLORS.textStrong,
  },
  tabBadge: {
    minHeight: 18,
    borderRadius: 999,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withChartAlpha(CHART_COLORS.accent, 0.14),
    borderWidth: 1,
    borderColor: CHART_COLORS.accent,
  },
  tabBadgeActive: {
    backgroundColor: CHART_COLORS.accent,
  },
  tabBadgeText: {
    color: CHART_COLORS.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  tabBadgeTextActive: {
    color: CHART_COLORS.panel,
  },
  tabLine: {
    height: 2,
    borderRadius: 999,
    backgroundColor: withChartAlpha(CHART_COLORS.accent, 0),
  },
  tabLineAction: {
    backgroundColor: withChartAlpha(CHART_COLORS.accent, 0.22),
  },
  tabLineActive: {
    backgroundColor: CHART_COLORS.accent,
  },
});
