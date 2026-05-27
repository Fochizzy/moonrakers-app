import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";

export type AnalyticsSourceKind =
  | "server"
  | "server-stale"
  | "supabase-fallback"
  | "device-fallback";

export function describeAnalyticsSource(
  kind: AnalyticsSourceKind,
  label?: string | null,
) {
  switch (kind) {
    case "server-stale":
      return {
        label: label?.trim() || "Stale server data",
        body: "The last successful Supabase payload is still showing because the latest refresh failed.",
        borderColor: "rgba(45, 212, 191, 0.34)",
        backgroundColor: "rgba(4, 47, 46, 0.24)",
        textColor: "#5EEAD4",
      };
    case "supabase-fallback":
      return {
        label: label?.trim() || "Supabase fallback",
        body: "Direct Supabase history is filling in while the published analytics payload is unavailable or empty.",
        borderColor: "rgba(94, 234, 212, 0.30)",
        backgroundColor: "rgba(17, 94, 89, 0.26)",
        textColor: "#99F6E4",
      };
    case "device-fallback":
      return {
        label: label?.trim() || "Device fallback",
        body: "Saved history on this device is filling in while published analytics are unavailable.",
        borderColor: "rgba(167, 139, 250, 0.34)",
        backgroundColor: "rgba(49, 46, 129, 0.22)",
        textColor: "#C4B5FD",
      };
    case "server":
    default:
      return {
        label: label?.trim() || "Server data",
        body: "Published analytics payload from Supabase.",
        borderColor: "rgba(103, 232, 249, 0.30)",
        backgroundColor: "rgba(8, 47, 73, 0.24)",
        textColor: "#67E8F9",
      };
  }
}

export default function AnalyticsSourceBadge({
  kind,
  label,
}: {
  kind: AnalyticsSourceKind;
  label?: string | null;
}) {
  const tone = describeAnalyticsSource(kind, label);

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: tone.borderColor,
          backgroundColor: tone.backgroundColor,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: tone.textColor }]}>
        {tone.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
