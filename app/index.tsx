import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import HubTileCard from "@/components/ui/HubTileCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import { resolveHomeRedirect } from "@/lib/auth/launchRoute";
import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import { getEloScreen } from "@/lib/cloud/analytics/getEloScreen";
import { supabase } from "@/lib/supabase";
import {
  useAuthBootstrapStatus,
  useAuthSession,
  useAuthProfile,
  usePasswordRecoveryPending,
  useClearAuthState,
  useSetPasswordRecoveryPending,
  useGames,
  useGroups,
  usePlayers,
  useActiveGame,
  useClearActiveGame,
} from "@/store/useStore";
import { getBridgeDestinations, type HubCard } from "@/utils/appHubs";
import {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildHistoryRoute,
  buildPlayerProfileRoute,
  normalizeHomeTab,
} from "@/utils/appRoutes";
import { rankGroupsWithUsage } from "@/utils/groupUsageRanking";
import {
  ensureRequiredPlayerSelection,
  filterGroupsForSignedInPlayer,
} from "@/utils/homeCommandSelection";
import { buildCloudPlayableCommandDirectory } from "@/utils/registeredProfilePlayer";

import { GroupSelectionCard } from "@/components/home/GroupSelectionCard";
import { HomeLeaderboardTab } from "@/components/home/HomeLeaderboardTab";
import { PlayerSelectionCard } from "@/components/home/PlayerSelectionCard";
import { AnimatedSelectedNamePill } from "@/components/home/SelectedNamePill";
import type { PlayerLike, GroupLike, GameLike } from "@/components/home/homeTypes";

