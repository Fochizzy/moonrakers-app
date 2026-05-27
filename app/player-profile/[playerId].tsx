import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
  TextInput,
  View,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AnalyticsSourceBadge from "@/components/analytics/AnalyticsSourceBadge";
import AnalyticsControlRail from "@/components/analytics/AnalyticsControlRail";
import MoonrakersIntelSection from "@/components/player/MoonrakersIntelSection";
import PlayerProfileMetricTabs from "@/components/player-profile/PlayerProfileMetricTabs";
import PlayerProfileRecentGames from "@/components/player-profile/PlayerProfileRecentGames";
import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { getPlayerProfileScreen } from "@/lib/cloud/analytics/getPlayerProfileScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useAuthProfile, useAuthSession, useGames, usePlayers } from "@/store/useStore";
import {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildPlayerProfileRoute,
} from "@/utils/appRoutes";
import {
  buildRecentGameOpponentOptions,
  prioritizeSignedInPlayerOptions,
  resolveSignedInPlayerOptionId,
} from "@/utils/charts";
import { COLORS } from "@/utils/colors";
import { getPlayerCardSourceByArtIndex } from "@/utils/playerCardAssets";
import { resolveAssignedCardArtIndexForProfile } from "@/utils/profileAppearance";
import { isValidPlayerCardArtIndex } from "@/utils/playerCards";
import { canonicalizeSelectablePlayers } from "@/utils/registeredProfilePlayer";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import { uiPolish } from "@/utils/uiPolish";

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
type ProfileMetricTone =
  | "default"
  | "accent"
  | "blue"
  | "green"
  | "red"
  | "danger";

const PROFILE_TABS: EloMetricTab[] = [
  "Leaderboard",
  "Momentum",
  "Skills",
  "Context",
  "Projection",
];

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

  if (value === "danger") {
    return "red";
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
  const source = getPlayerCardSourceByArtIndex(artIndex);

  return (
    <View style={[styles.cropWindow, { width, height }]}>
      <Image
        source={source}
        resizeMode="cover"
        style={styles.cropImage}
      />
    </View>
  );
}

function getPlayerNameById(players: StorePlayer[], playerId?: string | null): string | null {
  if (!playerId) return null;
  return players.find((player) => String(player.id) === String(playerId))?.name || null;
}

function normalizeStorePlayerOption(option: PayloadRecord): StorePlayer | null {
  const id = String(option.id ?? option.playerId ?? "").trim();
  if (!id) {
    return null;
  }

  return {
    id,
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
  };
}

const ALL_PLAYERS_CHIP_ID = "__all_players__";

type ProfileTabRailShellProps = {
  activeTab: EloMetricTab;
  onTabChange: (tab: EloMetricTab) => void;
  opponentLabel: string;
  signalsLabel: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
};

