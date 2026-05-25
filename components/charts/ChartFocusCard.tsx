import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import Text from "@/components/ui/Text";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  getChartStagePreset,
  withChartAlpha,
  type ChartStageTone,
} from "./chartVisualSystem";

type Props = {
  title: string;
  value?: string;
  helper?: string;
  story?: string;
  tone?: ChartStageTone;
  accentColor?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
};

export default function ChartFocusCard({
  title,
  value,
  helper,
  story,
  tone = "standard",
  accentColor,
  compact = false,
  style,
  leading,
  trailing,
  children,
}: Props) {
  const preset = getChartStagePreset(tone);
  const resolvedAccent = accentColor || CHART_COLORS.accent;
  const backgroundColor =
    tone === "compact" && accentColor
      ? withChartAlpha(resolvedAccent, 0.12)
      : preset.focusCardFill;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor,
          borderColor: accentColor
            ? withChartAlpha(resolvedAccent, tone === "compact" ? 0.42 : 0.34)
            : preset.focusCardBorder,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {leading ? leading : null}
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {value ? (
          <Text
            style={[styles.value, compact && styles.valueCompact, { color: resolvedAccent }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {trailing ? trailing : null}
      </View>

      {helper ? (
        <Text
          style={[styles.helper, compact && styles.helperCompact]}
          numberOfLines={compact ? 1 : undefined}
        >
          {helper}
        </Text>
      ) : null}
      {story ? (
        <Text
          style={[styles.story, compact && styles.storyCompact]}
          numberOfLines={compact ? 1 : undefined}
        >
          {story}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CHART_LAYOUT.cardRadius - 2,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cardCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    color: CHART_COLORS.textStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  titleCompact: {
    fontSize: 12,
  },
  value: {
    fontSize: 13,
    fontWeight: "900",
  },
  valueCompact: {
    fontSize: 12,
  },
  helper: {
    color: withChartAlpha("#FFFFFF", 0.68),
    fontSize: 11,
    fontWeight: "700",
  },
  helperCompact: {
    fontSize: 10,
  },
  story: {
    color: withChartAlpha("#FFFFFF", 0.84),
    fontSize: 11,
    fontWeight: "800",
  },
  storyCompact: {
    fontSize: 10,
  },
});
