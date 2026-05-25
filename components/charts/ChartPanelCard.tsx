import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import Text from "@/components/ui/Text";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  getChartCardBackground,
  getChartCardBorder,
  getChartToneStyles,
  type ChartTone,
} from "./chartVisualTokens";

type Props = {
  title?: string;
  sub?: string;
  tone?: ChartTone;
  variant?: "default" | "alt" | "highlight";
  emphasized?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function ChartInfoCard({
  title,
  sub,
  tone = "neutral",
  variant = "default",
  emphasized = false,
  style,
  children,
}: Props) {
  const toneStyles = getChartToneStyles(tone);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getChartCardBackground(variant),
          borderColor: getChartCardBorder(tone, emphasized),
        },
        style,
      ]}
    >
      {title || sub ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {sub ? (
            <Text
              style={[
                styles.sub,
                emphasized && { color: toneStyles.value },
              ]}
            >
              {sub}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CHART_LAYOUT.cardRadius,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },
  sub: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
});
