import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import {
  getAppStatusTone,
  type AppStatusRecord,
} from "@/lib/app-status/types";
import Text from "@/components/ui/Text";

type Props = {
  status?: AppStatusRecord | null;
  onDismiss?: (() => void) | null;
  style?: ViewStyle;
};

const TONE_STYLES = {
  info: {
    borderColor: "rgba(96,165,250,0.35)",
    backgroundColor: "rgba(14,24,44,0.92)",
    eyebrowColor: "#93c5fd",
  },
  success: {
    borderColor: "rgba(74,222,128,0.35)",
    backgroundColor: "rgba(8,30,22,0.92)",
    eyebrowColor: "#86efac",
  },
  warning: {
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(42,29,7,0.92)",
    eyebrowColor: "#fde68a",
  },
  danger: {
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(48,14,14,0.92)",
    eyebrowColor: "#fca5a5",
  },
} as const;

export default function AppStatusBanner({
  status,
  onDismiss = null,
  style,
}: Props) {
  if (!status) {
    return null;
  }

  const tone = getAppStatusTone(status);
  const toneStyle = TONE_STYLES[tone];

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: toneStyle.borderColor,
          backgroundColor: toneStyle.backgroundColor,
        },
        style,
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: toneStyle.eyebrowColor }]}>
          {status.scope.replace(/_/g, " ")}
        </Text>
        <Text style={styles.title}>{status.title}</Text>
        {status.detail ? <Text style={styles.detail}>{status.detail}</Text> : null}
      </View>

      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  copy: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  detail: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
    lineHeight: 18,
  },
  dismissButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dismissText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
});
