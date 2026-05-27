import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { getAnalyticsHome } from "@/lib/cloud/analytics/getAnalyticsHome";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import AnalyticsRecoveryCard from "@/components/analytics/AnalyticsRecoveryCard";
import { useStore } from "@/store/useStore";
import { getAnalyticsHubCards } from "@/utils/appHubs";
import { APP_ROUTES, buildHomeRoute } from "@/utils/appRoutes";
import { resolveAnalyticsRecoveryState } from "@/utils/analyticsRecoveryState";
import { APP_ICONS } from "@/utils/iconAccess";
import { useAnalyticsPresentation } from "@/utils/useAnalyticsPresentation";

const ANALYTICS_CARD_TONES: Record<
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
  tone: (typeof ANALYTICS_CARD_TONES)[string];
}) {
  const glossaryTarget =
    card.key === "stats"
      ? { category: "scoring" as const, label: "Glossary" }
      : card.key === "elo"
        ? { category: "elo" as const, label: "What is ELO?" }
        : null;

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
            <View style={styles.cardBodyCopy}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              {glossaryTarget ? (
                <DefinitionsJumpLink
                  category={glossaryTarget.category}
                  label={glossaryTarget.label}
                  textStyle={styles.cardGlossaryText}
                />
              ) : null}
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const authSession = useStore((state: any) => state.authSession);
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));
  const cards = useMemo(() => getAnalyticsHubCards(), []);
  const profileId = String(authSession?.user?.id ?? "").trim();
  const analyticsQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `analytics-home:${profileId || "anon"}`,
    load: () =>
      getAnalyticsHome({
        profileId,
      }),
  });
  const loading = analyticsQuery.loading;
  const { error, freshness } = useAnalyticsPresentation({
    fallbackMessage: "Failed to load analytics.",
    query: analyticsQuery,
    retryLabel: "Retry analytics",
    showSourceBadgeWhenReady: false,
    staleEntityLabel: "analytics directory payload",
  });
  const standardCards = cards.filter((card) => card.key !== "insights");
  const insightsCard = cards.find((card) => card.key === "insights") ?? null;
  const recoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount: players.length,
        gamesCount: games.length,
      }),
    [loading, error, players.length, games.length],
  );
  const analyticsSectionState = useMemo<"loading" | "error" | "empty" | "ready">(() => {
    if (loading) return "loading";
    if (error) return "error";
    if (recoveryState.kind === "no-players" || recoveryState.kind === "no-games") return "empty";
    return "ready";
  }, [loading, error, recoveryState.kind]);
  const analyticsPrimaryAction = useMemo(() => {
    if (recoveryState.kind === "no-players")
      return { label: "Open roster", onPress: () => router.push(APP_ROUTES.roster) };
    if (recoveryState.kind === "no-games")
      return { label: "Start tracked game", onPress: () => router.push(buildHomeRoute("game")) };
    return null;
  }, [recoveryState.kind, router]);
  const analyticsSecondaryAction = useMemo(() => {
    if (recoveryState.kind === "no-players")
      return { label: "Profiles", variant: "secondary" as const, onPress: () => router.push(APP_ROUTES.playerDirectory) };
    return null;
  }, [recoveryState.kind, router]);
  const analyticsSectionTitle =
    recoveryState.kind === "no-players"
      ? "No tracked players yet"
      : recoveryState.kind === "no-games"
        ? "No tracked games yet"
        : error
          ? "Analytics unavailable"
          : "Analytics Destinations";
  const analyticsSectionBody =
    recoveryState.kind === "no-players"
      ? "Set up your roster first so the analytics surfaces have real commanders to work with."
      : recoveryState.kind === "no-games"
        ? "Your roster is ready, but you need mission history before the analytics hub can populate."
        : error
          ? error
          : "Syncing the analytics hub surface from the published Supabase payload.";

  return (
    <PageShell preset="analytics" density="compact" contentContainerStyle={styles.pageContent}>
      <HeroCard
        eyebrow="Data Center"
        headerAction={
          <Pressable
            style={styles.commandButton}
            onPress={() => router.push(APP_ROUTES.home)}
          >
            <Text style={styles.commandButtonText}>Command</Text>
          </Pressable>
        }
        title="Analytics"
        size="compact"
        variant="stat"
        style={styles.heroCard}
      />

      {recoveryState.kind !== "none" && !loading && !error ? (
        <AnalyticsRecoveryCard
          eyebrow="Setup required"
          title={analyticsSectionTitle}
          body={analyticsSectionBody}
          tone="warning"
          primaryAction={analyticsPrimaryAction ?? undefined}
          secondaryAction={analyticsSecondaryAction ?? undefined}
        />
      ) : null}

      <AnalyticsStateSection
        eyebrow="Directory"
        title="Analytics Destinations"
        state={analyticsSectionState}
        style={styles.directorySection}
        sourceCaption={freshness.sourceCaption(
          "This directory stays aligned with the published Supabase analytics hub payload.",
        )}
        messageTitle={analyticsSectionTitle}
        messageBody={error ? freshness.sourceCaption(analyticsSectionBody) : analyticsSectionBody}
        primaryAction={freshness.retryAction ?? analyticsPrimaryAction}
        secondaryAction={freshness.retryAction ? null : analyticsSecondaryAction}
        tone={error ? "danger" : recoveryState.kind === "none" ? "info" : "warning"}
      >
        <View style={styles.grid}>
          {standardCards.map((card) => {
            const tone = ANALYTICS_CARD_TONES[card.key] ?? ANALYTICS_CARD_TONES.charts;

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
              accent={ANALYTICS_CARD_TONES.insights.accent}
              card={insightsCard}
              fullWidth
              onPress={() => router.push(insightsCard.route as any)}
              tone={ANALYTICS_CARD_TONES.insights}
            />
          ) : null}
        </View>
      </AnalyticsStateSection>
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
  directorySection: {
    padding: 14,
    gap: 10,
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
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
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
    justifyContent: "flex-end",
    position: "relative",
    paddingRight: 8,
  },
  iconShell: {
    width: 116,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPreviewFrame: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  iconImage: {
    width: 72,
    height: 72,
  },
  cardBody: {
    flex: 1,
    minHeight: 52,
    justifyContent: "flex-end",
  },
  cardBodyCopy: {
    gap: 4,
  },
  cardGlossaryText: {
    color: "#DFF6FF",
  },
  cardWideTitleWrap: {
    flex: 1,
    minHeight: 52,
    justifyContent: "flex-end",
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
