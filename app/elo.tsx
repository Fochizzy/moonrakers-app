import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAuthSession,
  useAuthProfile,
  useGames,
  usePlayers,
} from "@/store/useStore";
import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import ActionButton from "@/components/ui/ActionButton";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { getEloScreen } from "@/lib/cloud/analytics/getEloScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { buildHomeRoute, buildPlayerProfileRoute } from "@/utils/appRoutes";
import {
  buildGameRowsByPlayer,
  describeRecentForm,
  type LooseEloSection,
  replaceRecentFormSummaryInText,
  resolveVisibleEloInsight,
  resolveVisibleEloSection,
  type VisibleEloMetricTab,
} from "@/utils/analyticsElo";
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";
import { useAnalyticsPresentation } from "@/utils/useAnalyticsPresentation";
import { COLORS } from "@/utils/colors";
import {
  type EloMetricCard,
  type EloSummary,
} from "@/lib/cloud/analytics/types";
import {
  formatMetricValue,
  formatPercentFromDecimal,
} from "@/utils/formatters";
import { toNumber } from "@/utils/numbers";
import { normalizeId } from "@/utils/strings";
import { resolvePreferredChartPlayerId } from "@/utils/charts";

type EloMetricTab = VisibleEloMetricTab;
type StorePlayer = { id: string; name?: string; color?: string };

const DEFAULT_ELO = 1000;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function toneStyles(
  tone?: "default" | "accent" | "blue" | "green" | "danger" | "amber"
) {
  switch (tone) {
    case "accent":
      return { bg: COLORS.accentSoft, value: COLORS.accent };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "green":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    case "danger":
      return { bg: COLORS.dangerSoft, value: COLORS.danger };
    case "amber":
      return { bg: "rgba(45,212,191,0.16)", value: COLORS.gold };
    default:
      return { bg: COLORS.whiteSoft, value: COLORS.text };
  }
}

