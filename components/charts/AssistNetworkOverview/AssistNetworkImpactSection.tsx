import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import type { AssistNetworkImpactResult } from "./buildAssistNetworkImpact";

const COLORS = {
  text: "#E2E8F0",
  sub: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
  positive: "#22C55E",
  negative: "#F97316",
};

type Props = {
  cards: AssistNetworkImpactResult["cards"];
  sampleGameCount: number;
};

function formatValue(label: string, value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (label === "Winning") {
    return `${safeValue.toFixed(1)}%`;
  }
  return safeValue.toFixed(2);
}

function formatDelta(label: string, value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const prefix = safeValue >= 0 ? "+" : "";
  if (label === "Winning") {
    return `${prefix}${safeValue.toFixed(1)} pts`;
  }
  return `${prefix}${safeValue.toFixed(2)}`;
}

export default function AssistNetworkImpactSection({
  cards,
  sampleGameCount,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        {`Table Impact - ${sampleGameCount} exact-match game${sampleGameCount === 1 ? "" : "s"}`}
      </Text>
      <View style={styles.grid}>
        {Object.values(cards).map((card) => (
          <View key={card.label} style={styles.card}>
            <Text style={styles.label}>{card.label}</Text>
            <Text style={styles.value}>{formatValue(card.label, card.sampleValue)}</Text>
            <Text style={styles.helper}>
              {`Baseline ${formatValue(card.label, card.baselineValue)} - Delta ${formatDelta(
                card.label,
                card.delta
              )}`}
            </Text>
            <View
              style={[
                styles.deltaBar,
                { backgroundColor: card.delta >= 0 ? COLORS.positive : COLORS.negative },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  heading: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    minWidth: "31%",
    flexGrow: 1,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 5,
  },
  label: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  value: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  helper: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  deltaBar: {
    height: 4,
    borderRadius: 999,
    marginTop: 2,
  },
});
