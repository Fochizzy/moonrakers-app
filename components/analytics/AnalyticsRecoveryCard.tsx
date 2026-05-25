import React from "react";
import { StyleSheet, View } from "react-native";

import AnalyticsSourceBadge, {
  type AnalyticsSourceKind,
} from "@/components/analytics/AnalyticsSourceBadge";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";

export type RecoveryAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export type AnalyticsRecoveryTone = "info" | "warning" | "danger" | "success";

function resolveTone(tone: AnalyticsRecoveryTone) {
  switch (tone) {
    case "warning":
      return {
        borderColor: "rgba(251, 191, 36, 0.30)",
        backgroundColor: "rgba(40, 24, 10, 0.92)",
        eyebrowColor: "#FCD34D",
      };
    case "danger":
      return {
        borderColor: "rgba(248, 113, 113, 0.30)",
        backgroundColor: "rgba(42, 13, 18, 0.92)",
        eyebrowColor: "#FCA5A5",
      };
    case "success":
      return {
        borderColor: "rgba(34, 197, 94, 0.28)",
        backgroundColor: "rgba(10, 32, 20, 0.92)",
        eyebrowColor: "#86EFAC",
      };
    case "info":
    default:
      return {
        borderColor: "rgba(103, 232, 249, 0.22)",
        backgroundColor: "rgba(6, 14, 28, 0.88)",
        eyebrowColor: "#67E8F9",
      };
  }
}

export default function AnalyticsRecoveryCard({
  eyebrow,
  title,
  body,
  tone = "info",
  sourceKind = null,
  sourceLabel = null,
  helpCategory = null,
  helpMetric = null,
  primaryAction,
  secondaryAction,
  compact = false,
}: {
  eyebrow?: string | null;
  title: string;
  body: string;
  tone?: AnalyticsRecoveryTone;
  sourceKind?: AnalyticsSourceKind | null;
  sourceLabel?: string | null;
  helpCategory?: string | null;
  helpMetric?: string | null;
  primaryAction?: RecoveryAction | null;
  secondaryAction?: RecoveryAction | null;
  compact?: boolean;
}) {
  const toneStyles = resolveTone(tone);

  return (
    <View
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        {
          borderColor: toneStyles.borderColor,
          backgroundColor: toneStyles.backgroundColor,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerMeta}>
          {sourceKind ? (
            <AnalyticsSourceBadge kind={sourceKind} label={sourceLabel} />
          ) : null}
          {helpMetric || helpCategory ? (
            <DefinitionsJumpLink
              label="Glossary"
              metric={helpMetric}
              category={helpCategory}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.copy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: toneStyles.eyebrowColor }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={styles.body}>{body}</Text>
      </View>

      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <ActionButton
              title={primaryAction.label}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant ?? "primary"}
              style={styles.action}
            />
          ) : null}

          {secondaryAction ? (
            <ActionButton
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant ?? "secondary"}
              style={styles.action}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardCompact: {
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  headerMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  copy: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FBFF",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
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
