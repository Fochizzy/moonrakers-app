import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { getAnalyticsHome } from "@/lib/cloud/analytics/getAnalyticsHome";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { getAnalyticsHubCards } from "@/utils/appHubs";
import { APP_ROUTES } from "@/utils/appRoutes";
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

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toCount(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

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
      {fullWidth ? (
        <View style={styles.cardWideRow}>
          <CroppedHubIcon iconKey={card.iconKey} accent={accent} />

          <View style={styles.cardWideContent}>
            <View style={styles.cardWideTitleWrap}>
              <Text style={[styles.cardTitle, styles.cardTitleWide]}>{card.title}</Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.cardHeader}>
            <CroppedHubIcon iconKey={card.iconKey} accent={accent} />
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{card.title}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const authSession = useStore((state: any) => state.authSession);
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const cards = useMemo(() => getAnalyticsHubCards(), []);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const profileId = String(authSession?.user?.id ?? "").trim();
      if (!profileId) {
        if (!cancelled) {
          setPayload(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextPayload = await getAnalyticsHome({
          profileId,
        });

        if (!cancelled) {
          setPayload(toRecord(nextPayload));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(formatSupabaseConfigError(nextError) || "Failed to load analytics.");
          setPayload(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id, analyticsRefreshTick]);

  const hero = toRecord(payload?.hero);
  const standardCards = cards.filter((card) => card.key !== "insights");
  const insightsCard = cards.find((card) => card.key === "insights") ?? null;
  const heroMessage = error
    ? error
    : loading
      ? "Syncing Supabase-authored analytics."
      : "Counts on this screen come from Supabase analytics payloads.";

  return (
    <PageShell
      preset="analytics"
      density="compact"
      contentContainerStyle={styles.pageContent}
    >
      <HeroCard
        eyebrow="Data Center"
        headerAction={
          <Pressable
            style={styles.commandButton}
            onPress={() => router.push(APP_ROUTES.home)}
          >
            <Text style={styles.commandButtonText}>Back to Command</Text>
          </Pressable>
        }
        title="Analytics"
        size="compact"
        variant="stat"
        style={styles.heroCard}
      >
        <View style={styles.statsRow}>
          <StatBlock label="Players" value={toCount(hero.players)} />
          <StatBlock label="Games" value={toCount(hero.games)} />
          <StatBlock label="Views" value={toCount(hero.views, cards.length)} />
        </View>
        <Text style={styles.heroMeta}>{heroMessage}</Text>
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
    gap: 10,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 22,
  },
  commandButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(117, 211, 252, 0.28)",
    backgroundColor: "rgba(8, 18, 32, 0.84)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commandButtonText: {
    color: "#DFF6FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroMeta: {
    color: "#BBD2F6",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
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
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    gap: 8,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cardStandard: {
    width: "48.5%",
    minHeight: 168,
  },
  cardWide: {
    width: "100%",
    minHeight: 140,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardWideRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardWideContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    position: "relative",
    paddingRight: 8,
  },
  iconShell: {
    width: 128,
    height: 104,
    borderRadius: 28,
    borderWidth: 1,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPreviewFrame: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  iconImage: {
    width: 80,
    height: 80,
  },
  cardBody: {
    flex: 1,
    justifyContent: "flex-end",
  },
  cardWideTitleWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  cardTitleWide: {
    textAlign: "center",
  },
});
