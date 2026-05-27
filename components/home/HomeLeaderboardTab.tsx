import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import RankBadge from "@/components/RankBadge";
import Text from "@/components/ui/Text";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import type { EloScreenParams, EloScreenPayload } from "@/lib/cloud/analytics/types";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
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
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));
  const [sortBy, setSortBy] = useState<SortMetric>("elo");
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const [sorted, setSorted] = useState<EnrichedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!profileId) {
        if (!cancelled) {
          setSorted([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await fetchEloScreen({
          profileId,
          focusPlayerId: null,
          opponentId: null,
          sortKey: sortBy,
        });

        if (cancelled) return;

        const rows = Array.isArray(payload?.leaderboardRows) ? payload.leaderboardRows : [];

        setSorted(
          rows.map((row: any) => ({
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
          })),
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            formatSupabaseConfigError(loadError) || "Failed to load leaderboard data.",
          );
          setSorted([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analyticsRefreshTick, profileId, sortBy]);

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
          sourceKind="server"
          messageTitle={leaderboardMessageTitle}
          messageBody={leaderboardMessageBody}
          primaryAction={leaderboardPrimaryAction}
          secondaryAction={leaderboardSecondaryAction}
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
                  <PlayerCardIcon player={player as any} size={34} borderRadius={8} />

                  <View style={styles.lbPlayerInfo}>
                    <Text style={styles.lbName}>{player.name}</Text>
                    <Text style={styles.lbSub}>
                      {player.wins} wins | {player.gamesPlayed} games | Eff{" "}
                      {(player.efficiency * 100).toFixed(0)}%
                    </Text>
                  </View>

                  <RankBadge rating={player.elo} size="sm" />
                </View>

                <View style={styles.metaRow}>
                  <Text style={index === 0 ? styles.metaRankTop : styles.metaRank}>
                    #{index + 1}
                  </Text>
                  <Text style={styles.metaElo}>ELO {Math.round(player.elo)}</Text>
                  <Text style={styles.metaScore}>Score {Math.round(player.score)}</Text>
                  <Text style={styles.metaPrestige}>Prestige {Math.round(player.prestige)}</Text>
                  <Text style={styles.metaAvg}>Avg {player.avgPrestige.toFixed(1)}</Text>
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
    color: "#FACC15",
    textShadowColor: "#FACC15",
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
