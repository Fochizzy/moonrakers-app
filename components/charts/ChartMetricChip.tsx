import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { chartSurfaceTokens } from "@/utils/chartSurfaceTokens";

type Props = {
  label: string;
};

export default function ChartMetricChip({ label }: Props) {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: chartSurfaceTokens.chipBackground,
    borderWidth: 1,
    borderColor: chartSurfaceTokens.chipBorder,
  },
  text: {
    color: chartSurfaceTokens.chipText,
    fontSize: 11,
    fontWeight: "700",
  },
});
