import React from "react";
import { StyleSheet, View } from "react-native";

import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import Text from "@/components/ui/Text";
import type { AssistNetworkMode } from "./buildAssistNetworkLayout";

const COLORS = {
  text: "#E2E8F0",
  sub: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

export const ASSIST_NETWORK_MODES = [
  "assistPrestige",
  "assistCount",
  "assistEfficiency",
  "supportBalance",
] as const;

type Props = {
  value: AssistNetworkMode;
  onChange: (mode: AssistNetworkMode) => void;
};

export function getAssistNetworkLabel(mode: AssistNetworkMode) {
  switch (mode) {
    case "assistPrestige":
      return "Prestige";
    case "assistCount":
      return "Count";
    case "assistEfficiency":
      return "Efficiency";
    case "supportBalance":
      return "Balance";
    default:
      return mode;
  }
}

export default function AssistNetworkControls({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Assist Metric</Text>
      <View style={styles.shell}>
        <ChartUnderlineTabs
          items={ASSIST_NETWORK_MODES.map((mode) => ({
            key: mode,
            label: getAssistNetworkLabel(mode),
          }))}
          activeKey={value}
          onChange={(mode) => onChange(mode as AssistNetworkMode)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },
  shell: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
