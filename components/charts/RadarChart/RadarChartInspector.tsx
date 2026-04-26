import React from "react";
import { StyleSheet, View } from "react-native";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import Text from "@/components/ui/Text";
import { CHART_COLORS } from "../chartVisualSystem";

type Props = {
  title?: string;
  body?: string;
  primaryLabel?: string;
  primaryValue?: string;
  comparisonLabel?: string;
  comparisonValue?: string;
  deltaValue?: number;
  accentColor?: string;
};

export default function RadarChartInspector({
  title = "Radar Focus",
  body = "Tap a radar point to inspect a trait.",
  primaryLabel = "Primary",
  primaryValue = "--",
  comparisonLabel,
  comparisonValue,
  deltaValue,
  accentColor = CHART_COLORS.accent,
}: Props) {
  const hasDelta = typeof deltaValue === "number" && Number.isFinite(deltaValue);

  return (
    <ChartFocusCard
      title={title}
      value={primaryValue}
      helper={
        comparisonValue && comparisonLabel
          ? `${primaryLabel} vs ${comparisonLabel}`
          : primaryLabel
      }
      story={body}
      tone="compact"
      accentColor={accentColor}
    >
      {comparisonValue ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{comparisonLabel}</Text>
          <Text style={styles.rowValue}>{comparisonValue}</Text>
        </View>
      ) : null}
      {hasDelta ? (
        <Text
          style={[
            styles.delta,
            deltaValue > 0 ? styles.deltaPos : null,
            deltaValue < 0 ? styles.deltaNeg : null,
          ]}
        >
          Delta {deltaValue > 0 ? "+" : ""}
          {Math.round(deltaValue * 100)} pts
        </Text>
      ) : null}
    </ChartFocusCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  rowLabel: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
  },
  rowValue: {
    color: CHART_COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  delta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: CHART_COLORS.text,
  },
  deltaPos: {
    color: CHART_COLORS.green,
  },
  deltaNeg: {
    color: CHART_COLORS.red,
  },
});

