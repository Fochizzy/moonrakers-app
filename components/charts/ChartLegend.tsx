import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import {
  CHART_COLORS,
  getQuietChipStyle,
  withChartAlpha,
  type ChartTone,
} from "./chartVisualSystem";

export type ChartLegendItem = {
  label: string;
  color?: string;
  value?: string;
  tone?: ChartTone;
};

type Props = {
  items: ChartLegendItem[];
};

export default function ChartLegend({ items }: Props) {
  if (!items.length) return null;

  return (
    <View style={styles.row}>
      {items.map((item) => {
        const quiet = getQuietChipStyle(item.tone ?? "neutral");

        return (
          <View
            key={`${item.label}-${item.value ?? ""}`}
            style={[
              styles.chip,
              {
                backgroundColor: quiet.backgroundColor,
                borderColor: quiet.borderColor,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    item.color ||
                    withChartAlpha(
                      item.tone && item.tone !== "neutral"
                        ? quiet.textColor
                        : CHART_COLORS.textStrong,
                      0.85
                    ),
                },
              ]}
            />
            <Text style={[styles.label, { color: quiet.textColor }]}>{item.label}</Text>
            {item.value ? <Text style={styles.value}>{item.value}</Text> : null}
          </View>
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
  },
  value: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
  },
});
