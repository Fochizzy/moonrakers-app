import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  View,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AnalyticsSourceBadge from "@/components/analytics/AnalyticsSourceBadge";
import MoonrakersIntelSection from "@/components/player/MoonrakersIntelSection";
import PlayerProfileMetricTabs from "@/components/player-profile/PlayerProfileMetricTabs";
import PlayerProfileRecentGames from "@/components/player-profile/PlayerProfileRecentGames";
import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { getPlayerProfileScreen } from "@/lib/cloud/analytics/getPlayerProfileScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useAuthSession, useGames, usePlayers } from "@/store/useStore";
import {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildPlayerProfileRoute,
} from "@/utils/appRoutes";
import { buildCommonOpponentOptions } from "@/utils/charts";
import { COLORS } from "@/utils/colors";
import { resolveAssignedCardArtIndexForProfile } from "@/utils/profileAppearance";
import { isValidPlayerCardArtIndex } from "@/utils/playerCards";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import { uiPolish } from "@/utils/uiPolish";

const SHEET = require("@/assets/images/player-card-sheet.png");

type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

type EloMetricTab =
  | "Leaderboard"
  | "Momentum"
  | "Skills"
  | "Context"
  | "Projection";

type PayloadRecord = Record<string, unknown>;
type ProfileMetricTone = "default" | "accent" | "blue" | "green" | "red";

const PROFILE_TABS: EloMetricTab[] = [
  "Leaderboard",
  "Momentum",
  "Skills",
  "Context",
  "Projection",
];

function cropPosition(index: number) {
  return {
    row: Math.floor(index / 5),
    col: index % 5,
  };
}

function getInitials(name?: string) {
  if (!name?.trim()) return "?";
  return name.trim()[0].toUpperCase();
}

function toRecord(value: unknown): PayloadRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadRecord)
    : {};
}

function toArray(value: unknown): PayloadRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is PayloadRecord =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeMetricTone(value: unknown): ProfileMetricTone {
  if (
    value === "accent" ||
    value === "blue" ||
    value === "green" ||
    value === "red"
  ) {
    return value;
  }

  return "default";
}

function CropCardArt({
  artIndex,
  width,
  height,
}: {
  artIndex: number;
  width: number;
  height: number;
}) {
  const { row, col } = cropPosition(artIndex);

  return (
    <View style={[styles.cropWindow, { width, height }]}>
      <Image
        source={SHEET}
        resizeMode="stretch"
        style={{
          position: "absolute",
          width: width * 5,
          height: height * 6,
          left: -(col * width),
          top: -(row * height),
        }}
      />
    </View>
  );
}

function getPlayerNameById(players: StorePlayer[], playerId?: string | null): string | null {
  if (!playerId) return null;
  return players.find((player) => String(player.id) === String(playerId))?.name || null;
}