export default function EloScreen() {
  const router = useRouter();
  const authSession = useAuthSession();
  const authProfile = useAuthProfile();
  const players = usePlayers() ?? [];
  const games = useGames() ?? [];
  const profileId = String(authProfile?.id ?? authSession?.user?.id ?? "").trim();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(
    null
  );
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const [activeTab, setActiveTab] =
    useState<EloMetricTab>("Leaderboard");
  const eloQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `elo-screen:${profileId || "anon"}:${selectedPlayerId || "all"}:${selectedOpponentId || "none"}`,
    load: () =>
      getEloScreen({
        profileId,
        focusPlayerId: selectedPlayerId,
        opponentId: selectedOpponentId,
        sortKey: "elo",
      }),
  });
  const payload =
    eloQuery.payload && typeof eloQuery.payload === "object"
      ? (eloQuery.payload as Record<string, unknown>)
      : null;
  const loading = eloQuery.loading;
  const { error, freshness } = useAnalyticsPresentation({
    fallbackMessage: "Failed to load ELO.",
    query: eloQuery,
    retryLabel: "Retry ELO",
    staleEntityLabel: "ELO payload",
  });

  const rawPlayerOptions = useMemo<StorePlayer[]>(() => {
    const source = Array.isArray(payload?.playerOptions)
      ? payload.playerOptions
      : [];

    return source
      .map((raw: unknown) => {
        const entry = asRecord(raw);
        return {
          id: normalizeId(entry.id),
          name:
            String(entry.name ?? entry.label ?? entry.displayName ?? "")
              .trim() || "Unknown",
          color: String(entry.color ?? "").trim() || undefined,
        };
      })
      .filter((player) => Boolean(player.id));
  }, [payload?.playerOptions]);

  const storePlayerOptions = useMemo<StorePlayer[]>(() => {
    return (Array.isArray(players) ? players : [])
      .map((raw: unknown) => {
        const player = asRecord(raw);
        return {
          id: normalizeId(player.id),
          name:
            String(player.name ?? player.label ?? player.displayName ?? "")
              .trim() || "Unknown",
          color: String(player.color ?? "").trim() || undefined,
        };
      })
      .filter((player) => Boolean(player.id));
  }, [players]);

  const rawLeaderboardRows = useMemo(() => {
    const source = Array.isArray(payload?.leaderboardRows)
      ? payload.leaderboardRows
      : [];

    return source
      .map((raw: unknown) => {
        const row = asRecord(raw);
        return {
          rank: toNumber(row.rank),
          playerId: normalizeId(row.playerId ?? row.id),
          name:
            String(row.name ?? row.label ?? row.displayName ?? "").trim() ||
            "Unknown",
          currentElo: toNumber(row.currentElo) || DEFAULT_ELO,
          peakElo: toNumber(row.peakElo) || toNumber(row.currentElo) || DEFAULT_ELO,
          confidence: toNumber(row.confidence),
          gamesPlayed: toNumber(row.gamesPlayed),
          wins: toNumber(row.wins),
          losses: toNumber(row.losses),
        };
      })
      .filter((row) => Boolean(row.playerId));
  }, [payload?.leaderboardRows]);

  const mergedPlayerOptions = useMemo<StorePlayer[]>(() => {
    const mergedPlayers = new Map<string, StorePlayer>();

    for (const player of rawPlayerOptions) {
      const normalizedId = normalizeId(player?.id);
      if (!normalizedId) {
        continue;
      }

      mergedPlayers.set(normalizedId, {
        ...player,
        id: normalizedId,
      });
    }

    for (const player of storePlayerOptions) {
      const normalizedId = normalizeId(player?.id);
      if (!normalizedId) {
        continue;
      }

      const current = mergedPlayers.get(normalizedId);
      mergedPlayers.set(normalizedId, {
        ...player,
        ...current,
        id: normalizedId,
      });
    }

    return Array.from(mergedPlayers.values());
  }, [rawPlayerOptions, storePlayerOptions]);
  const sortedPlayers = useMemo<StorePlayer[]>(() => {
    const leaderboardRankByPlayerId = new Map(
      rawLeaderboardRows.map((row, index) => [
        normalizeId(row.playerId),
        toNumber(row.rank) || index + 1,
      ]),
    );

    return [...mergedPlayerOptions].sort((left, right) => {
      const leftRank = leaderboardRankByPlayerId.get(normalizeId(left.id));
      const rightRank = leaderboardRankByPlayerId.get(normalizeId(right.id));

      if (leftRank != null || rightRank != null) {
        if (leftRank == null) return 1;
        if (rightRank == null) return -1;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
      }

      const nameDiff = String(left.name ?? "").localeCompare(
        String(right.name ?? ""),
      );
      if (nameDiff !== 0) {
        return nameDiff;
      }

      return normalizeId(left.id).localeCompare(normalizeId(right.id));
    });
  }, [mergedPlayerOptions, rawLeaderboardRows]);
  const gameDrivenPlayerIds = useMemo(() => {
    return new Set(
      (Array.isArray(games) ? games : []).flatMap((rawGame: unknown) => {
        const game = asRecord(rawGame);
        const participantIds: string[] = Array.isArray(game.players)
          ? game.players.map((player: unknown) => {
              const record = asRecord(player);
              return normalizeId(record.id ?? record.playerId);
            })
          : Array.isArray(game.playerIds)
            ? game.playerIds.map((playerId: unknown) => normalizeId(playerId))
            : [];

        return participantIds.filter(Boolean);
      }),
    );
  }, [games]);
  const leaderboardPlayerIds = useMemo(
    () =>
      new Set(
        rawLeaderboardRows
          .map((row) => normalizeId(row.playerId))
          .filter(Boolean),
      ),
    [rawLeaderboardRows],
  );
  const analyticsPlayers = useMemo<StorePlayer[]>(() => {
    // A player counts as tracked if this device has their games OR the server
    // already ranked them. Filtering on local games alone silently drops rows
    // the server returned whenever the store is only partially hydrated.
    const playersWithAnalytics = sortedPlayers.filter((player) => {
      const playerId = normalizeId(player.id);
      return (
        gameDrivenPlayerIds.has(playerId) || leaderboardPlayerIds.has(playerId)
      );
    });

    return playersWithAnalytics.length ? playersWithAnalytics : sortedPlayers;
  }, [gameDrivenPlayerIds, leaderboardPlayerIds, sortedPlayers]);
  const gameRowsByPlayer = useMemo(
    () => buildGameRowsByPlayer(games, analyticsPlayers),
    [analyticsPlayers, games],
  );

  const preferredPlayerId = useMemo(
    () =>
      resolvePreferredChartPlayerId({
        availablePlayers: analyticsPlayers,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
      }),
    [analyticsPlayers, authProfile?.id, authSession?.user?.id]
  );

  useEffect(() => {
    if (!analyticsPlayers.length) {
      return;
    }

    const activeId = normalizeId(selectedPlayerId);
    const hasActivePlayer = analyticsPlayers.some(
      (player) => normalizeId(player.id) === activeId
    );

    if (!activeId || !hasActivePlayer) {
      setSelectedPlayerId(preferredPlayerId ?? normalizeId(analyticsPlayers[0]?.id));
    }
  }, [analyticsPlayers, preferredPlayerId, selectedPlayerId]);

  const normalizedPlayerQuery = deferredPlayerSearchQuery.trim().toLowerCase();
  const filteredPlayerOptions = useMemo(() => {
    if (!normalizedPlayerQuery) {
      return analyticsPlayers;
    }

    return analyticsPlayers.filter((player) => {
      const searchTargets = [
        String(player?.name ?? ""),
        normalizeId(player?.id),
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return searchTargets.some((value) => value.includes(normalizedPlayerQuery));
    });
  }, [analyticsPlayers, normalizedPlayerQuery]);

  const selectedPlayer = useMemo(
    () =>
      analyticsPlayers.find(
        (p) => normalizeId(p.id) === normalizeId(selectedPlayerId)
      ) || null,
    [analyticsPlayers, selectedPlayerId]
  );

  const opponentOptions = useMemo(
    () =>
      analyticsPlayers.filter(
        (p) => normalizeId(p.id) !== normalizeId(selectedPlayerId)
      ),
    [analyticsPlayers, selectedPlayerId]
  );

  useEffect(() => {
    const activeOpponentId = normalizeId(selectedOpponentId);
    const isValidOpponent = opponentOptions.some(
      (player) => normalizeId(player.id) === activeOpponentId
    );

    if (selectedOpponentId === selectedPlayerId || (activeOpponentId && !isValidOpponent)) {
      setSelectedOpponentId(null);
    }
  }, [opponentOptions, selectedOpponentId, selectedPlayerId]);

  const selectedSummary = useMemo<EloSummary>(() => {
    const summary = asRecord(payload?.summary);
    return {
      playerId: normalizeId(summary.playerId ?? selectedPlayerId),
      name:
        String(summary.name ?? selectedPlayer?.name ?? "Unknown").trim() ||
        "Unknown",
      currentElo: toNumber(summary.currentElo) || DEFAULT_ELO,
      peakElo:
        toNumber(summary.peakElo) ||
        toNumber(summary.currentElo) ||
        DEFAULT_ELO,
      confidence: toNumber(summary.confidence),
      gamesPlayed: toNumber(summary.gamesPlayed),
      wins: toNumber(summary.wins),
      losses: toNumber(summary.losses),
      avgDelta: toNumber(summary.avgDelta),
      bestDelta: toNumber(summary.bestDelta),
      worstDelta: toNumber(summary.worstDelta),
      recentForm:
        String(summary.recentForm ?? "").trim() || "-",
    };
  }, [payload?.summary, selectedPlayer, selectedPlayerId]);

  const topCards = useMemo<EloMetricCard[]>(() => {
    const source = Array.isArray(payload?.topCards) ? payload.topCards : [];

    return source.map((raw: unknown) => {
      const card = asRecord(raw);
      return {
        key: String(card.key ?? ""),
        label: String(card.label ?? ""),
        value: String(card.value ?? "0"),
        sub:
          typeof card.sub === "string" && card.sub.trim() ? card.sub.trim() : undefined,
        tone:
          card.tone === "accent" ||
          card.tone === "blue" ||
          card.tone === "green" ||
          card.tone === "amber" ||
          card.tone === "danger"
            ? card.tone
            : "default",
      };
    });
  }, [payload?.topCards]);

  const activeSection = useMemo(() => {
    if (!payload?.sections || typeof payload.sections !== "object") {
      return {
        title: `${activeTab} Metrics`,
        cards: [] as EloMetricCard[],
      };
    }

    const section = resolveVisibleEloSection(
      payload.sections as Record<string, LooseEloSection>,
      activeTab,
    );
    const cards = Array.isArray(section?.cards)
      ? section.cards
          .map((raw: unknown): EloMetricCard => {
            const card = asRecord(raw);
            return {
            key: String(card.key ?? ""),
            label: String(card.label ?? ""),
            value:
              String(card.key ?? "") === "recent-form"
                ? describeRecentForm(String(card.value ?? ""))
                : String(card.value ?? "0"),
            sub:
              typeof card.sub === "string" && card.sub.trim()
                ? card.sub.trim()
                : undefined,
            tone:
              card.tone === "accent" ||
              card.tone === "blue" ||
              card.tone === "green" ||
              card.tone === "amber" ||
              card.tone === "danger"
                ? card.tone
                : "default",
            };
          })
          .filter((card: EloMetricCard) => Boolean(card.key && card.label))
      : [];

    return {
      title:
        typeof section?.title === "string" && section.title.trim()
          ? section.title.trim()
          : `${activeTab} Metrics`,
      cards,
    };
  }, [activeTab, payload?.sections]);

  const activeInsight = useMemo(() => {
    if (!payload?.insights || typeof payload.insights !== "object") {
      return {
        title: `${activeTab} Insight`,
        body: "No server-authored insight is available yet.",
      };
    }

    const insight = resolveVisibleEloInsight(
      payload.insights as Parameters<typeof resolveVisibleEloInsight>[0],
      activeTab,
    );

    return {
      title:
        typeof insight?.title === "string" && insight.title.trim()
          ? insight.title.trim()
          : `${activeTab} Insight`,
      body: (() => {
        const rawBody =
          typeof insight?.body === "string" && insight.body.trim()
            ? insight.body.trim()
            : "No server-authored insight is available yet.";

        return activeTab === "Momentum"
          ? replaceRecentFormSummaryInText(rawBody, selectedSummary.recentForm)
          : rawBody;
      })(),
    };
  }, [activeTab, payload?.insights, selectedSummary.recentForm]);

  const hasData = selectedSummary.gamesPlayed > 0;

  const leaderboardRows = useMemo(() => {
    const serverLeaderboardRowByPlayerId = new Map(
      rawLeaderboardRows.map((row, index) => [
        normalizeId(row.playerId),
        {
          ...row,
          rank: toNumber(row.rank) || index + 1,
        },
      ]),
    );

    return analyticsPlayers.map((player, index) => {
      const playerId = normalizeId(player.id);
      const serverRow = serverLeaderboardRowByPlayerId.get(playerId);
      const playerRows = gameRowsByPlayer[playerId] ?? [];
      const localWins = playerRows.filter((row) => row.win === 1).length;
      // Take the record from one source or the other, never a mix: subtracting a
      // server-wide win count from a local game count clamps a 12-4 record to 12W / 0L.
      const hasServerRecord =
        typeof serverRow?.wins === "number" &&
        typeof serverRow?.losses === "number";
      const wins = hasServerRecord ? (serverRow!.wins as number) : localWins;
      const losses = hasServerRecord
        ? (serverRow!.losses as number)
        : Math.max(0, playerRows.length - localWins);

      return {
        // analyticsPlayers is already ordered by server rank, so number the rows
        // positionally. Falling back to index + 1 only for players the server did
        // not rank produces duplicates against the real server ranks.
        rank: index + 1,
        playerId,
        name: serverRow?.name ?? player.name ?? "Unknown",
        currentElo: serverRow?.currentElo ?? DEFAULT_ELO,
        peakElo: serverRow?.peakElo ?? serverRow?.currentElo ?? DEFAULT_ELO,
        confidence: serverRow?.confidence ?? 0,
        gamesPlayed: serverRow?.gamesPlayed ?? playerRows.length,
        wins,
        losses,
        isSelected: playerId === normalizeId(selectedPlayerId),
      };
    });
  }, [analyticsPlayers, gameRowsByPlayer, rawLeaderboardRows, selectedPlayerId]);

  const featuredCard = topCards[0];
  const secondaryCards = topCards.slice(1, 3);
  const emptyStateDescription =
    error ||
    (typeof asRecord(payload?.emptyState).description === "string" &&
    String(asRecord(payload?.emptyState).description).trim()
      ? String(asRecord(payload?.emptyState).description).trim()
      : "No server-authored ELO data is available yet.");
  const {
    recoveryState,
    sectionState: baseSectionState,
  } = useAnalyticsRecovery({
    loading,
    error,
    playersCount: players.length,
    gamesCount: games.length,
    context: "leaderboard",
  });
  const sharedSectionState =
    baseSectionState === "ready" && !hasData ? "empty" : baseSectionState;
  const leaderboardSectionState =
    baseSectionState === "ready" && !leaderboardRows.length ? "empty" : baseSectionState;
  const emptyStateTitle =
    recoveryState.kind === "no-players"
      ? "No tracked players yet"
      : recoveryState.kind === "no-games"
        ? "No tracked games yet"
        : error
          ? "ELO analytics unavailable"
          : "No ELO data yet";
  const emptyStateBody =
    recoveryState.kind === "no-players"
      ? "Set up your roster first so the published ELO payload has real players to rank."
      : recoveryState.kind === "no-games"
        ? "Track a few games before expecting the shared ELO payload to populate."
        : error
          ? error
          : emptyStateDescription;

  return (
    <SafeAreaView edges={[]} style={{ flex: 1 }}>
    <PageShell preset="analytics" density="compact">
      <HeroCard
        eyebrow="ELO"
        title={selectedPlayer?.name ?? "Player Focus"}
        subtitle="Select a player to explore ratings"
        size="compact"
        variant="stat"
        headerAction={
          <ActionButton
            variant="ghost"
            title="Command"
            onPress={() => router.push(buildHomeRoute())}
            style={styles.backButton}
          />
        }
      >
        <View style={styles.searchWrap}>
          <TextInput
            value={playerSearchQuery}
            onChangeText={setPlayerSearchQuery}
            placeholder="Search players"
            placeholderTextColor={COLORS.muted}
            style={styles.playerSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {playerSearchQuery.length > 0 ? (
            <Pressable
              onPress={() => setPlayerSearchQuery("")}
              style={styles.searchClear}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.underlineSelectorRow}>
          {filteredPlayerOptions.map((player) => {
            const active =
              normalizeId(player.id) === normalizeId(selectedPlayerId);
            return (
              <Pressable
                key={player.id}
                style={({ pressed }) => [styles.underlineTabButton, pressed && { opacity: 0.9 }]}
                onPress={() => setSelectedPlayerId(normalizeId(player.id))}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    active && styles.underlineTabTextActive,
                  ]}
                >
                  {player.name || "Unknown"}
                </Text>
                <View
                  style={[
                    styles.underlineTabLine,
                    active && styles.underlineTabLineActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {filteredPlayerOptions.length ? null : (
          <EmptyStateCard
            message="No players match that search."
          />
        )}
      </HeroCard>

      {activeTab === "Context" ? (
        <SectionCard title="Opponent" subtitle="Optional head-to-head filter">
          <View style={styles.underlineSelectorRow}>
            <Pressable
              style={({ pressed }) => [styles.underlineTabButton, pressed && { opacity: 0.9 }]}
              onPress={() => setSelectedOpponentId(null)}
            >
              <Text
                style={[
                  styles.underlineTabText,
                  !selectedOpponentId && styles.underlineTabTextActive,
                ]}
              >
                None
              </Text>
              <View
                style={[
                  styles.underlineTabLine,
                  !selectedOpponentId && styles.underlineTabLineActive,
                ]}
              />
            </Pressable>

            {opponentOptions.map((player) => {
              const active =
                normalizeId(player.id) === normalizeId(selectedOpponentId);
              return (
                <Pressable
                  key={player.id}
                  style={({ pressed }) => [styles.underlineTabButton, pressed && { opacity: 0.9 }]}
                  onPress={() => setSelectedOpponentId(normalizeId(player.id))}
                >
                  <Text
                    style={[
                      styles.underlineTabText,
                      active && styles.underlineTabTextActive,
                    ]}
                  >
                    {player.name || "Unknown"}
                  </Text>
                  <View
                    style={[
                      styles.underlineTabLine,
                      active && styles.underlineTabLineActive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </SectionCard>
      ) : null}

      <View style={styles.tabGrid}>
        <View style={styles.tabGridRowTwo}>
          {(["Leaderboard", "Momentum"] as EloMetricTab[]).map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable
                key={tab}
                style={({ pressed }) => [styles.underlineMainTab, styles.underlineMainTabTwoCol, pressed && { opacity: 0.9 }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.underlineMainTabText,
                    active && styles.underlineMainTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
                <View
                  style={[
                    styles.underlineMainTabLine,
                    active && styles.underlineMainTabLineActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabGridRowTwo}>
          {(["Skills", "Context"] as EloMetricTab[]).map(
            (tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  style={({ pressed }) => [styles.underlineMainTab, styles.underlineMainTabTwoCol, pressed && { opacity: 0.9 }]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.underlineMainTabText,
                      active && styles.underlineMainTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  <View
                    style={[
                      styles.underlineMainTabLine,
                      active && styles.underlineMainTabLineActive,
                    ]}
                  />
                </Pressable>
              );
            }
          )}
        </View>
      </View>

      <AnalyticsStateSection
        title="Top 3 Winning Signals"
        subtitle={selectedPlayer?.name || "No player selected"}
        actions={<DefinitionsJumpLink category="elo" />}
        helpCategory="elo"
        state={sharedSectionState}
        sourceKind={freshness.sourceKind}
        sourceLabel={freshness.sourceLabel}
        sourceCaption={freshness.sourceCaption(
          "This focus view uses the published Supabase ELO payload, so its top signals stay aligned with the shared leaderboard.",
        )}
        messageTitle={emptyStateTitle}
        messageBody={loading ? "Loading server-authored ELO metrics." : emptyStateBody}
        primaryAction={freshness.retryAction}
        tone={error ? "danger" : sharedSectionState === "ready" ? "info" : "warning"}
      >
        {sharedSectionState === "ready" ? (
          <View style={styles.featuredSignalsWrap}>
            {featuredCard ? (
              <View
                style={[
                  styles.featuredSignalCard,
                  { backgroundColor: toneStyles(featuredCard.tone).bg },
                ]}
              >
                <View style={styles.featuredSignalHeader}>
                  <DefinitionTermText
                    label={featuredCard.label}
                    metric={
                      featuredCard.key === "current-elo"
                        ? "elo_current"
                        : featuredCard.key === "peak-elo"
                          ? "elo_peak"
                          : null
                    }
                    category={
                      featuredCard.key !== "current-elo" &&
                      featuredCard.key !== "peak-elo"
                        ? "elo"
                        : null
                    }
                    numberOfLines={1}
                    style={styles.featuredSignalLabel}
                  />
                </View>
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
            ) : null}

            <View style={styles.secondarySignalColumn}>
              {secondaryCards.map((card) => {
                const tone = toneStyles(card.tone);
                return (
                  <View
                    key={card.key}
                    style={[
                      styles.secondarySignalCard,
                      { backgroundColor: tone.bg },
                    ]}
                  >
                    <View style={styles.secondarySignalHeader}>
                      <DefinitionTermText
                        label={card.label}
                        metric={
                          card.key === "current-elo"
                            ? "elo_current"
                            : card.key === "peak-elo"
                              ? "elo_peak"
                              : null
                        }
                        category={
                          card.key !== "current-elo" &&
                          card.key !== "peak-elo"
                            ? "elo"
                            : null
                        }
                        numberOfLines={1}
                        style={styles.metricLabelCompact}
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricValueCompact,
                        { color: tone.value },
                      ]}
                    >
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
        ) : null}
      </AnalyticsStateSection>

      <SectionCard
        title={activeInsight.title}
        actions={<Text style={styles.insightChip}>{activeTab.toUpperCase()}</Text>}
      >
        <Text style={styles.insightText}>{activeInsight.body}</Text>
      </SectionCard>

      {activeTab === "Leaderboard" ? (
        <AnalyticsStateSection
          title="Leaderboard"
          subtitle="All players ranked by current ELO"
          state={leaderboardSectionState}
          sourceKind={freshness.sourceKind}
          sourceLabel={freshness.sourceLabel}
          sourceCaption={freshness.sourceCaption(
            "This leaderboard uses the same published ELO source as the home leaderboard tab.",
          )}
          messageTitle={emptyStateTitle}
          messageBody={loading ? "Loading server-authored leaderboard." : emptyStateBody}
          primaryAction={freshness.retryAction}
          tone={error ? "danger" : leaderboardSectionState === "ready" ? "info" : "warning"}
          helpCategory="elo"
        >
          {leaderboardSectionState === "ready" ? (
            <View style={styles.leaderboardList}>
              {leaderboardRows.map((row) => (
                <Pressable
                  key={row.playerId}
                  style={({ pressed }) => [
                    styles.leaderboardRow,
                    row.isSelected && styles.leaderboardRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => {
                    setSelectedPlayerId(row.playerId);
                    router.push(buildPlayerProfileRoute(row.playerId));
                  }}
                >
                  <View style={styles.leaderboardLeft}>
                    <View
                      style={[
                        styles.rankBadge,
                        row.isSelected && styles.rankBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          row.isSelected && styles.rankTextSelected,
                        ]}
                      >
                        {row.rank}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.leaderboardName}>{row.name}</Text>
                      <Text style={styles.leaderboardMeta}>
                        Peak {Math.round(row.peakElo)}   Conf{" "}
                        {formatPercentFromDecimal(row.confidence)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.leaderboardRight}>
                    <Text style={styles.leaderboardElo}>
                      {Math.round(row.currentElo)}
                    </Text>
                    <Text style={styles.leaderboardMeta}>Current ELO</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </AnalyticsStateSection>
      ) : null}

      <AnalyticsStateSection
        title={activeSection.title}
        subtitle="Active tab metrics"
        actions={<DefinitionsJumpLink category="elo" />}
        helpCategory="elo"
        state={sharedSectionState}
        sourceKind={freshness.sourceKind}
        sourceLabel={freshness.sourceLabel}
        sourceCaption={freshness.sourceCaption(
          `Published ${activeTab.toLowerCase()} metrics from the shared ELO payload.`,
        )}
        messageTitle={emptyStateTitle}
        messageBody={loading ? "Loading server-authored section metrics." : emptyStateBody}
        primaryAction={freshness.retryAction}
        tone={error ? "danger" : sharedSectionState === "ready" ? "info" : "warning"}
      >
        {sharedSectionState === "ready" ? (
          <View style={styles.metricGridDense}>
            {activeSection.cards.slice(0, 6).map((card) => {
              const tone = toneStyles(card.tone);
              return (
                <View
                  key={card.key}
                  style={[
                    styles.metricCardDense,
                    { backgroundColor: tone.bg },
                  ]}
                >
                  <Text style={styles.metricLabelCompact} numberOfLines={2}>
                    {card.label}
                  </Text>
                  <Text
                    style={[
                      styles.metricValueCompact,
                      { color: tone.value },
                    ]}
                  >
                    {formatMetricValue(card.value)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </AnalyticsStateSection>
    </PageShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  playerSearchInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: "700",
  },
  searchClear: {
    position: "absolute",
    right: 10,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  searchClearText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
    alignItems: "flex-end",
  },
  underlineTabButton: {
    paddingBottom: 2,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  tabGrid: {
    marginBottom: 6,
    gap: 8,
  },
  tabGridRowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  tabGridRowThree: {
    flexDirection: "row",
    gap: 10,
  },
  underlineMainTab: {
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  underlineMainTabTwoCol: {
    flex: 1,
  },
  underlineMainTabThreeCol: {
    flex: 1,
  },
  underlineMainTabText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "800",
  },
  underlineMainTabTextActive: {
    color: COLORS.accent,
  },
  underlineMainTabLine: {
    marginTop: 5,
    height: 3,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
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
  featuredSignalHeader: {
    gap: 4,
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
  secondarySignalHeader: {
    gap: 4,
  },
  leaderboardList: {
    gap: 4,
  },
  leaderboardRow: {
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leaderboardRowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  leaderboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  leaderboardRight: {
    alignItems: "flex-end",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  rankText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  rankTextSelected: {
    color: COLORS.accent,
  },
  leaderboardName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 1,
  },
  leaderboardElo: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  leaderboardMeta: {
    color: COLORS.sub,
    fontSize: 10,
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
    minHeight: 52,
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
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
  },
  insightText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },
});
