import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import ChartInfoCard from "./ChartInfoCard";
import type { ChartProofCard } from "./chartPageModel";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  getChartToneStyles,
} from "./chartVisualSystem";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  takeaway: string;
  proofCards?: ChartProofCard[];
  summaryVariant?: "default" | "compact";
  children?: React.ReactNode;
};

export default function ChartShell({
  eyebrow,
  title,
  subtitle,
  takeaway,
  proofCards = [],
  summaryVariant = "default",
  children,
}: Props) {
  const compactSummary = summaryVariant === "compact";
  const visibleProofCards = compactSummary
    ? proofCards.slice(0, 2)
    : proofCards.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={[styles.hero, compactSummary && styles.heroCompact]}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.title, compactSummary && styles.titleCompact]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, compactSummary && styles.subtitleCompact]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {compactSummary ? (
        <View style={styles.compactSummaryCard}>
          <View style={styles.compactSummaryHeader}>
            <Text style={styles.compactSummaryEyebrow}>Takeaway</Text>
          </View>
          <Text style={styles.takeawayCompact}>{takeaway}</Text>

          {visibleProofCards.length ? (
            <View style={styles.proofGridCompact}>
              {visibleProofCards.map((card) => {
                const tone = getChartToneStyles(card.tone ?? "neutral");
                return (
                  <View
                    key={`${card.label}-${card.value}`}
                    style={[
                      styles.proofCardCompact,
                      {
                        backgroundColor: tone.bg,
                        borderColor:
                          card.tone && card.tone !== "neutral"
                            ? `${tone.value}55`
                            : CHART_COLORS.border,
                      },
                    ]}
                  >
                    <Text style={styles.proofLabel}>{card.label}</Text>
                    <Text
                      style={[styles.proofValueCompact, { color: tone.value }]}
                      numberOfLines={2}
                    >
                      {card.value}
                    </Text>
                    {card.helper ? (
                      <Text style={styles.proofHelperCompact} numberOfLines={2}>
                        {card.helper}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <ChartInfoCard
            title="Takeaway"
            sub="Read this first"
            tone="accent"
            variant="highlight"
            emphasized
          >
            <Text style={styles.takeaway}>{takeaway}</Text>
          </ChartInfoCard>

          {visibleProofCards.length ? (
            <View style={styles.proofGrid}>
              {visibleProofCards.map((card) => {
                const tone = getChartToneStyles(card.tone ?? "neutral");
                return (
                  <View
                    key={`${card.label}-${card.value}`}
                    style={[
                      styles.proofCard,
                      {
                        backgroundColor: tone.bg,
                        borderColor:
                          card.tone && card.tone !== "neutral"
                            ? `${tone.value}55`
                            : CHART_COLORS.border,
                      },
                    ]}
                  >
                    <Text style={styles.proofLabel}>{card.label}</Text>
                    <Text style={[styles.proofValue, { color: tone.value }]} numberOfLines={2}>
                      {card.value}
                    </Text>
                    {card.helper ? (
                      <Text style={styles.proofHelper} numberOfLines={2}>
                        {card.helper}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  hero: {
    gap: 4,
  },
  heroCompact: {
    gap: 2,
  },
  eyebrow: {
    color: CHART_COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 24,
    fontWeight: "900",
  },
  titleCompact: {
    fontSize: 20,
  },
  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
  takeaway: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  compactSummaryCard: {
    borderRadius: CHART_LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: `${CHART_COLORS.accent}40`,
    backgroundColor: CHART_COLORS.cardAlt,
    padding: 7,
    gap: 5,
  },
  compactSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactSummaryEyebrow: {
    color: CHART_COLORS.accent,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  takeawayCompact: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  proofGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  proofGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  proofCard: {
    width: "48%",
    minHeight: 92,
    borderRadius: CHART_LAYOUT.cardRadius,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "space-between",
    gap: 6,
  },
  proofCardCompact: {
    width: "48%",
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 6,
    justifyContent: "space-between",
    gap: 4,
  },
  proofLabel: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  proofValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  proofHelper: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  proofValueCompact: {
    fontSize: 14,
    fontWeight: "900",
  },
  proofHelperCompact: {
    color: CHART_COLORS.sub,
    fontSize: 9,
    lineHeight: 12,
  },
});
