import React from "react";
import { StyleSheet, View } from "react-native";

import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";
import { formatMetricValue } from "@/utils/formatters";

type PlayerProfileMetricCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "blue" | "green" | "red" | "danger";
};

type PlayerProfileMetricTabsProps = {
  activeTab: string;
  featuredCard: PlayerProfileMetricCard | null;
  insightBody: string;
  insightTitle: string;
  secondaryCards: PlayerProfileMetricCard[];
  secondaryInsightBody?: string | null;
  sectionCards: PlayerProfileMetricCard[];
  sectionSubtitle: string;
  sectionTitle: string;
  signalsTitle: string;
};

function toneStyles(tone?: PlayerProfileMetricCard["tone"]) {
  switch (tone) {
    case "accent":
      return { bg: COLORS.accentSoft, value: COLORS.accent };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "green":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    case "red":
    case "danger":
      return { bg: COLORS.redSoft, value: COLORS.red };
    default:
      return { bg: COLORS.whiteSoft, value: COLORS.text };
  }
}

export default function PlayerProfileMetricTabs({
  activeTab,
  featuredCard,
  insightBody,
  insightTitle,
  secondaryCards,
  secondaryInsightBody = null,
  sectionCards,
  sectionSubtitle,
  sectionTitle,
  signalsTitle,
}: PlayerProfileMetricTabsProps) {
  return (
    <>
      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{signalsTitle}</Text>
          <View style={styles.sectionHeaderMeta}>
            <DefinitionsJumpLink category="elo" />
          </View>
        </View>

        {featuredCard ? (
          <View style={styles.featuredSignalsWrap}>
            <View
              style={[
                styles.featuredSignalCard,
                {
                  backgroundColor: toneStyles(featuredCard.tone).bg,
                },
              ]}
            >
              <DefinitionTermText
                label={featuredCard.label}
                metric={featuredCard.key}
                category="elo"
                numberOfLines={1}
                style={styles.featuredSignalLabel}
              />
              <Text
                style={[
                  styles.featuredSignalValue,
                  { color: toneStyles(featuredCard.tone).value },
                ]}
              >
                {featuredCard.value}
              </Text>
              {featuredCard.sub ? (
                <Text style={styles.featuredSignalSub} numberOfLines={2}>
                  {featuredCard.sub}
                </Text>
              ) : null}
            </View>

            <View style={styles.secondarySignalColumn}>
              {secondaryCards.map((card) => {
                const tone = toneStyles(card.tone);
                return (
                  <View
                    key={card.key}
                    style={[styles.secondarySignalCard, { backgroundColor: tone.bg }]}
                  >
                    <DefinitionTermText
                      label={card.label}
                      metric={card.key}
                      category="elo"
                      numberOfLines={1}
                      style={styles.metricLabelCompact}
                    />
                    <Text style={[styles.metricValueCompact, { color: tone.value }]}>
                      {card.value}
                    </Text>
                    {card.sub ? (
                      <Text style={styles.metricSubCompact} numberOfLines={1}>
                        {card.sub}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No ELO rows available for this player yet.</Text>
        )}
      </View>

      <View style={styles.insightCardCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{insightTitle}</Text>
          <Text style={styles.insightChip}>{activeTab.toUpperCase()}</Text>
        </View>
        <Text style={styles.insightText}>{insightBody}</Text>
        {secondaryInsightBody ? (
          <Text style={styles.insightTextSecondary}>{secondaryInsightBody}</Text>
        ) : null}
      </View>

      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <View style={styles.sectionHeaderMeta}>
            <Text style={styles.sectionSub}>{sectionSubtitle}</Text>
            <DefinitionsJumpLink category="elo" />
          </View>
        </View>

        {sectionCards.length === 0 ? (
          <Text style={styles.emptyText}>No metric data available yet.</Text>
        ) : (
          <View style={styles.metricGridDense}>
            {sectionCards.map((card) => {
              const tone = toneStyles(card.tone);
              return (
                <View
                  key={card.key}
                  style={[styles.metricCardDense, { backgroundColor: tone.bg }]}
                >
                  <DefinitionTermText
                    label={card.label}
                    metric={card.key}
                    category="elo"
                    numberOfLines={2}
                    style={styles.metricLabelCompact}
                  />
                  <Text style={[styles.metricValueCompact, { color: tone.value }]}>
                    {formatMetricValue(card.value)}
                  </Text>
                  {card.sub ? (
                    <Text style={styles.metricSubCompact} numberOfLines={2}>
                      {card.sub}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  insightCardCompact: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 6,
  },
  sectionHeaderMeta: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 1,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  featuredSignalsWrap: {
    flexDirection: "row",
    gap: 4,
  },
  featuredSignalCard: {
    width: "52%",
    minHeight: 150,
    borderRadius: 14,
    padding: 10,
    justifyContent: "space-between",
  },
  featuredSignalLabel: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 14,
    marginBottom: 6,
  },
  featuredSignalValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 6,
  },
  featuredSignalSub: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  secondarySignalColumn: {
    width: "46%",
    justifyContent: "space-between",
    gap: 4,
  },
  secondarySignalCard: {
    borderRadius: 12,
    padding: 10,
    minHeight: 72,
  },
  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metricCardDense: {
    width: "32%",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 72,
    justifyContent: "center",
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  metricSubCompact: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
  },
  insightChip: {
    color: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: "800",
  },
  insightText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },
  insightTextSecondary: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },
});
