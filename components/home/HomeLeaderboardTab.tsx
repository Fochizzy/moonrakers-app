import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import RankBadge from "@/components/RankBadge";
import DefinitionRichText from "@/components/ui/DefinitionRichText";
import Text from "@/components/ui/Text";
import type {
  EloLeaderboardRow,
  EloScreenParams,
  EloScreenPayload,
} from "@/lib/cloud/analytics/types";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { buildAnalyticsFreshnessPresentation } from "@/utils/analyticsFreshness";
import { buildPlayerProfileRoute } from "@/utils/appRoutes";
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";
import { getInitials, n, normalizeId, normalizeName, sortLabel } from "./homeUtils";
import type { EnrichedPlayer, SortMetric } from "./homeTypes";

function LeaderboardSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.lbCard, styles.skeletonCard]}>
          <View style={styles.playerRow}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.lbPlayerInfo}>
              <View style={[styles.skeletonLine, { width: "55%" }]} />
              <View
                style={[styles.skeletonLine, { width: "75%", marginTop: 6, opacity: 0.5 }]}
              />
            </View>
            <View style={styles.skeletonBadge} />
          </View>
          <View style={[styles.skeletonLine, { width: "65%", marginTop: 2 }]} />
        </View>
      ))}
    </>
  );
}

