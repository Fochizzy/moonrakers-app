import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { chartSurfaceTokens } from "@/utils/chartSurfaceTokens";

type Props = {
  label: string;
  value: string;
};

export default function ChartInsightStrip({ label, value }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: chartSurfaceTokens.divider,
  },
  label: {
    color: chartSurfaceTokens.subtitle,
    fontSize: 12,
    flex: 1,
  },
  value: {
    color: chartSurfaceTokens.title,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
});
