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
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { getEloScreen } from "@/lib/cloud/analytics/getEloScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { APP_ROUTES, buildPlayerProfileRoute } from "@/utils/appRoutes";
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";
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
import { buildGameRowsByPlayer } from "@/utils/gameRowsByPlayer";

type EloMetricTab = "Leaderboard" | "Momentum" | "Skills" | "Context" | "Projection";
type StorePlayer = { id: string; name?: string; color?: string };

const DEFAULT_ELO = 1000;

function toneStyles(
  tone?: "default" | "accent" | "blue" | "green" | "danger"
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
  const error = eloQuery.error;
  const isStale = eloQuery.isStale;
  const staleMessage = eloQuery.staleMessage;

  const rawPlayerOptions = useMemo<StorePlayer[]>(() => {
    const source = Array.isArray(payload?.playerOptions)
      ? payload.playerOptions
      : [];

    return source
      .map((entry: any) => ({
        id: normalizeId(entry?.id),
        name:
          String(entry?.name ?? entry?.label ?? entry?.displayName ?? "")
            .trim() || "Unknown",
        color: String(entry?.color ?? "").trim() || undefined,
      }))
      .filter((player) => Boolean(player.id));
  }, [payload?.playerOptions]);

  const sortedPlayers = useMemo<StorePlayer[]>(() => [...rawPlayerOptions], [rawPlayerOptions]);

  const rawLeaderboardRows = useMemo(() => {
    const source = Array.isArray(payload?.leaderboardRows)
      ? payload.leaderboardRows
      : [];

    return source
      .map((row: any) => ({
        rank: toNumber(row?.rank),
        playerId: normalizeId(row?.playerId ?? row?.id),
        name:
          String(row?.name ?? row?.label ?? row?.displayName ?? "").trim() ||
          "Unknown",
        currentElo: toNumber(row?.currentElo) || DEFAULT_ELO,
        peakElo: toNumber(row?.peakElo) || toNumber(row?.currentElo) || DEFAULT_ELO,
        confidence: toNumber(row?.confidence),
        gamesPlayed: toNumber(row?.gamesPlayed),
        wins: toNumber(row?.wins),
        losses: toNumber(row?.losses),
      }))
      .filter((row) => Boolean(row.playerId));
  }, [payload?.leaderboardRows]);

  const gameDrivenPlayerIds = useMemo(() => {
    return new Set(
      (games as any[]).flatMap((game) =>
        Array.isArray(game?.players)
          ? game.players
              .map((p: any) => normalizeId(p?.id ?? p?.playerId))
              .filter(Boolean)
          : []
      )
    );
  }, [games]);

  const analyticsPlayers = useMemo<StorePlayer[]>(() => {
    const playersWithSavedGames = sortedPlayers.filter((player) =>
      gameDrivenPlayerIds.has(normalizeId(player.id)),
    );

    return playersWithSavedGames.length ? playersWithSavedGames : sortedPlayers;
  }, [sortedPlayers, gameDrivenPlayerIds]);

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
      setSelectedPlayerId(preferredPlayerId ?? normalizeId(analyticsPlayers[0].id));
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

  useEffect(() => {
    const activeOpponentId = normalizeId(selectedOpponentId);
    const isValidOpponent = analyticsPlayers.some(
      (player) =>
        normalizeId(player.id) === activeOpponentId &&
        normalizeId(player.id) !== normalizeId(selectedPlayerId)
    );

    if (selectedOpponentId === selectedPlayerId || (activeOpponentId && !isValidOpponent)) {
      setSelectedOpponentId(null);
    }
  }, [analyticsPlayers, selectedOpponentId, selectedPlayerId]);

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

  const selectedSummary = useMemo<EloSummary>(() => {
    const summary = payload?.summary;
    return {
      playerId: normalizeId((summary as any)?.playerId ?? selectedPlayerId),
      name:
        String((summary as any)?.name ?? selectedPlayer?.name ?? "Unknown").trim() ||
        "Unknown",
      currentElo: toNumber((summary as any)?.currentElo) || DEFAULT_ELO,
      peakElo:
        toNumber((summary as any)?.peakElo) ||
        toNumber((summary as any)?.currentElo) ||
        DEFAULT_ELO,
      confidence: toNumber((summary as any)?.confidence),
      gamesPlayed: toNumber((summary as any)?.gamesPlayed),
      wins: toNumber((summary as any)?.wins),
      losses: toNumber((summary as any)?.losses),
      avgDelta: toNumber((summary as any)?.avgDelta),
      bestDelta: toNumber((summary as any)?.bestDelta),
      worstDelta: toNumber((summary as any)?.worstDelta),
      recentForm:
        String((summary as any)?.recentForm ?? "").trim() || "-",
    };
  }, [payload?.summary, selectedPlayer, selectedPlayerId]);

  const topCards = useMemo<EloMetricCard[]>(() => {
    const source = Array.isArray(payload?.topCards) ? payload.topCards : [];

    return source.map((card: any) => ({
      key: String(card?.key ?? ""),
      label: String(card?.label ?? ""),
      value: String(card?.value ?? "0"),
      sub:
        typeof card?.sub === "string" && card.sub.trim() ? card.sub.trim() : undefined,
      tone:
        card?.tone === "accent" ||
        card?.tone === "blue" ||
        card?.tone === "green" ||
        card?.tone === "danger"
          ? card.tone
          : "default",
    }));
  }, [payload?.topCards]);

  const activeSection = useMemo(() => {
    const sections = payload?.sections;
    const section =
      sections && typeof sections === "object"
        ? (sections as Record<string, any>)[activeTab]
        : null;

    const cards = Array.isArray(section?.cards)
      ? section.cards.map((card: any) => ({
          key: String(card?.key ?? ""),
          label: String(card?.label ?? ""),
          value: String(card?.value ?? "0"),
          sub:
            typeof card?.sub === "string" && card.sub.trim()
              ? card.sub.trim()
              : undefined,
          tone:
            card?.tone === "accent" ||
            card?.tone === "blue" ||
            card?.tone === "green" ||
            card?.tone === "danger"
              ? card.tone
              : "default",
        }))
      : [];

    return {
      title:
        typeof section?.title === "string" && section.title.trim()
          ? section.title.trim()
          : "ELO Metrics",
      cards,
    };
  }, [activeTab, payload?.sections]);

  const activeInsight = useMemo(() => {
    const insights = payload?.insights;
    const insight =
      insights && typeof insights === "object"
        ? (insights as Record<string, any>)[activeTab]
        : null;

    return {
      title:
        typeof insight?.title === "string" && insight.title.trim()
          ? insight.title.trim()
          : `${activeTab} Insight`,
      body:
        typeof insight?.body === "string" && insight.body.trim()
          ? insight.body.trim()
          : "No server-authored ELO insight is available yet.",
    };
  }, [activeTab, payload?.insights]);

  const hasData = selectedSummary.gamesPlayed > 0;

  const leaderboardRows = useMemo(() => {
    const gameRows = buildGameRowsByPlayer(games, analyticsPlayers);
    return analyticsPlayers
      .map((player, index) => {
        const playerId = normalizeId(player.id);
        const cloudRow = rawLeaderboardRows.find(
          (r) => normalizeId(r.playerId) === playerId
        );
        return {
          rank: toNumber(cloudRow?.rank) || index + 1,
          playerId,
          name: player.name ?? "Unknown",
          currentElo: toNumber(cloudRow?.currentElo) || DEFAULT_ELO,
          peakElo: toNumber(cloudRow?.peakElo) || toNumber(cloudRow?.currentElo) || DEFAULT_ELO,
          confidence: toNumber(cloudRow?.confidence),
          gamesPlayed: toNumber(cloudRow?.gamesPlayed) || (gameRows[playerId]?.length ?? 0),
          wins: toNumber(cloudRow?.wins),
          losses: toNumber(cloudRow?.losses),
          isSelected: playerId === normalizeId(selectedPlayerId),
        };
      })
      .filter((row) => Boolean(row.playerId));
  }, [analyticsPlayers, games, rawLeaderboardRows, selectedPlayerId]);

  const featuredCard = topCards[0];
  const secondaryCards = topCards.slice(1, 3);
  const emptyStateDescription =
    error ||
    (typeof (payload?.emptyState as any)?.description === "string" &&
    String((payload?.emptyState as any)?.description).trim()
      ? String((payload?.emptyState as any)?.description).trim()
      : "No server-authored ELO data is available yet.");
  const sourceKind = isStale ? "server-stale" : "server";
  const sourceLabel = isStale ? "Stale server data" : "Server data";
  const staleSourceCaption = isStale
    ? `Showing the last successful Supabase ELO payload.${staleMessage ? ` Latest refresh failure: ${staleMessage}` : ""}`
    : null;
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
        ? "Track or import games before expecting the shared ELO payload to populate."
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
            title="Back to Command"
            onPress={() => router.push(APP_ROUTES.home)}
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

        <View style={styles.tabGridRowThree}>
          {(["Skills", "Context", "Projection"] as EloMetricTab[]).map(
            (tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  style={({ pressed }) => [styles.underlineMainTab, styles.underlineMainTabThreeCol, pressed && { opacity: 0.9 }]}
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
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          "This focus view uses the published Supabase ELO payload, so its top signals stay aligned with the shared leaderboard."
        }
        messageTitle={emptyStateTitle}
        messageBody={loading ? "Loading server-authored ELO metrics." : emptyStateBody}
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
                  <Text style={styles.featuredSignalLabel} numberOfLines={1}>
                    {featuredCard.label}
                  </Text>
                  {featuredCard.key === "current-elo" ? (
                    <DefinitionsJumpLink label="Definition" metric="elo_current" />
                  ) : featuredCard.key === "peak-elo" ? (
                    <DefinitionsJumpLink label="Definition" metric="elo_peak" />
                  ) : (
                    <DefinitionsJumpLink label="Definition" category="elo" />
                  )}
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
                      <Text style={styles.metricLabelCompact} numberOfLines={1}>
                        {card.label}
                      </Text>
                      {card.key === "current-elo" ? (
                        <DefinitionsJumpLink label="Definition" metric="elo_current" />
                      ) : card.key === "peak-elo" ? (
                        <DefinitionsJumpLink label="Definition" metric="elo_peak" />
                      ) : (
                        <DefinitionsJumpLink label="Definition" category="elo" />
                      )}
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
          sourceKind={sourceKind}
          sourceLabel={sourceLabel}
          sourceCaption={
            staleSourceCaption ||
            "This leaderboard uses the same published ELO source as the home leaderboard tab."
          }
          messageTitle={emptyStateTitle}
          messageBody={loading ? "Loading server-authored leaderboard." : emptyStateBody}
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
                    router.push(buildPlayerProfileRoute(row.playerId) as any);
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
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          `Published ${activeTab.toLowerCase()} metrics from the shared ELO payload.`
        }
        messageTitle={emptyStateTitle}
        messageBody={loading ? "Loading server-authored section metrics." : emptyStateBody}
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