export default function PlayerProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();
  const scrollViewRef = React.useRef<ScrollView | null>(null);

  const authSession = useAuthSession();
  const games = useGames() ?? [];
  const players = usePlayers() ?? [];

  const profileId = String(authSession?.user?.id ?? "").trim();
  const playerId = Array.isArray(params.playerId) ? params.playerId[0] : params.playerId;
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EloMetricTab>("Leaderboard");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [opponentSearchQuery, setOpponentSearchQuery] = useState("");
  const [recentGamesAnchorY, setRecentGamesAnchorY] = useState(0);
  const [stickyShellHeight, setStickyShellHeight] = useState(0);
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const deferredOpponentSearchQuery = useDeferredValue(opponentSearchQuery);
  const profileQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId && playerId),
    queryKey: `player-profile:${profileId || "anon"}:${playerId || "none"}:${selectedOpponentId || "all"}`,
    load: () =>
      getPlayerProfileScreen({
        profileId,
        focusPlayerId: playerId || null,
        opponentId: selectedOpponentId,
      }),
  });
  const payload = profileQuery.payload;
  const isStale = profileQuery.isStale;
  const staleMessage = profileQuery.staleMessage;
  const sourceKind = isStale ? "server-stale" : "server";
  const sourceLabel = isStale ? "Stale server data" : "Server data";
  const hero = toRecord(payload?.hero);

  const payloadPlayerOptions = useMemo<StorePlayer[]>(() => {
    const options = toArray(payload?.playerOptions);

    return options
      .map((option) => ({
        id: String(option.id ?? option.playerId ?? "").trim(),
        name:
          toStringValue(option.name, "") ||
          toStringValue(option.label, "") ||
          toStringValue(option.displayName, "") ||
          toStringValue(option.playerName, "") ||
          "Player",
        color: toStringValue(option.color, "") || undefined,
        assignedCardArtIndex:
          typeof option.assignedCardArtIndex === "number"
            ? option.assignedCardArtIndex
            : null,
      }))
      .filter((option) => option.id.length > 0);
  }, [payload?.playerOptions]);

  const sortedPlayers = useMemo<StorePlayer[]>(() => {
    const source = payloadPlayerOptions.length ? payloadPlayerOptions : players;

    return [...source].sort((a: StorePlayer, b: StorePlayer) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [payloadPlayerOptions, players]);

  useEffect(() => {
    setSelectedOpponentId(null);
    setPlayerSearchQuery("");
    setOpponentSearchQuery("");
  }, [playerId]);

  const openCommandPage = () => {
    router.push(APP_ROUTES.home);
  };

  const handleSelectPlayer = (nextPlayerId: string) => {
    if (String(nextPlayerId) === String(playerId)) return;
    router.replace(buildPlayerProfileRoute(String(nextPlayerId)));
  };

  const openCompareLaunchpad = () => {
    if (!playerId) return;
    router.push(buildCompareRoute({ mode: "players", ids: [String(playerId)] }));
  };

  const openChartsLaunchpad = () => {
    if (!playerId) return;
    router.push(buildChartsRoute({
      playerId: String(playerId),
      setup: true,
    }));
  };

  const jumpToRecentGames = () => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(recentGamesAnchorY - stickyShellHeight - 12, 0),
      animated: true,
    });
  };

  const selectedPlayer = useMemo(() => {
    const matchedStorePlayer =
      sortedPlayers.find((player) => String(player.id) === String(playerId)) || null;

    if (!payload) {
      return matchedStorePlayer;
    }

    return {
      id: String(hero.id ?? playerId ?? matchedStorePlayer?.id ?? ""),
      name: toStringValue(hero.name, matchedStorePlayer?.name || "Player"),
      color: toStringValue(hero.color, matchedStorePlayer?.color || "") || undefined,
      assignedCardArtIndex:
        typeof hero.assignedCardArtIndex === "number"
          ? hero.assignedCardArtIndex
          : matchedStorePlayer?.assignedCardArtIndex ?? null,
    };
  }, [hero.assignedCardArtIndex, hero.color, hero.id, hero.name, payload, playerId, sortedPlayers]);

  const filteredPlayerOptions = useMemo(() => {
    const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedPlayers;

    return sortedPlayers.filter((player) =>
      String(player?.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [sortedPlayers, deferredPlayerSearchQuery]);

  const selectedPlayerName = selectedPlayer?.name || "Player";
  const playerAccent = getPlayerAccentColor(selectedPlayer?.color);
  const playerArtIndex =
    (isValidPlayerCardArtIndex(selectedPlayer?.assignedCardArtIndex)
      ? selectedPlayer?.assignedCardArtIndex
      : resolveAssignedCardArtIndexForProfile({
          favoriteColor: selectedPlayer?.color,
          assignedCardArtIndex: null,
        })) ?? 0;

  const opponentOptions = useMemo(() => {
    const options = toArray(payload?.opponentOptions);
    if (options.length > 0) {
      return options.map((option) => ({
        id: String(option.id ?? option.playerId ?? ""),
        name:
          toStringValue(option.name, "") ||
          toStringValue(option.label, "") ||
          toStringValue(option.displayName, "") ||
          toStringValue(option.playerName, "") ||
          "Player",
        color: toStringValue(option.color, "") || undefined,
        assignedCardArtIndex:
          typeof option.assignedCardArtIndex === "number"
            ? option.assignedCardArtIndex
            : null,
      }));
    }

    return sortedPlayers.filter((p) => String(p.id) !== String(playerId));
  }, [payload?.opponentOptions, playerId, sortedPlayers]);

  const topOpponentOptions = useMemo(
    () => {
      const payloadOptions = toArray(payload?.topOpponentOptions);
      if (payloadOptions.length > 0) {
        return payloadOptions.map((option) => ({
          id: String(option.id ?? option.playerId ?? ""),
          name:
            toStringValue(option.name, "") ||
            toStringValue(option.label, "") ||
            toStringValue(option.displayName, "") ||
            toStringValue(option.playerName, "") ||
            "Player",
        }));
      }

      return buildCommonOpponentOptions({
        playerId,
        players: sortedPlayers as any,
        games: games as any,
        limit: 4,
      });
    },
    [games, payload?.topOpponentOptions, playerId, sortedPlayers]
  );

  const filteredOpponentOptions = useMemo(() => {
    const normalizedQuery = deferredOpponentSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return opponentOptions.filter((player) =>
      String(player?.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [opponentOptions, deferredOpponentSearchQuery]);

  const selectedOpponentName = getPlayerNameById(sortedPlayers, selectedOpponentId);
  const currentElo =
    typeof hero.currentElo === "number" ? hero.currentElo : 1000;
  const peakElo =
    typeof hero.peakElo === "number" ? hero.peakElo : currentElo;
  const totalGames =
    typeof hero.totalGames === "number" ? hero.totalGames : 0;
  const totalWins =
    typeof hero.totalWins === "number" ? hero.totalWins : 0;
  const winRate =
    typeof hero.winRate === "number"
      ? hero.winRate
      : totalGames > 0
        ? totalWins / totalGames
        : 0;

  const recentGamesFallback = useMemo(() => {
    const filteredGames = (games || []).filter((game: any) => {
      const gamePlayers = Array.isArray(game?.players) ? game.players : [];
      const includesPlayer = gamePlayers.some((p: any) => String(p?.id) === String(playerId));
      if (!includesPlayer) return false;

      if (!selectedOpponentId) return true;
      return gamePlayers.some((p: any) => String(p?.id) === String(selectedOpponentId));
    });

    return filteredGames.reverse();
  }, [games, playerId, selectedOpponentId]);
  const recentGamesPayload = useMemo(
    () => toArray(payload?.recentGames),
    [payload?.recentGames],
  );
  const recentGames = recentGamesPayload.length ? recentGamesPayload : recentGamesFallback;

  const topCards = useMemo(
    () =>
      toArray(payload?.topCards).map((card, index) => ({
        key: toStringValue(card.key, `top-card-${index}`),
        label: toStringValue(card.label, `Card ${index + 1}`),
        value: String(card.value ?? "0"),
        sub: toStringValue(card.sub, "") || undefined,
        tone: normalizeMetricTone(card.tone),
      })),
    [payload?.topCards],
  );
  const featuredCard = topCards[0] ?? null;
  const secondaryCards = topCards.slice(1, 3);

  const tabs = toRecord(payload?.tabs);
  const activeSection = toRecord(tabs[activeTab]);
  const sectionCards = useMemo(
    () =>
      toArray(activeSection.cards).map((card, index) => ({
        key: toStringValue(card.key, `section-card-${index}`),
        label: toStringValue(card.label, `Card ${index + 1}`),
        value: String(card.value ?? "0"),
        sub: toStringValue(card.sub, "") || undefined,
        tone: normalizeMetricTone(card.tone),
      })),
    [activeSection.cards],
  );
  const sectionTitle = toStringValue(activeSection.title, `${activeTab} Metrics`);
  const sectionSubtitle =
    selectedOpponentName && activeTab === "Context"
      ? `Filtered to ${selectedOpponentName}`
      : selectedPlayerName;
  const tabInsights = toRecord(payload?.tabInsights);
  const activeInsight = toRecord(tabInsights[activeTab] ?? payload?.activeInsight);
  const profileInsight = toRecord(payload?.profileInsight);
  const hasData = totalGames > 0 || topCards.length > 0 || sectionCards.length > 0;
  const moonrakersIntel =
    payload?.moonrakersIntel && typeof payload.moonrakersIntel === "object"
      ? (payload.moonrakersIntel as any)
      : {
          hasData: false as const,
          emptyTitle: "Not enough Moonrakers data yet",
          emptyBody:
            "Finish or import a few more games to unlock player-specific playstyle reads.",
        };

  if (!selectedPlayer) {
    return (
      <PageShell
        preset="quiet"
        density="compact"
        scroll={false}
        contentContainerStyle={styles.pageShellContent}
      >
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Player not found</Text>
          <Text style={styles.centerSub}>
            The profile route does not match a player in store data.
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={openCommandPage}
          >
            <Text style={styles.backButtonText}>Back to Command</Text>
          </Pressable>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell
      preset="quiet"
      density="compact"
      scroll={false}
      contentContainerStyle={styles.pageShellContent}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.kicker}>Moonrakers</Text>

            <View style={styles.profileTitleRow}>
              <View
                style={[
                  styles.profileCardBadge,
                  { borderColor: playerAccent, shadowColor: playerAccent },
                ]}
              >
                <CropCardArt artIndex={playerArtIndex} width={44} height={44} />
                <View style={styles.profileCardBadgeDim} />
                <Text style={styles.profileCardBadgeText}>
                  {getInitials(selectedPlayer.name)}
                </Text>
              </View>

              <Text
                style={[
                  styles.title,
                  styles.profileTitleGlow,
                  { color: playerAccent, textShadowColor: playerAccent },
                ]}
              >
                {selectedPlayer.name || "Player Profile"}
              </Text>
            </View>

            <PlayerSearchPicker
              query={playerSearchQuery}
              onQueryChange={setPlayerSearchQuery}
              placeholder="Search User"
              items={filteredPlayerOptions.map((player) => ({
                id: String(player.id),
                label: player.name || "Player",
              }))}
              selectedIds={playerId ? [String(playerId)] : []}
              onSelect={handleSelectPlayer}
              variant="rail"
            />

            <View style={styles.headerMetaRow}>
              <AnalyticsSourceBadge kind={sourceKind} label={sourceLabel} />
              <Text style={styles.headerMetaText}>
                {isStale
                  ? `Latest refresh failed${staleMessage ? `: ${staleMessage}` : "."}`
                  : "Full profile analytics are now coming from the published Supabase contract."}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.headerBadge}
            onPress={openCommandPage}
          >
            <Text style={styles.headerBadgeText}>Back to Command</Text>
          </Pressable>
        </View>

        <View style={styles.metricGridTop}>
          <View style={[styles.metricCardTop, { backgroundColor: COLORS.accentSoft }]}>
            <View style={styles.metricCardTopHeader}>
              <View style={styles.metricCardTopHeaderMain}>
                <View style={[styles.metricMiniCardBadge, { borderColor: COLORS.accent, shadowColor: COLORS.accent }]}>
                  <CropCardArt artIndex={playerArtIndex} width={24} height={24} />
                  <View style={styles.metricMiniCardBadgeDim} />
                  <Text style={styles.metricMiniCardBadgeText}>
                    {getInitials(selectedPlayer.name)}
                  </Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1}>Current ELO</Text>
              </View>
              <DefinitionsJumpLink label="Definition" metric="elo_current" />
            </View>
            <Text style={[styles.metricValue, { color: COLORS.accent }]}>
              {Math.round(currentElo)}
            </Text>
            <Text style={styles.metricSub}>Live rating</Text>
          </View>

          <View style={[styles.metricCardTop, { backgroundColor: COLORS.blueSoft }]}>
            <View style={styles.metricCardTopHeader}>
              <View style={styles.metricCardTopHeaderMain}>
                <View style={[styles.metricMiniCardBadge, { borderColor: COLORS.blue, shadowColor: COLORS.blue }]}>
                  <CropCardArt artIndex={playerArtIndex} width={24} height={24} />
                  <View style={styles.metricMiniCardBadgeDim} />
                  <Text style={styles.metricMiniCardBadgeText}>
                    {getInitials(selectedPlayer.name)}
                  </Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1}>Peak</Text>
              </View>
              <DefinitionsJumpLink label="Definition" metric="elo_peak" />
            </View>
            <Text style={[styles.metricValue, { color: COLORS.blue }]}>
              {Math.round(peakElo)}
            </Text>
            <Text style={styles.metricSub}>Best rating reached</Text>
          </View>

          <View style={[styles.metricCardTop, { backgroundColor: COLORS.greenSoft }]}>
            <View style={styles.metricCardTopHeader}>
              <View style={styles.metricCardTopHeaderMain}>
                <View style={[styles.metricMiniCardBadge, { borderColor: COLORS.green, shadowColor: COLORS.green }]}>
                  <CropCardArt artIndex={playerArtIndex} width={24} height={24} />
                  <View style={styles.metricMiniCardBadgeDim} />
                  <Text style={styles.metricMiniCardBadgeText}>
                    {getInitials(selectedPlayer.name)}
                  </Text>
                </View>
                <Text style={styles.metricLabel} numberOfLines={1}>Win Rate</Text>
              </View>
              <DefinitionsJumpLink label="Definition" category="elo" />
            </View>
            <Text style={[styles.metricValue, { color: COLORS.green }]}>
              {`${Math.round(winRate * 100)}%`}
            </Text>
            <Text style={styles.metricSub}>
              {totalWins} wins / {totalGames} games
            </Text>
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSub}>Jump into the next player workflow</Text>
          </View>

          <View style={styles.quickActionsGrid}>
            <Pressable style={styles.quickActionCard} onPress={openCompareLaunchpad}>
              <Text style={styles.quickActionTitle}>Compare with...</Text>
              <Text style={styles.quickActionLabel}>
                Lock {selectedPlayer.name || "this player"} and pick the rival on the compare screen.
              </Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={openChartsLaunchpad}>
              <Text style={styles.quickActionTitle}>Open charts</Text>
              <Text style={styles.quickActionLabel}>
                Carry this player into chart setup and choose the view there.
              </Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={jumpToRecentGames}>
              <Text style={styles.quickActionTitle}>Recent games</Text>
              <Text style={styles.quickActionLabel}>
                Jump straight to the existing history section lower on this profile.
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={styles.stickyProfileTabShell}
          onLayout={(event) => setStickyShellHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Profile Tabs</Text>
              <Text style={styles.sectionSub}>Custom player breakdown</Text>
            </View>

            <View style={styles.tabGrid}>
              <View style={styles.tabGridRowTwo}>
                {(["Leaderboard", "Momentum"] as EloMetricTab[]).map((tab) => {
                  const active = tab === activeTab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.underlineMainTab, styles.underlineMainTabTwoCol]}
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
                {(["Skills", "Context", "Projection"] as EloMetricTab[]).map((tab) => {
                  const active = tab === activeTab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.underlineMainTab, styles.underlineMainTabThreeCol]}
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
            </View>
          </View>

          <View style={styles.profileSummaryCards}>
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>View</Text>
              <Text style={styles.profileSummaryValue}>{activeTab}</Text>
            </View>
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Opponent</Text>
              <Text style={styles.profileSummaryValue}>
                {selectedOpponentId
                  ? opponentOptions.find((player) => String(player.id) === String(selectedOpponentId))?.name ?? "Focused"
                  : "All"}
              </Text>
            </View>
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Signals</Text>
              <Text style={styles.profileSummaryValue}>{featuredCard ? "Ready" : "Pending"}</Text>
            </View>
          </View>
        </View>

        {activeTab === "Context" ? (
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Context Matchup</Text>
              <Text style={styles.sectionSub}>Filter to one opponent only when you want a narrower read</Text>
            </View>

            <View style={styles.underlineSelectorRow}>
              <Pressable
                style={styles.underlineTabButton}
                onPress={() => setSelectedOpponentId(null)}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    !selectedOpponentId && styles.underlineTabTextActive,
                  ]}
                >
                  All
                </Text>
                <View
                  style={[
                    styles.underlineTabLine,
                    !selectedOpponentId && styles.underlineTabLineActive,
                  ]}
                />
              </Pressable>

              {topOpponentOptions.map((player) => {
                const active = String(player.id) === String(selectedOpponentId);
                return (
                  <Pressable
                    key={player.id}
                    style={styles.underlineTabButton}
                    onPress={() => setSelectedOpponentId(String(player.id))}
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

            <TextInput
              value={opponentSearchQuery}
              onChangeText={setOpponentSearchQuery}
              placeholder="Search opponents"
              placeholderTextColor={COLORS.muted}
              style={styles.contextSearchInput}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {opponentSearchQuery.trim() ? (
              <PlayerSearchPicker
                query={opponentSearchQuery}
                onQueryChange={setOpponentSearchQuery}
                placeholder="Search opponents"
                items={filteredOpponentOptions.map((player) => ({
                  id: String(player.id),
                  label: player.name || "Unknown",
                }))}
                selectedIds={selectedOpponentId ? [String(selectedOpponentId)] : []}
                onSelect={(nextId) => setSelectedOpponentId(String(nextId))}
                variant="rail"
                showResultsOnlyWhenQuery
              />
            ) : null}
          </View>
        ) : null}

        {hasData ? (
          <PlayerProfileMetricTabs
            activeTab={activeTab}
            featuredCard={featuredCard}
            secondaryCards={secondaryCards}
            profileInsightTitle={toStringValue(profileInsight.title, "Profile insight")}
            profileInsightBody={toStringValue(
              profileInsight.body,
              "No server-authored profile insight is available yet.",
            )}
            activeInsightBody={toStringValue(activeInsight.body, "") || null}
            sectionTitle={sectionTitle}
            sectionSubtitle={sectionSubtitle}
            sectionCards={sectionCards}
          />
        ) : (
          <EmptyStateCard
            message="No profile analytics available yet."
            hint="Finish or import more games to unlock server-authored stats for this player."
          />
        )}

        <MoonrakersIntelSection profile={moonrakersIntel} />

        <View
          style={styles.sectionCompact}
          onLayout={(event) => setRecentGamesAnchorY(event.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Games</Text>
            <Text style={styles.sectionSub}>
              {selectedOpponentId ? "Filtered by opponent" : "Full history"}
            </Text>
          </View>

          <PlayerProfileRecentGames
            playerId={String(playerId)}
            recentGames={recentGames as Array<Record<string, unknown>>}
            renderBadge={() => (
              <View
                style={[
                  styles.gameMiniCardBadge,
                  { borderColor: playerAccent, shadowColor: playerAccent },
                ]}
              >
                <CropCardArt
                  artIndex={playerArtIndex}
                  width={24}
                  height={24}
                />
                <View style={styles.metricMiniCardBadgeDim} />
                <Text style={styles.metricMiniCardBadgeText}>
                  {getInitials(selectedPlayer.name)}
                </Text>
              </View>
            )}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageShellContent: {
    flex: 1,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: uiPolish.spacing.sm,
    paddingBottom: uiPolish.spacing.xxl,
  },
  stickyProfileTabShell: {
    backgroundColor: "rgba(8,17,32,0.94)",
    borderRadius: 18,
    marginBottom: 8,
    paddingBottom: 6,
  },
  profileSummaryCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 8,
  },
  profileSummaryCard: {
    flex: 1,
    minWidth: 96,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  profileSummaryLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  profileSummaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  cropWindow: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  profileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileCardBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  profileCardBadgeDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  profileCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    zIndex: 2,
  },
  profileTitleGlow: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  centerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  centerSub: {
    color: COLORS.sub,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  headerMetaRow: {
    gap: 6,
  },
  headerMetaText: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  kicker: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  playerSearchInput: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  contextSearchInput: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  profileSearchRail: {
    gap: 8,
    paddingTop: 8,
    paddingRight: 8,
    alignItems: "center",
  },
  headerBadge: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.34)",
  },
  headerBadgeText: {
    color: "#E8F1FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  metricGridTop: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  metricCardTop: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 76,
    justifyContent: "center",
  },
  metricCardTopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 4,
  },
  metricCardTopHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  metricMiniCardBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  metricMiniCardBadgeDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  metricMiniCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    zIndex: 2,
  },
  metricLabel: {
    color: COLORS.sub,
    fontSize: 10,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  metricSub: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
  },
  sectionCompact: {
    backgroundColor: COLORS.card,
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
  tabGrid: {
    gap: 8,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickActionCard: {
    minWidth: "31%",
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  quickActionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  quickActionLabel: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
    alignItems: "flex-end",
  },
  underlineTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  bottomSpacer: {
    height: 8,
  },
  gameMiniCardBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.34,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
