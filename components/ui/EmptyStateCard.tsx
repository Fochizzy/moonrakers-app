import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";

type EmptyStateCardProps = {
  message: string;
  hint?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyStateCard({
  message,
  hint,
  icon,
  actionLabel,
  onAction,
}: EmptyStateCardProps) {
  return (
    <View style={styles.card}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    gap: 6,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 2,
  },
  message: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "700",
  },
  hint: {
    color: "#7D9BC4",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  action: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.36)",
    backgroundColor: "rgba(96,165,250,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
  },
});
