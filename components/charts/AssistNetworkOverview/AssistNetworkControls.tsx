import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "@/components/ui/Text";
import type { AssistNetworkMode } from "./buildAssistNetworkLayout";

const COLORS = {
  text: "#E2E8F0",
  sub: "#94A3B8",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
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

function getLabel(mode: AssistNetworkMode) {
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

function UnderlineOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {label}
      </Text>
      <View style={[styles.optionLine, active && styles.optionLineActive]} />
    </Pressable>
  );
}

export default function AssistNetworkControls({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Assist Metric</Text>
      <View style={styles.row}>
        {ASSIST_NETWORK_MODES.map((mode) => (
          <UnderlineOption
            key={mode}
            label={getLabel(mode)}
            active={value === mode}
            onPress={() => onChange(mode)}
          />
        ))}
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  option: {
    paddingBottom: 2,
  },
  optionText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  optionTextActive: {
    color: COLORS.accent,
  },
  optionLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  optionLineActive: {
    backgroundColor: COLORS.accent,
  },
});

