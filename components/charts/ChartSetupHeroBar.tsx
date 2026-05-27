import React from "react";
import { StyleSheet, View } from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";

import type { ChartPreviewKind } from "./chartCatalog";
import ChartHubPreview from "./ChartHubPreview";
import {
  CHART_COLORS,
  withChartAlpha,
  type ChartTone,
} from "./chartVisualSystem";

type Props = {
  title: string;
  takeaway: string;
  chips: string[];
  preview: ChartPreviewKind;
  tone: ChartTone;
  setupOpen: boolean;
  onToggleSetup: () => void;
  onBackToCommand: () => void;
};

export default function ChartSetupHeroBar({
  title,
  takeaway,
  chips,
  preview,
  tone,
  setupOpen,
  onToggleSetup,
  onBackToCommand,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.previewWrap}>
          <ChartHubPreview kind={preview} tone={tone} width={58} height={36} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Charts</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.takeaway} numberOfLines={1}>
            {takeaway}
          </Text>
        </View>
      </View>

      {chips.length ? (
        <View style={styles.chipRow}>
          {chips.slice(0, 4).map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionButton
          title={setupOpen ? "Close Setup" : "Edit Setup"}
          variant="secondary"
          onPress={onToggleSetup}
          style={styles.actionButton}
        />
        <ActionButton
          title="Command"
          variant="ghost"
          onPress={onBackToCommand}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withChartAlpha(CHART_COLORS.sub, 0.28),
    backgroundColor: withChartAlpha(CHART_COLORS.cardAlt, 0.92),
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewWrap: {
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    color: CHART_COLORS.blue,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 20,
    fontWeight: "900",
  },
  takeaway: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(CHART_COLORS.sub, 0.24),
    backgroundColor: withChartAlpha(CHART_COLORS.bg, 0.56),
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flexGrow: 1,
  },
});
