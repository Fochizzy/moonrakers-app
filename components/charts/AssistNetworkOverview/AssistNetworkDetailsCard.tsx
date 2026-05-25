import React from "react";
import { StyleSheet, View } from "react-native";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import Text from "@/components/ui/Text";

const COLORS = {
  text: "#E2E8F0",
  sub: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

type Props = {
  hubName: string;
  netGiverName: string;
  netReceiverName: string;
  topLinkLabel: string;
  topLinkValue: string;
  story: string;
};

export default function AssistNetworkDetailsCard({
  hubName,
  netGiverName,
  netReceiverName,
  topLinkLabel,
  topLinkValue,
  story,
}: Props) {
  return (
    <View style={styles.wrap}>
      <ChartFocusCard
        title={hubName}
        value="Assist Hub"
        helper="Current exact-table hub"
        story={story}
        tone="comparison"
      />

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>Net Giver</Text>
          <Text style={styles.value}>{netGiverName}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Net Receiver</Text>
          <Text style={styles.value}>{netReceiverName}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Strongest Link</Text>
          <Text style={styles.value}>{topLinkLabel}</Text>
          <Text style={styles.helper}>
            {`${topLinkValue} across the exact filtered table`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
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
    gap: 4,
  },
  label: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  value: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  helper: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
});