export function HomeLeaderboardTab({
  profileId,
  fetchEloScreen,
}: {
  profileId: string | null;
  fetchEloScreen: (params: EloScreenParams) => Promise<EloScreenPayload>;
}) {
  const router = useRouter();
  const players = useStore((state) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state) => (Array.isArray(state?.games) ? state.games : []));
  const [sortBy, setSortBy] = useState<SortMetric>("elo");
  const leaderboardQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `home-leaderboard:${profileId || "anon"}:${sortBy}`,
    load: () =>
      fetchEloScreen({
        profileId: String(profileId ?? "").trim(),
        focusPlayerId: null,
        opponentId: null,
        sortKey: sortBy,
      }),
  });
  const loading = leaderboardQuery.loading;
  const error = useMemo(() => {
    const nextError = leaderboardQuery.error;
    return nextError !== null
      ? formatSupabaseConfigError(nextError) || "Failed to load leaderboard data."
      : null;
  }, [leaderboardQuery.error]);
  const freshness = useMemo(
    () =>
      buildAnalyticsFreshnessPresentation({
        error,
        isStale: leaderboardQuery.isStale,
        lastSuccessAt: leaderboardQuery.lastSuccessAt,
        refresh: leaderboardQuery.refresh,
        retryLabel: "Retry leaderboard",
        staleEntityLabel: "leaderboard payload",
        staleMessage: leaderboardQuery.staleMessage,
      }),
    [
      error,
      leaderboardQuery.isStale,
      leaderboardQuery.lastSuccessAt,
      leaderboardQuery.refresh,
      leaderboardQuery.staleMessage,
    ],
  );
  const sorted = useMemo<EnrichedPlayer[]>(() => {
    // Older payload rows carried `id` instead of `playerId`; keep reading both.
    const rows: Array<EloLeaderboardRow & { id?: string }> =
      Array.isArray(leaderboardQuery.payload?.leaderboardRows)
        ? leaderboardQuery.payload.leaderboardRows
        : [];

    return rows.map((row) => ({
      id: normalizeId(row?.playerId ?? row?.id),
      name: normalizeName(row?.name) || "Unknown",
      color: normalizeName(row?.color) || undefined,
      initials: getInitials(normalizeName(row?.name) || "Unknown"),
      assignedCardArtIndex:
        typeof row?.assignedCardArtIndex === "number" &&
        Number.isFinite(row.assignedCardArtIndex)
          ? row.assignedCardArtIndex
          : null,
      elo: n(row?.currentElo) || 1000,
      wins: n(row?.wins),
      gamesPlayed: n(row?.gamesPlayed),
      score: n(row?.score),
      prestige: n(row?.prestige),
      efficiency: n(row?.efficiency),
      avgPrestige: n(row?.avgPrestige),
    }));
  }, [leaderboardQuery.payload?.leaderboardRows]);
  const {
    recoveryState,
    messageTitle: leaderboardMessageTitle,
    messageBody: leaderboardMessageBody,
    primaryAction: leaderboardPrimaryAction,
    secondaryAction: leaderboardSecondaryAction,
  } = useAnalyticsRecovery({
    loading,
    error,
    playersCount: players.length,
    gamesCount: games.length,
    context: "leaderboard",
  });
  const leaderboardState =
    loading
      ? "loading"
      : error
        ? "error"
        : recoveryState.kind === "no-players" || recoveryState.kind === "no-games" || !sorted.length
          ? "empty"
          : ("ready" as const);

  return (
    <View style={styles.inlineLeaderboardRoot}>
      <ScrollView
        contentContainerStyle={styles.inlineLeaderboardContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toggleRow}>
          {(
            ["elo", "wins", "games", "score", "prestige", "efficiency", "avgPrestige"] as SortMetric[]
          ).map((metric) => {
            const active = sortBy === metric;
            return (
              <Pressable
                key={metric}
                onPress={() => setSortBy(metric)}
                style={({ pressed }) => [styles.toggle, pressed && styles.pressScaleSm]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {sortLabel(metric)}
                </Text>
                <View style={[styles.toggleLine, active && styles.toggleLineActive]} />
              </Pressable>
            );
          })}
        </View>

        <AnalyticsStateSection
          eyebrow="Home"
          title="Leaderboard"
          state={leaderboardState}
          sourceKind={freshness.sourceKind}
          sourceLabel={freshness.sourceLabel}
          sourceCaption={freshness.sourceCaption(
            "This leaderboard uses the same published ELO feed as the dedicated analytics surfaces.",
          )}
          messageTitle={leaderboardMessageTitle}
          messageBody={leaderboardMessageBody}
          primaryAction={freshness.retryAction ?? leaderboardPrimaryAction}
          secondaryAction={freshness.retryAction ? null : leaderboardSecondaryAction}
          tone={error ? "danger" : leaderboardState === "ready" ? "info" : "warning"}
          helpCategory="elo"
        >
          {loading ? (
            <LeaderboardSkeleton />
          ) : (
            sorted.map((player, index) => (
              <Pressable
                key={player.id}
                onPress={() => router.push(buildPlayerProfileRoute(player.id))}
                style={({ pressed }) => [styles.lbCard, pressed && styles.lbCardPressed]}
              >
                <View style={styles.playerRow}>
                  <PlayerCardIcon player={player} size={34} borderRadius={8} />

                  <View style={styles.lbPlayerInfo}>
                    <Text style={styles.lbName}>{player.name}</Text>
                    <DefinitionRichText
                      text={`${player.wins} Wins | ${player.gamesPlayed} Games Played | Efficiency ${(player.efficiency * 100).toFixed(0)}%`}
                      style={styles.lbSub}
                    />
                  </View>

                  <RankBadge rating={player.elo} size="sm" />
                </View>

                <View style={styles.metaRow}>
                  <Text style={index === 0 ? styles.metaRankTop : styles.metaRank}>
                    #{index + 1}
                  </Text>
                  <DefinitionRichText
                    text={`ELO ${Math.round(player.elo)}`}
                    style={styles.metaElo}
                  />
                  <DefinitionRichText
                    text={`Score ${Math.round(player.score)}`}
                    style={styles.metaScore}
                  />
                  <DefinitionRichText
                    text={`Total Prestige ${Math.round(player.prestige)}`}
                    style={styles.metaPrestige}
                  />
                  <DefinitionRichText
                    text={`Prestige / Game ${player.avgPrestige.toFixed(1)}`}
                    style={styles.metaAvg}
                  />
                </View>
              </Pressable>
            ))
          )}
        </AnalyticsStateSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineLeaderboardRoot: {
    flex: 1,
  },
  inlineLeaderboardContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-end",
    columnGap: 14,
    rowGap: 8,
    marginBottom: 2,
  },
  toggle: {
    paddingBottom: 2,
    alignItems: "center",
  },
  toggleText: {
    color: "#94A3B8",
    fontWeight: "800",
    fontSize: 11,
  },
  toggleTextActive: {
    color: "#A855F7",
  },
  toggleLine: {
    marginTop: 4,
    height: 2,
    minWidth: 28,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  toggleLineActive: {
    backgroundColor: "#A855F7",
  },
  lbCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    gap: 7,
  },
  lbCardPressed: {
    backgroundColor: "rgba(96,165,250,0.10)",
    borderColor: "rgba(96,165,250,0.38)",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lbPlayerInfo: {
    flex: 1,
    minWidth: 0,
  },
  lbName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  lbSub: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  metaRank: {
    color: "#E5E7EB",
    fontSize: 10,
    fontWeight: "900",
  },
  metaRankTop: {
    color: "#5EEAD4",
    textShadowColor: "#5EEAD4",
    textShadowRadius: 6,
    fontSize: 10,
    fontWeight: "900",
  },
  metaElo: {
    color: "#60A5FA",
    fontSize: 10,
    fontWeight: "900",
  },
  metaScore: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  metaPrestige: {
    color: "#C084FC",
    fontSize: 10,
    fontWeight: "900",
  },
  metaAvg: {
    color: "#93C5FD",
    fontSize: 10,
    fontWeight: "900",
  },
  skeletonCard: {
    opacity: 0.55,
  },
  skeletonAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(96,165,250,0.15)",
  },
  skeletonLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(96,165,250,0.15)",
  },
  skeletonBadge: {
    width: 36,
    height: 20,
    borderRadius: 6,
    backgroundColor: "rgba(168,85,247,0.15)",
  },
  pressScaleSm: {
    transform: [{ scale: 0.975 }],
  },
});
