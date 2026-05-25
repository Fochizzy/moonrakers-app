import React from "react";
import { StyleSheet, View } from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";

type RecoveryAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export default function AnalyticsRecoveryCard({
  title,
  body,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  body: string;
  primaryAction: RecoveryAction;
  secondaryAction?: RecoveryAction | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>

      <View style={styles.actions}>
        <ActionButton
          title={primaryAction.label}
          onPress={primaryAction.onPress}
          variant={primaryAction.variant ?? "primary"}
          style={styles.action}
        />

        {secondaryAction ? (
          <ActionButton
            title={secondaryAction.label}
            onPress={secondaryAction.onPress}
            variant={secondaryAction.variant ?? "secondary"}
            style={styles.action}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.22)",
    backgroundColor: "rgba(6, 14, 28, 0.88)",
    padding: 14,
    gap: 12,
  },
  copy: {
    gap: 6,
  },
  title: {
    color: "#F8FBFF",
    fontSize: 16,
    fontWeight: "900",
  },
  body: {
    color: "#C7D6F3",
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  action: {
    flexGrow: 1,
    flexBasis: "48%",
  },
});
