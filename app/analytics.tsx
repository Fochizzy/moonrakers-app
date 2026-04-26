import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { useStore } from "@/store/useStore";
import { getAnalyticsHubCards } from "@/utils/appHubs";
import { APP_ICONS } from "@/utils/iconAccess";

const CARD_TONES: Record<
  string,
  {
    accent: string;
    border: string;
    glow: string;
    fill: string;
    panel: string;
  }
> = {
  compare: {
    accent: "#7DD3FC",
    border: "rgba(125,211,252,0.32)",
    glow: "rgba(125,211,252,0.14)",
    fill: "rgba(14,39,58,0.9)",
    panel: "rgba(10,29,43,0.54)",
  },
  charts: {
    accent: "#A78BFA",
    border: "rgba(167,139,250,0.32)",
    glow: "rgba(129,140,248,0.14)",
    fill: "rgba(28,26,58,0.9)",
    panel: "rgba(25,24,49,0.54)",
  },
  stats: {
    accent: "#C084FC",
    border: "rgba(192,132,252,0.32)",
    glow: "rgba(168,85,247,0.14)",
    fill: "rgba(40,26,63,0.9)",
    panel: "rgba(34,20,56,0.54)",
  },
  elo: {
    accent: "#34D399",
    border: "rgba(52,211,153,0.34)",
    glow: "rgba(16,185,129,0.15)",
    fill: "rgba(20,54,52,0.9)",
    panel: "rgba(15,48,44,0.54)",
  },
  insights: {
    accent: "#F472B6",
    border: "rgba(244,114,182,0.34)",
    glow: "rgba(236,72,153,0.14)",
    fill: "rgba(63,24,48,0.9)",
    panel: "rgba(56,20,44,0.54)",
  },
};

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function CroppedHubIcon({
  iconKey,
  accent,
}: {
  iconKey: ReturnType<typeof getAnalyticsHubCards>[number]["iconKey"];
  accent: string;
}) {
  return (
    <View style={[styles.iconShell, { borderColor: `${accent}44` }]}>
      <View style={styles.iconPreviewFrame}>
        <Image source={APP_ICONS[iconKey]} resizeMode="contain" style={styles.iconImage} />
      </View>
    </View>
  );
}

function AnalyticsCard({
  accent,
  card,
  fullWidth = false,
  onPress,
  tone,
}: {
  accent: string;
  card: ReturnType<typeof getAnalyticsHubCards>[number];
  fullWidth?: boolean;
  onPress: () => void;
  tone: (typeof CARD_TONES)[string];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        fullWidth ? styles.cardWide : styles.cardStandard,
        {
          borderColor: tone.border,
          backgroundColor: tone.fill,
          shadowColor: accent,
        },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <CroppedHubIcon iconKey={card.iconKey} accent={accent} />
        <Text style={[styles.cardEyebrow, { color: accent }]}>{card.eyebrow}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <View style={[styles.cardBodyPanel, { backgroundColor: tone.panel }]}>
          <Text style={styles.cardDescription}>{card.description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const cards = useMemo(() => getAnalyticsHubCards(), []);
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));

  const standardCards = cards.filter((card) => card.key !== "insights");
  const insightsCard = cards.find((card) => card.key === "insights") ?? null;

  return (
    <PageShell
      preset="analytics"
      density="compact"
      contentContainerStyle={styles.pageContent}
    >
      <HeroCard
        eyebrow="Data Center"
        title="Analytics"
        size="compact"
        variant="stat"
        style={styles.heroCard}
      >
        <View style={styles.statsRow}>
          <StatBlock label="Players" value={players.length} />
          <StatBlock label="Games" value={games.length} />
          <StatBlock label="Views" value={cards.length} />
        </View>
      </HeroCard>

      <View style={styles.grid}>
        {standardCards.map((card) => {
          const tone = CARD_TONES[card.key] ?? CARD_TONES.charts;

          return (
            <AnalyticsCard
              key={card.key}
              accent={tone.accent}
              card={card}
              onPress={() => router.push(card.route as any)}
              tone={tone}
            />
          );
        })}

        {insightsCard ? (
          <AnalyticsCard
            accent={CARD_TONES.insights.accent}
            card={insightsCard}
            fullWidth
            onPress={() => router.push(insightsCard.route as any)}
            tone={CARD_TONES.insights}
          />
        ) : null}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    gap: 12,
    paddingBottom: 18,
  },
  heroCard: {
    borderRadius: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBlock: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  statLabel: {
    color: "#D7E7FF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cardStandard: {
    width: "48.5%",
    minHeight: 172,
  },
  cardWide: {
    width: "100%",
    minHeight: 120,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconShell: {
    width: 64,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPreviewFrame: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  iconImage: {
    width: 40,
    height: 40,
  },
  cardEyebrow: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    textAlign: "right",
  },
  cardBody: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  cardBodyPanel: {
    marginTop: "auto",
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "flex-start",
  },
  cardDescription: {
    color: "#E8EEF8",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
});
