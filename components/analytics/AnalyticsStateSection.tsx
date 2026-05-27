import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import AnalyticsRecoveryCard, {
  type AnalyticsRecoveryTone,
  type RecoveryAction,
} from "@/components/analytics/AnalyticsRecoveryCard";
import AnalyticsSourceBadge, {
  type AnalyticsSourceKind,
} from "@/components/analytics/AnalyticsSourceBadge";
import ActionButton from "@/components/ui/ActionButton";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";

type AnalyticsStateSectionProps = {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string;
  helpCategory?: string | null;
  helpMetric?: string | null;
  messageBody?: string;
  messageTitle?: string;
  primaryAction?: RecoveryAction | null;
  secondaryAction?: RecoveryAction | null;
  sourceCaption?: string | null;
  sourceKind?: AnalyticsSourceKind | null;
  sourceLabel?: string | null;
  state: "ready" | "loading" | "error" | "empty";
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title?: string;
  tone?: AnalyticsRecoveryTone;
};

export default function AnalyticsStateSection({
  actions,
  children,
  eyebrow,
  helpCategory = null,
  helpMetric = null,
  messageBody,
  messageTitle,
  primaryAction = null,
  secondaryAction = null,
  sourceCaption = null,
  sourceKind = null,
  sourceLabel = null,
  state,
  style,
  subtitle,
  title,
  tone = "info",
}: AnalyticsStateSectionProps) {
  const showReadyStateActions =
    state === "ready" && (primaryAction || secondaryAction);
  const headerActions =
    sourceKind || actions ? (
      <View style={styles.headerActions}>
        {sourceKind ? (
          <AnalyticsSourceBadge kind={sourceKind} label={sourceLabel} />
        ) : null}
        {actions}
      </View>
    ) : undefined;

  return (
    <SectionCard
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={headerActions}
      style={style}
    >
      {state === "ready" ? (
        <>
          {sourceCaption ? (
            <Text style={styles.sourceCaption}>{sourceCaption}</Text>
          ) : null}
          {showReadyStateActions ? (
            <View style={styles.readyActions}>
              {primaryAction ? (
                <ActionButton
                  title={primaryAction.label}
                  onPress={primaryAction.onPress}
                  variant={primaryAction.variant ?? "secondary"}
                  style={styles.readyAction}
                />
              ) : null}
              {secondaryAction ? (
                <ActionButton
                  title={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  variant={secondaryAction.variant ?? "ghost"}
                  style={styles.readyAction}
                />
              ) : null}
            </View>
          ) : null}
          {children}
        </>
      ) : (
        <AnalyticsRecoveryCard
          title={messageTitle || "Analytics state"}
          body={messageBody || "No analytics detail is available yet."}
          tone={tone}
          sourceKind={sourceKind}
          sourceLabel={sourceLabel}
          helpCategory={helpCategory}
          helpMetric={helpMetric}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          compact
        />
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  sourceCaption: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 17,
    marginTop: -2,
  },
  readyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  readyAction: {
    flexGrow: 1,
    flexBasis: "48%",
  },
});
