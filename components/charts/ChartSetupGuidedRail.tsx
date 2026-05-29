import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";

import ChartStage from "./ChartStage";
import type { ChartSetupStageStatus } from "./chartSetupRailModel";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";

type ChartSetupStageShellProps = {
  index: number;
  title: string;
  hideStepLabel?: boolean;
  hideTitle?: boolean;
  hideHelperText?: boolean;
  helper?: string | null;
  lockedHelper?: string | null;
  summary?: string | null;
  status: "active" | "completed" | "locked";
  onEdit?: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export function ChartSetupStageShell({
  index,
  title,
  hideStepLabel = false,
  hideTitle = false,
  hideHelperText = false,
  helper,
  lockedHelper,
  summary,
  status,
  onEdit,
  children,
  footer,
}: ChartSetupStageShellProps) {
  const locked = status === "locked";
  const completed = status === "completed";
  const active = status === "active";
  const displayTitle = title.trim();
  const helperText = hideHelperText
    ? null
    : locked
      ? lockedHelper ||
        (displayTitle ? `Unlocks after ${displayTitle}` : "Unlocks after the previous stage")
      : completed
        ? summary
        : helper;
  const shouldRenderHeader = Boolean(
    (!hideStepLabel && index >= 1) ||
      (!hideTitle && displayTitle) ||
      helperText ||
      (completed && onEdit)
  );

  return (
    <ChartStage
      tone={active ? "standard" : "compact"}
      style={[styles.stage, locked && styles.stageLocked]}
      header={shouldRenderHeader ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {!hideStepLabel ? <Text style={styles.stepEyebrow}>{`Step ${index}`}</Text> : null}
            {!hideTitle && displayTitle ? <Text style={styles.title}>{displayTitle}</Text> : null}
            {helperText ? (
              <Text style={completed ? styles.summary : styles.helper}>
                {helperText}
              </Text>
            ) : null}
          </View>
          {completed && onEdit ? (
            <Pressable onPress={onEdit} style={styles.editChip}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      footer={footer ? <View style={styles.footer}>{footer}</View> : null}
    >
      {locked ? <View style={styles.lockedBody} /> : children}
    </ChartStage>
  );
}

export function ChartSetupStageAction({
  title,
  subtitle,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      variant="primary"
    />
  );
}

export type { ChartSetupStageStatus };

const styles = StyleSheet.create({
  stage: {
    gap: 10,
  },
  stageLocked: {
    opacity: 0.82,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  stepEyebrow: {
    color: CHART_COLORS.blue,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  helper: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 17,
  },
  summary: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  editChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(CHART_COLORS.blue, 0.35),
    backgroundColor: withChartAlpha(CHART_COLORS.blue, 0.12),
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editText: {
    color: CHART_COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
  },
  lockedBody: {
    minHeight: 2,
  },
  footer: {
    marginTop: 4,
  },
});