type Tab = "game" | "leaderboard" | "hubs";
import {
  getGamePlayerIds,
  normalizeGame,
  normalizeGroup,
  normalizeId,
  normalizePlayer,
  sameOrderedIds,
  tabLabel,
} from "@/components/home/homeUtils";

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialTab?: string }>();

  const authBootstrapStatus = useAuthBootstrapStatus();
  const authSession = useAuthSession();
  const authProfile = useAuthProfile();
  const passwordRecoveryPending = usePasswordRecoveryPending();
  const clearAuthState = useClearAuthState();
  const setPasswordRecoveryPending = useSetPasswordRecoveryPending();
  const rawPlayers = usePlayers() ?? [];
  const rawGroups = useGroups() ?? [];
  const rawGames = useGames() ?? [];
  const activeGame = useActiveGame();
  const clearActiveGame = useClearActiveGame();

  const bridgeDestinations = useMemo(() => getBridgeDestinations(), []);
  const compactBridgeDestinations = useMemo(
    () => bridgeDestinations.filter((card) => !card.fullWidth),
    [bridgeDestinations]
  );
  const featuredBridgeDestinations = useMemo(
    () => bridgeDestinations.filter((card) => card.fullWidth),
    [bridgeDestinations]
  );
  const homeRedirect = resolveHomeRedirect({
    authBootstrapStatus,
    session: authSession,
    profile: authProfile,
    passwordRecoveryPending,
  });
  const [tab, setTab] = useState<Tab>(normalizeHomeTab(params.initialTab));
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupLike | null>(null);

  const startPulse = useRef(new Animated.Value(1)).current;
  const startGlowOpacity = useRef(new Animated.Value(0)).current;
  const startGlowScale = useRef(new Animated.Value(0.98)).current;
  const removePulse = useRef(new Animated.Value(1)).current;

  const openBridgeDestination = (card: HubCard) => {
    if (card.key === "players" && selectedPlayers.length > 0) {
      openFullProfileFromHubs();
      return;
    }
    router.push(card.route as any);
  };
  const dockPulse = useRef(new Animated.Value(1)).current;
  const dockGlowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTab(normalizeHomeTab(params.initialTab));
  }, [params.initialTab]);
  const prevCanStart = useRef(false);

  const players = useMemo(
    () =>
      rawPlayers
        .map((player: any, index: number) => normalizePlayer(player, index))
        .filter((player: PlayerLike | null): player is PlayerLike => Boolean(player)),
    [rawPlayers]
  );

  const groups = useMemo(
    () =>
      rawGroups
        .map((group: any, index: number) => normalizeGroup(group, index))
        .filter((group: GroupLike | null): group is GroupLike => Boolean(group)),
    [rawGroups]
  );

  const games = useMemo(
    () =>
      rawGames
        .map((game: any) => normalizeGame(game))
        .filter((game: GameLike | null): game is GameLike => Boolean(game)),
    [rawGames]
  );

  const commandDirectory = useMemo(
    () => buildCloudPlayableCommandDirectory(players, groups),
    [groups, players]
  );

  const commandPlayers = commandDirectory.players;
  const commandGroups = commandDirectory.groups as GroupLike[];
  const playerIdAliases = commandDirectory.aliases;

  const playersById = useMemo(() => {
    return commandPlayers.reduce((acc: Record<string, PlayerLike>, player) => {
      acc[player.id] = player;
      return acc;
    }, {});
  }, [commandPlayers]);

  const usage = useMemo(() => {
    const playerGameCount: Record<string, number> = {};
    const playerRecentAt: Record<string, number> = {};
    const groupUseCount: Record<string, number> = {};
    const groupRecentAt: Record<string, number> = {};
    const comboUseCount: Record<string, number> = {};
    const comboRecentAt: Record<string, number> = {};

    for (const game of games) {
      const createdAt = game.createdAt ?? 0;
      const gamePlayerIds = Array.from(
        new Set(
          getGamePlayerIds(game)
            .map((playerId) => playerIdAliases[playerId] ?? playerId)
            .filter(Boolean)
        )
      );
      const comboKey = [...gamePlayerIds].sort().join("|");

      for (const playerId of gamePlayerIds) {
        playerGameCount[playerId] = (playerGameCount[playerId] ?? 0) + 1;
        playerRecentAt[playerId] = Math.max(playerRecentAt[playerId] ?? 0, createdAt);
      }

      if (game.groupId) {
        groupUseCount[game.groupId] = (groupUseCount[game.groupId] ?? 0) + 1;
        groupRecentAt[game.groupId] = Math.max(groupRecentAt[game.groupId] ?? 0, createdAt);
      }

      if (comboKey) {
        comboUseCount[comboKey] = (comboUseCount[comboKey] ?? 0) + 1;
        comboRecentAt[comboKey] = Math.max(comboRecentAt[comboKey] ?? 0, createdAt);
      }
    }

    return { playerGameCount, playerRecentAt, groupUseCount, groupRecentAt, comboUseCount, comboRecentAt };
  }, [games, playerIdAliases]);

  const rankedPlayers = useMemo(() => {
    return [...commandPlayers].sort((a, b) => {
      const aCount = usage.playerGameCount[a.id] ?? 0;
      const bCount = usage.playerGameCount[b.id] ?? 0;
      if (bCount !== aCount) return bCount - aCount;

      const aRecent = usage.playerRecentAt[a.id] ?? 0;
      const bRecent = usage.playerRecentAt[b.id] ?? 0;
      if (bRecent !== aRecent) return bRecent - aRecent;

      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
  }, [commandPlayers, usage]);

  const rankedGroups = useMemo(() => {
    return rankGroupsWithUsage(commandGroups, games, {
      normalizePlayerId: (playerId) =>
        normalizeId(playerIdAliases[playerId] ?? playerId),
    });
  }, [commandGroups, games, playerIdAliases]);

  const signedInPlayerId = useMemo(() => {
    const candidates = [
      normalizeId(authProfile?.id),
      normalizeId(authSession?.user?.id),
    ].filter(Boolean);

    for (const candidate of candidates) {
      const canonicalId = normalizeId(playerIdAliases[candidate] ?? candidate);
      if (canonicalId && commandPlayers.some((player) => player.id === canonicalId)) {
        return canonicalId;
      }
    }

    return "";
  }, [authProfile?.id, authSession?.user?.id, commandPlayers, playerIdAliases]);

  const visibleGroups = useMemo(
    () => filterGroupsForSignedInPlayer(rankedGroups, signedInPlayerId),
    [rankedGroups, signedInPlayerId]
  );

  const selectedPlayers = useMemo(
    () => rankedPlayers.filter((player) => selectedIds.includes(player.id)),
    [rankedPlayers, selectedIds]
  );

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) return rankedPlayers;
    return rankedPlayers.filter((player) =>
      [player.name, player.initials].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [playerSearch, rankedPlayers]);

  const canStart = selectedPlayers.length >= 2 && selectedPlayers.length <= 5;

  useEffect(() => {
    setSelectedIds((current) => {
      const remapped = ensureRequiredPlayerSelection(
        Array.from(
          new Set(current.map((playerId) => playerIdAliases[playerId] ?? playerId))
        ),
        signedInPlayerId
      );
      return sameOrderedIds(current, remapped) ? current : remapped;
    });
  }, [playerIdAliases, signedInPlayerId]);

  useEffect(() => {
    if (!signedInPlayerId) return;
    setSelectedIds((current) => {
      const next = ensureRequiredPlayerSelection(current, signedInPlayerId);
      return sameOrderedIds(current, next) ? current : next;
    });
  }, [signedInPlayerId]);

  useEffect(() => {
    setSelectedGroup((current) => {
      if (!current) return current;
      const nextGroup = visibleGroups.find((group) => group.id === current.id) ?? null;
      if (!nextGroup) return null;
      return current.name === nextGroup.name &&
        sameOrderedIds(current.playerIds, nextGroup.playerIds)
        ? current
        : nextGroup;
    });
  }, [visibleGroups]);

  useEffect(() => {
    if (canStart && !prevCanStart.current) {
      startPulse.setValue(1);
      Animated.sequence([
        Animated.timing(startPulse, {
          toValue: 1.08,
          duration: 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(startPulse, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCanStart.current = canStart;
  }, [canStart, startPulse]);

  useEffect(() => {
    if (!canStart) {
      startGlowOpacity.stopAnimation();
      startGlowScale.stopAnimation();
      startGlowOpacity.setValue(0);
      startGlowScale.setValue(0.98);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(startGlowOpacity, {
            toValue: 0.7,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(startGlowOpacity, {
            toValue: 0.28,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(startGlowScale, {
            toValue: 1.02,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(startGlowScale, {
            toValue: 0.99,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [canStart, startGlowOpacity, startGlowScale]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      dockGlowOpacity.stopAnimation();
      dockGlowOpacity.setValue(0);
      dockPulse.setValue(1);
      return;
    }

    dockPulse.setValue(0.96);
    dockGlowOpacity.setValue(0.26);

    Animated.parallel([
      Animated.spring(dockPulse, {
        toValue: 1,
        damping: 12,
        stiffness: 210,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(dockGlowOpacity, {
          toValue: 0.42,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dockGlowOpacity, {
          toValue: 0.14,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [dockGlowOpacity, dockPulse, selectedIds]);

  if (homeRedirect) {
    return <Redirect href={homeRedirect as any} />;
  }

  const triggerRemovePulse = () => {
    removePulse.setValue(1);
    Animated.sequence([
      Animated.timing(removePulse, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(removePulse, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const togglePlayer = (id: string) => {
    setSelectedGroup(null);
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        if (id === signedInPlayerId) return prev;
        triggerRemovePulse();
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 5) return prev;
      return ensureRequiredPlayerSelection([...prev, id], signedInPlayerId);
    });
  };

  const loadGroup = (group: GroupLike) => {
    setSelectedGroup(group);
    setSelectedIds(ensureRequiredPlayerSelection(group.playerIds, signedInPlayerId));
  };

  const clearSelection = () => {
    setSelectedGroup(null);
    setSelectedIds(ensureRequiredPlayerSelection([], signedInPlayerId));
    triggerRemovePulse();
  };

  const openPlayerProfile = (player: PlayerLike) => {
    if (!player?.id) return;
    router.push(buildPlayerProfileRoute(player.id));
  };

  const openFullProfileFromHubs = () => {
    const focusPlayer =
      rankedPlayers.find((player) => player.id === signedInPlayerId) ??
      selectedPlayers[0] ??
      rankedPlayers[0];
    if (!focusPlayer?.id) return;
    router.push(buildPlayerProfileRoute(focusPlayer.id));
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      await clearPendingAuthIntent();
      setPasswordRecoveryPending(false);
      clearAuthState();
      router.replace(APP_ROUTES.login);
    }
  };

  const confirmDeleteActiveGame = () => {
    Alert.alert(
      "Delete Active Game",
      "This will permanently discard the current game in progress. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: clearActiveGame },
      ]
    );
  };

  const startGame = () => {
    if (!canStart) return;

    const effectiveGroup = selectedGroup
      ? {
          ...selectedGroup,
          playerIds: ensureRequiredPlayerSelection(selectedIds, signedInPlayerId),
        }
      : null;
    const selectedPlayerNamesOnly = rankedPlayers
      .filter((player) => selectedIds.includes(player.id))
      .map((player) => ({
        id: player.id,
        name: player.name ?? "Unknown",
        color: player.color,
        initials: player.initials,
        assignedCardArtIndex: player.assignedCardArtIndex ?? null,
      }));

    router.push({
      pathname: "/game-setup",
      params: {
        mode: effectiveGroup ? "group" : "players",
        selectedPlayers: JSON.stringify(effectiveGroup ? [] : selectedPlayerNamesOnly),
        selectedGroups: JSON.stringify(
          effectiveGroup
            ? [{ id: effectiveGroup.id, name: effectiveGroup.name, playerIds: effectiveGroup.playerIds }]
            : []
        ),
        players: JSON.stringify(
          rankedPlayers.map((player) => ({
            id: player.id,
            name: player.name ?? "Unknown",
            color: player.color,
            initials: player.initials,
            assignedCardArtIndex: player.assignedCardArtIndex ?? null,
          }))
        ),
        groups: JSON.stringify(
          rankedGroups.map((group) => ({
            id: group.id,
            name: group.name,
            playerIds: group.playerIds,
          }))
        ),
      },
    });
  };

  const headerTitle =
    tab === "leaderboard" ? "Data Center" : tab === "hubs" ? "Hubs" : "Command";

  return (
    <PageShell
      preset="command"
      density="compact"
      viewport="fit"
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.homeShellContent}
    >
      <AppHeader
        eyebrow="Moonrakers Command"
        title={headerTitle}
        identity="emblem"
        size="compact"
        actions={
          <ActionButton
            title="Sign Out"
            variant="ghost"
            onPress={handleSignOut}
            style={styles.headerAction}
          />
        }
      />

      <SegmentedControl
        value={tab}
        onChange={(next) => setTab(normalizeHomeTab(next))}
        style={styles.homeTabControl}
        items={[
          { key: "game", label: tabLabel("game") },
          { key: "leaderboard", label: tabLabel("leaderboard") },
          { key: "hubs", label: tabLabel("hubs") },
        ]}
      />

      <View style={styles.homeTabContent}>

        {tab === "game" && (
          <View style={styles.gameTabWrap}>
            <ScrollView
              contentContainerStyle={styles.gameScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeGame ? (
                <SectionCard eyebrow="Active Game" title="Current Match">
                  <View style={styles.commandActionRow}>
                    <ActionButton
                      title="Continue"
                      onPress={() => router.push(APP_ROUTES.game)}
                      style={styles.commandHalfButton}
                    />
                    <ActionButton
                      title="Delete"
                      variant="danger"
                      onPress={confirmDeleteActiveGame}
                      style={styles.commandHalfButton}
                    />
                  </View>
                </SectionCard>
              ) : null}

              <Animated.View
                style={[styles.primaryActions, { transform: [{ scale: startPulse }] }]}
              >
                <ActionButton
                  title="Start Game"
                  onPress={startGame}
                  disabled={!canStart}
                  style={styles.startGameButton}
                />
              </Animated.View>

              <SectionCard title="Quick Launch">
                <View style={styles.quickLaunchGrid}>
                  <ActionButton
                    title="Compare"
                    variant="secondary"
                    style={styles.quickLaunchButton}
                    onPress={() => router.push(buildCompareRoute())}
                  />
                  <ActionButton
                    title="Charts"
                    variant="secondary"
                    style={styles.quickLaunchButton}
                    onPress={() => router.push(buildChartsRoute())}
                  />
                  <ActionButton
                    title="Profiles"
                    variant="secondary"
                    style={styles.quickLaunchButton}
                    onPress={() => router.push(APP_ROUTES.playerDirectory)}
                  />
                  <ActionButton
                    title="History"
                    variant="secondary"
                    style={styles.quickLaunchButton}
                    onPress={() => router.push(buildHistoryRoute())}
                  />
                </View>
              </SectionCard>

              <SectionCard title="Players">
                {rankedPlayers.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyPanelText}>No player profiles found.</Text>
                  </View>
                ) : (
                  <View style={styles.commandPlayerPicker}>
                    <TextInput
                      value={playerSearch}
                      onChangeText={setPlayerSearch}
                      placeholder="Search players"
                      placeholderTextColor="#7D9BC4"
                      style={styles.commandSearchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />

                    <Text style={styles.commandPlayerHint}>
                      Tap to select. Hold to open a profile.
                    </Text>

                    <View style={styles.commandPlayerViewport}>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.commandPlayerViewportContent}
                      >
                        {filteredPlayers.length === 0 ? (
                          <View style={styles.emptyPanel}>
                            <Text style={styles.emptyPanelText}>
                              No players match that search yet.
                            </Text>
                          </View>
                        ) : (
                          <Animated.View
                            style={[
                              styles.playerGridCompact,
                              { transform: [{ scale: removePulse }] },
                            ]}
                          >
                            {filteredPlayers.map((player) => {
                              const selected = selectedIds.includes(player.id);
                              const locked =
                                !selected && !selectedGroup && selectedIds.length >= 5;
                              const dimmed = Boolean(selectedGroup) && !selected;

                              return (
                                <PlayerSelectionCard
                                  key={player.id}
                                  player={player}
                                  selected={selected}
                                  dimmed={dimmed}
                                  locked={locked}
                                  showInitial={false}
                                  onPress={() => togglePlayer(player.id)}
                                  onLongPress={() => openPlayerProfile(player)}
                                />
                              );
                            })}
                          </Animated.View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </SectionCard>

              <SectionCard eyebrow="Saved Tables" title="Groups">
                {visibleGroups.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyPanelText}>No saved groups found.</Text>
                  </View>
                ) : (
                  <View style={styles.groupListCompact}>
                    {visibleGroups.map((group) => (
                      <GroupSelectionCard
                        key={group.id}
                        group={group}
                        selected={selectedGroup?.id === group.id}
                        onPress={() => loadGroup(group)}
                        playersById={playersById}
                      />
                    ))}
                  </View>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="Selected Crew"
                title={`${selectedPlayers.length}/5 Selected`}
                actions={
                  <ActionButton
                    title="Clear Selection"
                    variant="ghost"
                    onPress={clearSelection}
                    disabled={selectedPlayers.length === 0}
                    style={styles.clearSelectionButton}
                  />
                }
              >
                {selectedPlayers.length === 0 ? (
                  <Text style={styles.selectedCrewEmpty}>No players selected.</Text>
                ) : (
                  <View style={styles.selectedCrewWrap}>
                    {selectedPlayers.map((player) => (
                      <AnimatedSelectedNamePill
                        key={player.id}
                        name={player.name ?? "Unknown"}
                        color={player.color}
                      />
                    ))}
                  </View>
                )}
              </SectionCard>
            </ScrollView>
          </View>
        )}

        {tab === "leaderboard" && (
          <View style={styles.leaderboardPanel}>
            <HomeLeaderboardTab
              profileId={
                String(authProfile?.id ?? authSession?.user?.id ?? "").trim() || null
              }
              fetchEloScreen={getEloScreen}
            />
          </View>
        )}

        {tab === "hubs" && (
          <View style={styles.hubsPanel}>
            <View style={styles.hubGrid}>
              {compactBridgeDestinations.map((card, index) => (
                <HubTileCard
                  key={card.key}
                  title={card.title}
                  description={card.description}
                  iconKey={card.iconKey ?? null}
                  layout={card.layout ?? (card.iconKey ? "graphic" : "text")}
                  tint={
                    index % 2 === 0
                      ? "rgba(96,165,250,0.16)"
                      : "rgba(168,85,247,0.14)"
                  }
                  style={[styles.hubTileBase, styles.hubTileHalf]}
                  onPress={() => openBridgeDestination(card)}
                />
              ))}
            </View>
            <View style={styles.hubWideStack}>
              {featuredBridgeDestinations.map((card, index) => (
                <HubTileCard
                  key={card.key}
                  title={card.title}
                  description={card.description}
                  iconKey={card.iconKey ?? null}
                  layout={card.layout ?? (card.iconKey ? "graphic" : "text")}
                  tint={
                    index % 2 === 0
                      ? "rgba(96,165,250,0.16)"
                      : "rgba(168,85,247,0.14)"
                  }
                  style={[styles.hubTileBase, styles.hubTileFullWidth]}
                  onPress={() => openBridgeDestination(card)}
                />
              ))}
            </View>
          </View>
        )}

      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  homeShellContent: {
    flex: 1,
  },
  headerAction: {
    alignSelf: "center",
    minWidth: 108,
  },
  homeTabControl: {
    marginTop: 2,
    alignSelf: "center",
  },
  homeTabContent: {
    flex: 1,
  },
  homePrimaryPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(168,85,247,0.18)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.32)",
  },

  gameTabWrap: {
    flex: 1,
  },
  gameScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 48,
    gap: 6,
  },

  emptyPanel: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
  },
  emptyPanelText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },

  playerGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  groupListCompact: {
    gap: 4,
    justifyContent: "flex-start",
    alignSelf: "stretch",
  },
  commandActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  commandPlayerPicker: {
    gap: 10,
  },
  commandPlayerHint: {
    color: "#7D9BC4",
    fontSize: 11,
    fontWeight: "600",
  },
  commandPlayerViewport: {
    height: 198,
    overflow: "hidden",
  },
  commandHalfButton: {
    flex: 1,
  },
  primaryActions: {
    marginBottom: 2,
  },
  quickLaunchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickLaunchButton: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  startGameButton: {
    width: "100%",
  },
  commandPlayerViewportContent: {
    paddingBottom: 4,
  },
  commandSearchInput: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.2)",
    backgroundColor: "rgba(9,14,28,0.96)",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clearSelectionButton: {
    minWidth: 120,
  },
  selectedCrewWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedCrewEmpty: {
    color: "#C9D8F4",
    fontSize: 13,
    fontWeight: "700",
  },
  leaderboardPanel: {
    flex: 1,
    minHeight: 0,
  },
  hubsPanel: {
    flex: 1,
    minHeight: 0,
    justifyContent: "flex-start",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  hubGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  hubWideStack: {
    width: "100%",
  },
  hubTileBase: {
    minHeight: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  hubTileHalf: {
    width: "48.5%",
    height: "48.5%",
  },
  hubTileFullWidth: {
    width: "100%",
    minHeight: 112,
    paddingHorizontal: 18,
  },
});