function ProfileTabRailShell({
  activeTab,
  onTabChange,
  opponentLabel,
  signalsLabel,
  onLayout,
  style,
}: ProfileTabRailShellProps) {
  return (
    <View style={[styles.stickyProfileTabShell, style]} onLayout={onLayout}>
      <AnalyticsControlRail
        title="Profile Tabs"
        subtitle="Custom player breakdown"
        tabs={PROFILE_TABS.map((tab) => ({ key: tab, label: tab }))}
        activeTabKey={activeTab}
        onTabChange={(key) => onTabChange(key as EloMetricTab)}
        style={styles.profileTabsRail}
      />

      <View style={styles.profileSummaryCards}>
        <View style={styles.profileSummaryCard}>
          <Text style={styles.profileSummaryLabel}>View</Text>
          <Text style={styles.profileSummaryValue}>{activeTab}</Text>
        </View>
        <View style={styles.profileSummaryCard}>
          <Text style={styles.profileSummaryLabel}>Opponent</Text>
          <Text style={styles.profileSummaryValue}>{opponentLabel}</Text>
        </View>
        <View style={styles.profileSummaryCard}>
          <Text style={styles.profileSummaryLabel}>Signals</Text>
          <Text style={styles.profileSummaryValue}>{signalsLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export default function PlayerProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();
  const scrollViewRef = React.useRef<ScrollView | null>(null);

  const authProfile = useAuthProfile();
  const authSession = useAuthSession();
  const games = useGames() ?? [];
  const players = usePlayers() ?? [];

  const profileId = String(authSession?.user?.id ?? "").trim();
  const playerId = Array.isArray(params.playerId) ? params.playerId[0] : params.playerId;
  const canonicalPlayerDirectory = useMemo(
    () => canonicalizeSelectablePlayers(players, []),
    [players],
  );
  const canonicalStorePlayers = canonicalPlayerDirectory.players as StorePlayer[];
  const resolvedPlayerId = useMemo(() => {
    const normalizedRoutePlayerId = String(playerId ?? "").trim();
    if (!normalizedRoutePlayerId) {
      return "";
    }

    return String(
      canonicalPlayerDirectory.aliases[normalizedRoutePlayerId] ?? normalizedRoutePlayerId,
    ).trim();
  }, [canonicalPlayerDirectory.aliases, playerId]);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EloMetricTab>("Leaderboard");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [opponentSearchQuery, setOpponentSearchQuery] = useState("");
  const [recentGamesAnchorY, setRecentGamesAnchorY] = useState(0);
  const [stickyShellHeight, setStickyShellHeight] = useState(0);
  const [stickyShellAnchorY, setStickyShellAnchorY] = useState(0);
  const [androidStickyProfileTabsVisible, setAndroidStickyProfileTabsVisible] = useState(false);
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const deferredOpponentSearchQuery = useDeferredValue(opponentSearchQuery);
  const profileStickyHeaderIndices = Platform.OS === "android" ? undefined : [3];
  const showAndroidStickyProfileTabs = Platform.OS === "android" && androidStickyProfileTabsVisible;
  const profileQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId && resolvedPlayerId),
    queryKey: `player-profile:${profileId || "anon"}:${resolvedPlayerId || "none"}:${selectedOpponentId || "all"}`,
    load: () =>
      getPlayerProfileScreen({
        profileId,
        focusPlayerId: resolvedPlayerId || null,
        opponentId: selectedOpponentId,
      }),
  });
  const payload = profileQuery.payload;
  const payloadRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const isStale = profileQuery.isStale;
  const staleMessage = profileQuery.staleMessage;
  const sourceKind = isStale ? "server-stale" : "server";
  const sourceLabel = isStale ? "Stale server data" : "Server data";
  const hero = toRecord(payload?.hero);
  const authProfilePlayerOption = useMemo<StorePlayer | null>(() => {
    const id = String(authProfile?.id ?? authSession?.user?.id ?? "").trim();
    if (!id) {
      return null;
    }

    return {
      id,
      name:
        String(authProfile?.player_name ?? "").trim() ||
        String(authProfile?.display_name ?? "").trim() ||
        "Player",
      color: String(authProfile?.favorite_color ?? "").trim() || undefined,
      assignedCardArtIndex:
        typeof authProfile?.assigned_card_art_index === "number"
          ? authProfile.assigned_card_art_index
          : null,
    };
  }, [
    authProfile?.assigned_card_art_index,
    authProfile?.display_name,
    authProfile?.favorite_color,
    authProfile?.id,
    authProfile?.player_name,
    authSession?.user?.id,
  ]);
  const selectedHeroPlayerOption = useMemo<StorePlayer | null>(() => {
    const id = String(hero.id ?? resolvedPlayerId ?? "").trim();
    if (!id) {
      return null;
    }

    return {
      id,
      name: toStringValue(hero.name, "Player"),
      color: toStringValue(hero.color, "") || undefined,
      assignedCardArtIndex:
        typeof hero.assignedCardArtIndex === "number"
          ? hero.assignedCardArtIndex
          : null,
    };
  }, [hero.assignedCardArtIndex, hero.color, hero.id, hero.name, resolvedPlayerId]);

  const payloadPlayerOptions = useMemo<StorePlayer[]>(() => {
    const options = toArray(payload?.playerOptions);

    return options
      .map(normalizeStorePlayerOption)
      .filter((option): option is StorePlayer => Boolean(option));
  }, [payload?.playerOptions]);

  const signedInTopPlayerOptions = useMemo<StorePlayer[]>(() => {
    const options = toArray(payloadRecord?.signedInTopPlayerOptions);

    return options
      .map(normalizeStorePlayerOption)
      .filter((option): option is StorePlayer => Boolean(option));
  }, [payloadRecord?.signedInTopPlayerOptions]);
  const availablePlayerOptions = useMemo<StorePlayer[]>(() => {
    const mergedPlayers = new Map<string, StorePlayer>();

    for (const sourcePlayer of [
      ...canonicalStorePlayers,
      ...payloadPlayerOptions,
      ...signedInTopPlayerOptions,
      ...(selectedHeroPlayerOption ? [selectedHeroPlayerOption] : []),
      ...(authProfilePlayerOption ? [authProfilePlayerOption] : []),
    ]) {
      const normalizedPlayerId = String(sourcePlayer?.id ?? "").trim();
      if (!normalizedPlayerId) {
        continue;
      }

      const currentPlayer = mergedPlayers.get(normalizedPlayerId);
      if (!currentPlayer) {
        mergedPlayers.set(normalizedPlayerId, {
          ...sourcePlayer,
          id: normalizedPlayerId,
        });
        continue;
      }

      mergedPlayers.set(normalizedPlayerId, {
        ...currentPlayer,
        name: currentPlayer.name || sourcePlayer.name,
        color: currentPlayer.color ?? sourcePlayer.color,
        assignedCardArtIndex:
          currentPlayer.assignedCardArtIndex ?? sourcePlayer.assignedCardArtIndex ?? null,
      });
    }

    const mergedOptions = [...mergedPlayers.values()];
    const signedInOptionId = resolveSignedInPlayerOptionId({
      options: mergedOptions,
      authProfileId: authProfile?.id,
      authSessionUserId: authSession?.user?.id,
      authProfilePlayer: authProfilePlayerOption,
    });

    if (!signedInOptionId || !authProfilePlayerOption) {
      return mergedOptions;
    }

    return mergedOptions.map((player) =>
      String(player.id) === signedInOptionId
        ? {
            ...player,
            name: authProfilePlayerOption.name || player.name,
            color: authProfilePlayerOption.color ?? player.color,
            assignedCardArtIndex:
              authProfilePlayerOption.assignedCardArtIndex ??
              player.assignedCardArtIndex ??
              null,
          }
        : player,
    );
  }, [
    authProfile?.id,
    authProfilePlayerOption,
    authSession?.user?.id,
    canonicalStorePlayers,
    payloadPlayerOptions,
    selectedHeroPlayerOption,
    signedInTopPlayerOptions,
  ]);

  const sortedPlayers = useMemo<StorePlayer[]>(() => {
    const source = availablePlayerOptions.length ? availablePlayerOptions : canonicalStorePlayers;

    return [...source].sort((a: StorePlayer, b: StorePlayer) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [availablePlayerOptions, canonicalStorePlayers]);
  const recentGamePriorityPlayerIds = useMemo(() => {
    const signedInPlayerId = String(authProfilePlayerOption?.id ?? "").trim();
    const selectedHeroId = String(selectedHeroPlayerOption?.id ?? "").trim();

    if (!signedInPlayerId || signedInPlayerId !== selectedHeroId) {
      return [];
    }

    return buildRecentGameOpponentOptions({
      playerId: signedInPlayerId,
      players: sortedPlayers as any,
      recentGames: toArray(payloadRecord?.recentGames) as Array<Record<string, any>>,
      limit: 4,
    }).map((player) => String(player.id));
  }, [
    authProfilePlayerOption?.id,
    payloadRecord?.recentGames,
    selectedHeroPlayerOption?.id,
    sortedPlayers,
  ]);

  const rankedPlayerOptions = useMemo<StorePlayer[]>(
    () =>
      prioritizeSignedInPlayerOptions({
        players: sortedPlayers as any,
        games: games as any,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authProfilePlayer: authProfilePlayerOption,
        commonPlayerLimit: 4,
        explicitPriorityPlayerIds:
          signedInTopPlayerOptions.length > 0
            ? signedInTopPlayerOptions.map((player) => player.id)
            : recentGamePriorityPlayerIds,
      }),
    [
      authProfile?.id,
      authProfilePlayerOption,
      authSession?.user?.id,
      games,
      recentGamePriorityPlayerIds,
      signedInTopPlayerOptions,
      sortedPlayers,
    ],
  );

  useEffect(() => {
    setSelectedOpponentId(null);
    setPlayerSearchQuery("");
    setOpponentSearchQuery("");
  }, [resolvedPlayerId]);

  useEffect(() => {
    if (!playerId || !resolvedPlayerId || String(playerId) === String(resolvedPlayerId)) {
      return;
    }

    router.replace(buildPlayerProfileRoute(String(resolvedPlayerId)));
  }, [playerId, resolvedPlayerId, router]);

  const openCommandPage = () => {
    router.push(APP_ROUTES.home);
  };

  const handleSelectPlayer = (nextPlayerId: string) => {
    if (nextPlayerId === ALL_PLAYERS_CHIP_ID) {
      router.push(APP_ROUTES.playerDirectory);
      return;
    }
    if (String(nextPlayerId) === String(resolvedPlayerId)) return;
    router.replace(buildPlayerProfileRoute(String(nextPlayerId)));
  };

  const openCompareLaunchpad = () => {
    if (!resolvedPlayerId) return;
    router.push(buildCompareRoute({ mode: "players", ids: [String(resolvedPlayerId)] }));
  };

  const openChartsLaunchpad = () => {
    if (!resolvedPlayerId) return;
    router.push(buildChartsRoute({
      playerId: String(resolvedPlayerId),
      setup: true,
    }));
  };

  const jumpToRecentGames = () => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(recentGamesAnchorY - stickyShellHeight - 12, 0),
      animated: true,
    });
  };

  const handleProfileTabShellLayout = (event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout;
    setStickyShellHeight(height);
    setStickyShellAnchorY(y);
  };

  const handleProfileScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== "android") {
      return;
    }

    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShowStickyTabs =
      stickyShellAnchorY > 0 && offsetY >= Math.max(stickyShellAnchorY - 1, 0);
    setAndroidStickyProfileTabsVisible((currentVisible) =>
      currentVisible === shouldShowStickyTabs ? currentVisible : shouldShowStickyTabs,
    );
  };

  const selectedPlayer = useMemo(() => {
    const matchedStorePlayer =
      sortedPlayers.find((player) => String(player.id) === String(resolvedPlayerId)) || null;

    if (!payload) {
      return matchedStorePlayer;
    }

    const nextPlayer = {
      id: String(hero.id ?? resolvedPlayerId ?? matchedStorePlayer?.id ?? ""),
      name: toStringValue(hero.name, matchedStorePlayer?.name || "Player"),
      color: toStringValue(hero.color, matchedStorePlayer?.color || "") || undefined,
      assignedCardArtIndex:
        typeof hero.assignedCardArtIndex === "number"
          ? hero.assignedCardArtIndex
          : matchedStorePlayer?.assignedCardArtIndex ?? null,
    };
    const signedInSelectedPlayerId = resolveSignedInPlayerOptionId({
      options: [nextPlayer],
      authProfileId: authProfile?.id,
      authSessionUserId: authSession?.user?.id,
      authProfilePlayer: authProfilePlayerOption,
    });

    if (
      signedInSelectedPlayerId &&
      String(nextPlayer.id) === signedInSelectedPlayerId &&
      authProfilePlayerOption
    ) {
      return {
        ...nextPlayer,
        name: authProfilePlayerOption.name || nextPlayer.name,
        color: authProfilePlayerOption.color ?? nextPlayer.color,
        assignedCardArtIndex:
          authProfilePlayerOption.assignedCardArtIndex ??
          nextPlayer.assignedCardArtIndex ??
          null,
      };
    }

    return nextPlayer;
  }, [
    authProfile?.id,
    authProfilePlayerOption,
    authSession?.user?.id,
    hero.assignedCardArtIndex,
    hero.color,
    hero.id,
    hero.name,
    payload,
    resolvedPlayerId,
    sortedPlayers,
  ]);

  const filteredPlayerOptions = useMemo(() => {
    const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return rankedPlayerOptions;

    return rankedPlayerOptions.filter((player) =>
      String(player?.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [rankedPlayerOptions, deferredPlayerSearchQuery]);
  const signedInPlayerChipId = useMemo(
    () =>
      resolveSignedInPlayerOptionId({
        options: filteredPlayerOptions,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authProfilePlayer: authProfilePlayerOption,
      }),
    [
      authProfile?.id,
      authProfilePlayerOption,
      authSession?.user?.id,
      filteredPlayerOptions,
    ],
  );
  const profileSearchItems = useMemo(
    () => [
      ...filteredPlayerOptions.map((player) => ({
        id: String(player.id),
        label: player.name || "Player",
        badge: String(player.id) === String(signedInPlayerChipId ?? "").trim() ? "You" : null,
      })),
      {
        id: ALL_PLAYERS_CHIP_ID,
        label: "All players",
        kind: "action" as const,
      },
    ],
    [filteredPlayerOptions, signedInPlayerChipId],
  );

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

    return sortedPlayers.filter((p) => String(p.id) !== String(resolvedPlayerId));
  }, [payload?.opponentOptions, resolvedPlayerId, sortedPlayers]);

  const topOpponentOptions = useMemo(
    () => {
      const payloadOptions = toArray(payload?.topOpponentOptions);
      return payloadOptions.map((option) => ({
        id: String(option.id ?? option.playerId ?? ""),
        name:
          toStringValue(option.name, "") ||
          toStringValue(option.label, "") ||
          toStringValue(option.displayName, "") ||
          toStringValue(option.playerName, "") ||
          "Player",
      }));
    },
    [payload?.topOpponentOptions]
  );

  const filteredOpponentOptions = useMemo(() => {
    const normalizedQuery = deferredOpponentSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return opponentOptions.filter((player) =>
      String(player?.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [opponentOptions, deferredOpponentSearchQuery]);

  const selectedOpponentName = getPlayerNameById(sortedPlayers, selectedOpponentId);
  const selectedOpponentLabel =
    selectedOpponentId
      ? opponentOptions.find((player) => String(player.id) === String(selectedOpponentId))?.name ??
        selectedOpponentName ??
        "Focused"
      : "All";
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
  const recentGames = toArray(payload?.recentGames);

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
  const stickySignalsLabel = featuredCard ? "Ready" : "Pending";

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
  const moonrakersIntel = payload?.moonrakersIntel;

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
            <Text style={styles.backButtonText}>Command</Text>
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
        onScroll={handleProfileScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={profileStickyHeaderIndices}
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
            <Text style={styles.headerBadgeText}>Command</Text>
          </Pressable>
        </View>

        <AnalyticsControlRail
          title="Player Search"
          subtitle="Swap the focus player without leaving this full profile breakdown."
          search={{
            query: playerSearchQuery,
            onQueryChange: setPlayerSearchQuery,
            placeholder: "Search User",
            items: profileSearchItems,
            selectedIds: resolvedPlayerId ? [String(resolvedPlayerId)] : [],
            onSelect: handleSelectPlayer,
            helperText:
              "Pick another player to reuse the same analytics layout with a different focus.",
            variant: "rail",
          }}
        />

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
                <DefinitionTermText
                  label="Current ELO"
                  metric="elo_current"
                  numberOfLines={1}
                  style={styles.metricLabel}
                />
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
                <DefinitionTermText
                  label="Peak"
                  metric="elo_peak"
                  numberOfLines={1}
                  style={styles.metricLabel}
                />
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
                <DefinitionTermText
                  label="Win Rate"
                  category="elo"
                  numberOfLines={1}
                  style={styles.metricLabel}
                />
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

        <ProfileTabRailShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          opponentLabel={selectedOpponentLabel}
          signalsLabel={stickySignalsLabel}
          onLayout={handleProfileTabShellLayout}
        />

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

        {moonrakersIntel && typeof moonrakersIntel === "object" ? (
          <MoonrakersIntelSection profile={moonrakersIntel as any} />
        ) : (
          <EmptyStateCard
            message="No Moonrakers Intel available yet."
            hint="This profile does not currently expose a published Moonrakers Intel payload."
          />
        )}

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
            playerId={String(resolvedPlayerId)}
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

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.quickActionsGrid}>
            <Pressable style={styles.quickActionCard} onPress={openCompareLaunchpad}>
              <Text style={styles.quickActionTitle}>Compare with...</Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={openChartsLaunchpad}>
              <Text style={styles.quickActionTitle}>Open charts</Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={jumpToRecentGames}>
              <Text style={styles.quickActionTitle}>Recent games</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {showAndroidStickyProfileTabs ? (
        <View pointerEvents="box-none" style={styles.androidStickyProfileTabsOverlay}>
          <ProfileTabRailShell
            activeTab={activeTab}
            onTabChange={setActiveTab}
            opponentLabel={selectedOpponentLabel}
            signalsLabel={stickySignalsLabel}
            style={styles.androidStickyProfileTabsOverlayShell}
          />
        </View>
      ) : null}
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
  androidStickyProfileTabsOverlay: {
    position: "absolute",
    top: 0,
    right: uiPolish.spacing.sm,
    left: uiPolish.spacing.sm,
    zIndex: 30,
    elevation: 30,
  },
  androidStickyProfileTabsOverlayShell: {
    marginBottom: 0,
    shadowColor: "#020617",
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 24,
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
  cropImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
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
  profileTabsRail: {
    marginBottom: 8,
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
