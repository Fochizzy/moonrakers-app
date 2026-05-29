import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";

type Props = {
  label?: string | null;
  color?: string | null;
};

export default function SeriesIdentityBadge({
  label,
  color,
}: Props) {
  if (!label) {
    return null;
  }

  const accent = color || CHART_COLORS.accent;

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: withChartAlpha(accent, 0.42),
          backgroundColor: withChartAlpha(accent, 0.14),
        },
      ]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 24,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: CHART_COLORS.textStrong,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 0.35,
  },
});
