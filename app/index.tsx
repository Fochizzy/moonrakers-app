import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import BugReportModal from "@/components/support/BugReportModal";
import PlayerAccessModal, {
  type PlayerAccessMode,
  type PlayerAccessOption,
} from "@/components/home/PlayerAccessModal";
import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import HubTileCard from "@/components/ui/HubTileCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import { resolveHomeRedirect } from "@/lib/auth/launchRoute";
import { runSignOutFlow } from "@/lib/auth/signOutFlow";
import { getAppVersion } from "@/lib/telemetry/errorReporting";
import { getEloScreen } from "@/lib/cloud/analytics/getEloScreen";
import {
  createGuestProfile,
  verifyPlayerForGame,
} from "@/lib/cloud/playerAccess";
import {
  authorizeSharedGroupForFastSetup,
  isGroupFastSetupAuthorized,
} from "@/lib/cloud/sharedGroups";
import { formatSupabaseConfigError } from "@/lib/supabase";
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
  useStore,
} from "@/store/useStore";
import { getBridgeDestinations, type HubCard } from "@/utils/appHubs";
import {
  APP_ROUTES,
  buildPlayerProfileRoute,
  normalizeHomeTab,
} from "@/utils/appRoutes";
import { rankGroupsWithUsage } from "@/utils/groupUsageRanking";
import {
  ensureRequiredPlayerSelection,
  filterGroupsForSignedInPlayer,
} from "@/utils/homeCommandSelection";
import {
  matchesPlayerNameQuery,
  resolvePlayerDisplayName,
} from "@/utils/playerDisplayName";
import { buildPlayerSelectionPreview } from "@/utils/playerSelectionPreview";
import { buildCloudPlayableCommandDirectory } from "@/utils/registeredProfilePlayer";

import { GroupSelectionCard } from "@/components/home/GroupSelectionCard";
import { HomeLeaderboardTab } from "@/components/home/HomeLeaderboardTab";
import { PlayerSelectionCard } from "@/components/home/PlayerSelectionCard";
import type { PlayerLike, GroupLike, GameLike } from "@/components/home/homeTypes";
import { canResumeDraft } from "@/lib/game-draft/phase";
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { createUuid } from "@/lib/ids/uuid";

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
  const upsertRegisteredProfile = useStore(
    (state) => state.upsertRegisteredProfile,
  );
  const {
    gameDraft,
    replaceDraft,
    ensureDraftForLegacyActiveGame,
    discardUnfinishedGame,
    isDiscardingUnfinishedGame,
  } = useSyncedGameDraft();

  const bridgeDestinations = useMemo(() => getBridgeDestinations(), []);
  // The hubs tab is nothing but its tiles, so lay them out as explicit rows that
  // split the panel height evenly instead of a wrapping grid that leaves a gap.
  const bridgeRows = useMemo(() => {
    const rows: HubCard[][] = [];
    for (let index = 0; index < bridgeDestinations.length; index += 2) {
      rows.push(bridgeDestinations.slice(index, index + 2));
    }
    return rows;
  }, [bridgeDestinations]);
  const homeRedirect = resolveHomeRedirect({
    authBootstrapStatus,
    session: authSession,
    profile: authProfile,
    passwordRecoveryPending,
  });
  const [tab, setTab] = useState<Tab>(normalizeHomeTab(params.initialTab));
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupLike | null>(null);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [playerAccessMode, setPlayerAccessMode] =
    useState<PlayerAccessMode>(null);
  const [pendingAccessPlayer, setPendingAccessPlayer] =
    useState<PlayerAccessOption | null>(null);
  const [pendingAccessIds, setPendingAccessIds] = useState<string[]>([]);
  const [pendingAccessGroup, setPendingAccessGroup] =
    useState<GroupLike | null>(null);
  const [authorizedPlayerIds, setAuthorizedPlayerIds] = useState<string[]>([]);
  const [playerAccessBusy, setPlayerAccessBusy] = useState(false);
  const [playerAccessError, setPlayerAccessError] = useState<string | null>(null);
  const [playerAccessNotice, setPlayerAccessNotice] = useState<string | null>(null);
  const [checkingGroupId, setCheckingGroupId] = useState<string | null>(null);
  const selectionDraftId = useRef(gameDraft?.draftId ?? createUuid()).current;

  const startPulse = useRef(new Animated.Value(1)).current;
  const startGlowOpacity = useRef(new Animated.Value(0)).current;
  const startGlowScale = useRef(new Animated.Value(0.98)).current;
  const removePulse = useRef(new Animated.Value(1)).current;

  const openBridgeDestination = (card: HubCard) => {
    if (card.key === "players" && selectedPlayers.length > 0) {
      openFullProfileFromHubs();
      return;
    }
    router.push(card.route);
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
        .map((player, index) => normalizePlayer(player, index))
        .filter((player: PlayerLike | null): player is PlayerLike => Boolean(player)),
    [rawPlayers]
  );

  const groups = useMemo(
    () =>
      rawGroups
        .map((group, index) => normalizeGroup(group, index))
        .filter((group: GroupLike | null): group is GroupLike => Boolean(group)),
    [rawGroups]
  );

  const games = useMemo(
    () =>
      rawGames
        .map((game) => normalizeGame(game))
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

  const existingPlayerOptions = useMemo(
    () =>
      rankedPlayers.filter(
        (player) =>
          !player.isGuest &&
          player.id !== signedInPlayerId &&
          !selectedIds.includes(player.id),
      ),
    [rankedPlayers, selectedIds, signedInPlayerId],
  );
  const existingGuestOptions = useMemo(
    () =>
      rankedPlayers.filter(
        (player) => player.isGuest && !selectedIds.includes(player.id),
      ),
    [rankedPlayers, selectedIds],
  );

  const visibleGroups = useMemo(
    () => filterGroupsForSignedInPlayer(rankedGroups, signedInPlayerId),
    [rankedGroups, signedInPlayerId]
  );

  const selectedPlayers = useMemo(
    () => rankedPlayers.filter((player) => selectedIds.includes(player.id)),
    [rankedPlayers, selectedIds]
  );
  const selectedPlayersInOrder = useMemo(
    () =>
      selectedIds.flatMap((playerId) => {
        const player = playersById[playerId];
        return player ? [player] : [];
      }),
    [playersById, selectedIds],
  );

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim();
    if (!query) return rankedPlayers;
    return rankedPlayers.filter((player) => matchesPlayerNameQuery(player, query));
  }, [playerSearch, rankedPlayers]);
  const collapsedPlayerPreview = useMemo(
    () =>
      buildPlayerSelectionPreview(filteredPlayers, {
        priorityPlayerIds: [signedInPlayerId, ...selectedIds],
        maxVisible: 6,
      }),
    [filteredPlayers, selectedIds, signedInPlayerId]
  );
  const hasPlayerSearch = playerSearch.trim().length > 0;
  const visiblePlayerOptions = useMemo(
    () =>
      hasPlayerSearch || showAllPlayers
        ? filteredPlayers
        : collapsedPlayerPreview,
    [collapsedPlayerPreview, filteredPlayers, hasPlayerSearch, showAllPlayers]
  );
  const canTogglePlayerPreview = !hasPlayerSearch && filteredPlayers.length > collapsedPlayerPreview.length;

  const canStart = selectedPlayers.length >= 2 && selectedPlayers.length <= 5;
  const commandPrepTitle = canStart ? "Start with this crew" : "Choose your crew";
  const selectedCrewKey = Array.from(
    new Set(
      selectedIds
        .map((playerId) => normalizeId(playerIdAliases[playerId] ?? playerId))
        .filter(Boolean)
    )
  )
    .sort()
    .join("|");
  const activeSelectedGroup = useMemo(() => {
    if (!selectedCrewKey) return null;

    const candidateGroups = selectedGroup
      ? [selectedGroup, ...visibleGroups.filter((group) => group.id !== selectedGroup.id)]
      : visibleGroups;

    return candidateGroups.find((group) => {
      const groupKey = Array.from(
        new Set(
          group.playerIds
            .map((playerId) => normalizeId(playerIdAliases[playerId] ?? playerId))
            .filter(Boolean)
        )
      )
        .sort()
        .join("|");

      return groupKey === selectedCrewKey;
    }) ?? null;
  }, [playerIdAliases, selectedCrewKey, selectedGroup, visibleGroups]);
  const selectedCrewLabel = selectedPlayersInOrder
    .map((player) => player.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(" • ");
  const startGameSubtitle =
    activeSelectedGroup?.name?.trim() || selectedCrewLabel || "Select 2 to 5 captains";

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
    if (!gameDraft || !canResumeDraft(gameDraft) || !gameDraft.selectedPlayerIds.length) {
      return;
    }

    setSelectedIds((current) => {
      const next = ensureRequiredPlayerSelection(
        gameDraft.selectedPlayerIds,
        signedInPlayerId,
      );
      return sameOrderedIds(current, next) ? current : next;
    });

    if (!gameDraft.selectedGroupId) {
      setSelectedGroup(null);
      return;
    }

    const restoredGroup =
      visibleGroups.find((group) => group.id === gameDraft.selectedGroupId) ?? null;
    setSelectedGroup(restoredGroup);
  }, [gameDraft, signedInPlayerId, visibleGroups]);

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
      return undefined;
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
    return <Redirect href={homeRedirect} />;
  }

  const triggerRemovePulse = () => {
    removePulse.setValue(1);
    Animated.sequence([
      Animated.timing(removePulse, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(removePulse, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const announcePlayerAdded = (message: string) => {
    setPlayerAccessNotice(message);
    Alert.alert("Added to game", message);
  };

  const closePlayerAccess = () => {
    if (playerAccessBusy) return;
    setPlayerAccessMode(null);
    setPendingAccessPlayer(null);
    setPendingAccessIds([]);
    setPendingAccessGroup(null);
    setPlayerAccessError(null);
  };

  const openPlayerVerification = (
    player: PlayerAccessOption,
    remainingIds: string[] = [],
    group: GroupLike | null = null,
  ) => {
    setPendingAccessPlayer(player);
    setPendingAccessIds(remainingIds);
    setPendingAccessGroup(group);
    setPlayerAccessError(null);
    setPlayerAccessMode("passcode");
  };

  const removePlayerFromGame = (player: PlayerLike) => {
    if (player.id === signedInPlayerId) return;

    setSelectedGroup(null);
    setSelectedIds((current) => current.filter((id) => id !== player.id));
    setAuthorizedPlayerIds((current) =>
      current.filter((id) => id !== player.id),
    );
    setPlayerAccessNotice(
      `${resolvePlayerDisplayName(player)} removed from the game.`,
    );
    triggerRemovePulse();
  };

  const requestPlayerAccess = (player: PlayerLike) => {
    if (selectedIds.includes(player.id)) {
      removePlayerFromGame(player);
      return;
    }

    if (selectedIds.length >= 5) return;

    if (player.id === signedInPlayerId) {
      setSelectedIds((current) =>
        ensureRequiredPlayerSelection([...current, player.id], signedInPlayerId),
      );
      return;
    }

    openPlayerVerification(player);
  };

  const togglePlayer = (id: string) => {
    const player = rankedPlayers.find((candidate) => candidate.id === id);
    if (!player) return;
    requestPlayerAccess(player);
  };

  const loadGroup = async (group: GroupLike) => {
    if (checkingGroupId || playerAccessBusy) {
      return;
    }

    const groupPlayerIds = ensureRequiredPlayerSelection(
      group.playerIds,
      signedInPlayerId,
    ).slice(0, 5);

    setCheckingGroupId(group.id);

    try {
      const hasFastSetup = await isGroupFastSetupAuthorized(group.id);

      if (hasFastSetup) {
        setSelectedGroup(group);
        setSelectedIds(groupPlayerIds);
        announcePlayerAdded(`${group.name} added to the game.`);
        return;
      }

      const idsNeedingAccess = groupPlayerIds.filter(
        (id) =>
          id !== signedInPlayerId && !authorizedPlayerIds.includes(id),
      );

      if (!idsNeedingAccess.length) {
        await authorizeSharedGroupForFastSetup({
          draftId: gameDraft?.draftId ?? selectionDraftId,
          groupId: group.id,
        });
        setSelectedGroup(group);
        setSelectedIds(groupPlayerIds);
        announcePlayerAdded(`${group.name} added to the game.`);
        return;
      }

      const [firstId, ...remainingIds] = idsNeedingAccess;
      const firstPlayer = rankedPlayers.find((player) => player.id === firstId);
      if (!firstPlayer) {
        throw new Error("A member of this saved group is no longer available.");
      }
      openPlayerVerification(firstPlayer, remainingIds, group);
    } catch (error) {
      Alert.alert("Couldn't load group", formatSupabaseConfigError(error));
    } finally {
      setCheckingGroupId(null);
    }
  };

  const finishPendingGroupAuthorization = async (group: GroupLike) => {
    await authorizeSharedGroupForFastSetup({
      draftId: gameDraft?.draftId ?? selectionDraftId,
      groupId: group.id,
    });

    setSelectedGroup(group);
    setSelectedIds(
      ensureRequiredPlayerSelection(group.playerIds, signedInPlayerId).slice(0, 5),
    );
    announcePlayerAdded(`${group.name} added to the game.`);
  };

  const closeCompletedPlayerAccess = () => {
    setPlayerAccessMode(null);
    setPendingAccessPlayer(null);
    setPendingAccessIds([]);
    setPendingAccessGroup(null);
  };

  const handleVerifyPlayer = async (passcode: string) => {
    if (!pendingAccessPlayer || playerAccessBusy) return;

    setPlayerAccessBusy(true);
    setPlayerAccessError(null);

    try {
      const verified = await verifyPlayerForGame({
        draftId: gameDraft?.draftId ?? selectionDraftId,
        profileId: pendingAccessPlayer.id,
        passcode,
      });

      if (!verified) {
        setPlayerAccessError("Incorrect passcode.");
        return;
      }

      setAuthorizedPlayerIds((current) =>
        current.includes(pendingAccessPlayer.id)
          ? current
          : [...current, pendingAccessPlayer.id],
      );

      const remainingPlayers = pendingAccessIds.flatMap((id) => {
        const player = rankedPlayers.find((candidate) => candidate.id === id);
        return player ? [player] : [];
      });
      const [nextPlayer, ...remaining] = remainingPlayers;

      if (nextPlayer) {
        openPlayerVerification(
          nextPlayer,
          remaining.map((player) => player.id),
          pendingAccessGroup,
        );
        return;
      }

      if (pendingAccessGroup) {
        await finishPendingGroupAuthorization(pendingAccessGroup);
      } else {
        setSelectedGroup(null);
        setSelectedIds((current) =>
          ensureRequiredPlayerSelection(
            [...current, pendingAccessPlayer.id],
            signedInPlayerId,
          ).slice(0, 5),
        );
        announcePlayerAdded(
          `${resolvePlayerDisplayName(pendingAccessPlayer)} added to the game.`,
        );
      }

      closeCompletedPlayerAccess();
    } catch (error) {
      setPlayerAccessError(formatSupabaseConfigError(error));
    } finally {
      setPlayerAccessBusy(false);
    }
  };

  const handleCreateGuest = async (input: {
    username: string;
    passcode: string;
  }) => {
    if (playerAccessBusy || selectedIds.length >= 5) return;

    setPlayerAccessBusy(true);
    setPlayerAccessError(null);

    try {
      const guest = await createGuestProfile(input);
      const verified = await verifyPlayerForGame({
        draftId: gameDraft?.draftId ?? selectionDraftId,
        profileId: guest.id,
        passcode: input.passcode,
      });

      if (!verified) {
        throw new Error("The guest was created but could not be authorized.");
      }

      upsertRegisteredProfile({
        id: guest.id,
        name: guest.player_name,
        color: guest.favorite_color ?? undefined,
        assignedCardArtIndex: guest.assigned_card_art_index ?? null,
        hasSavedGames: false,
        isGuest: true,
        hasPasscode: true,
      });
      setAuthorizedPlayerIds((current) => [...current, guest.id]);
      setSelectedGroup(null);
      setSelectedIds((current) =>
        ensureRequiredPlayerSelection(
          [...current, guest.id],
          signedInPlayerId,
        ).slice(0, 5),
      );
      announcePlayerAdded(`${guest.player_name} added to the game.`);
      setPlayerAccessMode(null);
    } catch (error) {
      setPlayerAccessError(formatSupabaseConfigError(error));
    } finally {
      setPlayerAccessBusy(false);
    }
  };

  const clearSelection = () => {
    setSelectedGroup(null);
    setSelectedIds(ensureRequiredPlayerSelection([], signedInPlayerId));
    setPlayerAccessNotice(null);
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
    await runSignOutFlow({
      setPasswordRecoveryPending,
      clearAuthState,
      router,
    });
  };

  const confirmDeleteActiveGame = () => {
    if (isDiscardingUnfinishedGame) {
      return;
    }

    Alert.alert(
      "Delete Active Game",
      "This will permanently discard the current game in progress. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await discardUnfinishedGame();
            if ("message" in result) {
              Alert.alert("Couldn't discard unfinished game", result.message);
            }
          },
        },
      ]
    );
  };

  const continueActiveGame = async () => {
    if (activeGame) {
      await ensureDraftForLegacyActiveGame(activeGame);
    }

    router.push(APP_ROUTES.game);
  };

  const launchSeededDraft = async () => {
    if (!canStart || !authSession?.user?.id) {
      return;
    }

    const effectiveGroup = activeSelectedGroup
      ? {
          ...activeSelectedGroup,
          playerIds: ensureRequiredPlayerSelection(selectedIds, signedInPlayerId),
        }
      : null;
    const selectedPlayerIds = effectiveGroup ? effectiveGroup.playerIds : selectedIds;
    const timestamp = Date.now();

    await replaceDraft({
      profileId: authSession.user.id,
      draftId: gameDraft?.draftId ?? selectionDraftId,
      phase: "setup",
      revision: gameDraft?.revision ?? 0,
      updatedAt: timestamp,
      deviceUpdatedAt: timestamp,
      selectedPlayerIds,
      selectedGroupId: effectiveGroup?.id ?? null,
      selectedGroupName: effectiveGroup?.name ?? null,
      turnOrder: selectedPlayerIds,
      playerSnapshots: rankedPlayers
        .filter((player) => selectedPlayerIds.includes(player.id))
        .map((player) => ({
          id: player.id,
          name: player.name ?? "Unknown",
          color: player.color,
          initials: player.initials,
          assignedCardArtIndex: player.assignedCardArtIndex ?? null,
        })),
      gameplay: null,
    });

    router.push(APP_ROUTES.gameSetup);
  };

  const startGame = () => {
    if (!canStart) return;

    if (activeGame) {
      confirmDeleteActiveGame();
      return;
    }

    void launchSeededDraft();
  };

  const headerTitle =
    tab === "leaderboard" ? "Data Center" : tab === "hubs" ? "Hubs" : "Command";

  // A report is only useful if it says who filed it, so resolve the same name
  // the rest of the app shows for the signed-in player.
  const reporterProfileId =
    String(authProfile?.id ?? authSession?.user?.id ?? "").trim() || null;
  const reporterName =
    String(
      authProfile?.player_name ??
        authSession?.user?.email ??
        "",
    ).trim() || "Unknown player";

  return (
    <PageShell
      preset="command"
      density="compact"
      viewport="fit"
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.homeShellContent}
    >
      <AppHeader
        eyebrow="Moonraker's Analytics"
        title={headerTitle}
        identity="emblem"
        size="compact"
        actions={
          <ActionButton
            title="Sign out"
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
                      onPress={() => {
                        void continueActiveGame();
                      }}
                      disabled={isDiscardingUnfinishedGame}
                      style={styles.commandHalfButton}
                    />
                    <ActionButton
                      title="Delete"
                      variant="danger"
                      onPress={confirmDeleteActiveGame}
                      disabled={isDiscardingUnfinishedGame}
                      style={styles.commandHalfButton}
                    />
                  </View>
                </SectionCard>
              ) : null}
                <SectionCard
                  eyebrow="Current Game"
                  title="Players in this game"
                  subtitle={`${selectedPlayersInOrder.length} of 5 seats filled`}
                >
                  {playerAccessNotice ? (
                    <View style={styles.playerAddedNotice}>
                      <Text style={styles.playerAddedNoticeText}>
                        {playerAccessNotice}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.gameRosterList}>
                    {selectedPlayersInOrder.map((player, index) => {
                      const isHost = player.id === signedInPlayerId;
                      return (
                        <Pressable
                          key={player.id}
                          accessibilityRole={isHost ? undefined : "button"}
                          accessibilityLabel={
                            isHost
                              ? `${resolvePlayerDisplayName(player)}, host`
                              : `Remove ${resolvePlayerDisplayName(player)} from game`
                          }
                          disabled={isHost}
                          onPress={() => removePlayerFromGame(player)}
                          style={({ pressed }) => [
                            styles.gameRosterRow,
                            !isHost && styles.gameRosterRowRemovable,
                            pressed && !isHost && styles.gameRosterRowPressed,
                          ]}
                        >
                          <View style={styles.gameRosterNumber}>
                            <Text style={styles.gameRosterNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.gameRosterName}>
                            {resolvePlayerDisplayName(player)}
                          </Text>
                          <Text
                            style={
                              isHost
                                ? styles.gameRosterHost
                                : styles.gameRosterRemove
                            }
                          >
                            {isHost ? "HOST" : "REMOVE"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </SectionCard>

                <SectionCard
                  eyebrow="Mission Prep"
                  title={commandPrepTitle}
                  actions={
                    <ActionButton
                      title="Clear"
                    variant="ghost"
                    onPress={clearSelection}
                    disabled={selectedPlayers.length === 0}
                    style={styles.clearSelectionButton}
                  />
                }
                >
                  <View style={styles.commandPrepStack}>
                    <Animated.View
                      style={[styles.primaryActions, { transform: [{ scale: startPulse }] }]}
                    >
                    <ActionButton
                      title="Start Game"
                      subtitle={startGameSubtitle}
                      onPress={startGame}
                      disabled={!canStart}
                      style={styles.startGameButton}
                    />
                  </Animated.View>
                </View>
              </SectionCard>

              <SectionCard
                title="Add to game"
                subtitle="Every player or guest verifies with their own passcode."
              >
                <View style={styles.addToGameActions}>
                  <ActionButton
                    title="Existing player"
                    variant="secondary"
                    disabled={selectedIds.length >= 5}
                    onPress={() => {
                      setPlayerAccessError(null);
                      setPlayerAccessMode("existing-player");
                    }}
                    style={styles.addToGameButton}
                  />
                  <ActionButton
                    title="Existing guest"
                    variant="secondary"
                    disabled={selectedIds.length >= 5}
                    onPress={() => {
                      setPlayerAccessError(null);
                      setPlayerAccessMode("existing-guest");
                    }}
                    style={styles.addToGameButton}
                  />
                  <ActionButton
                    title="New guest"
                    disabled={selectedIds.length >= 5}
                    onPress={() => {
                      setPlayerAccessError(null);
                      setPlayerAccessMode("new-guest");
                    }}
                    style={styles.addToGameButton}
                  />
                </View>
                {rankedPlayers.length === 0 ? (
                  <EmptyStateCard
                    message="No player profiles found."
                    hint="Create a new guest here or register a player account."
                  />
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
                      Tap to select or remove. Hold to open a profile.
                    </Text>
                    <View style={styles.commandPlayerMetaRow}>
                      <Text style={styles.commandPlayerMetaText}>
                        {hasPlayerSearch
                          ? `${visiblePlayerOptions.length} match${visiblePlayerOptions.length === 1 ? "" : "es"}`
                          : canTogglePlayerPreview
                            ? `Showing ${visiblePlayerOptions.length} of ${filteredPlayers.length}`
                            : `${visiblePlayerOptions.length} available`}
                      </Text>
                      {canTogglePlayerPreview ? (
                        <Pressable
                          onPress={() => setShowAllPlayers((current) => !current)}
                          style={styles.commandPlayerToggleButton}
                        >
                          <Text style={styles.commandPlayerToggleText}>
                            {showAllPlayers ? "Show Less" : "Show All"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={styles.commandPlayerViewport}>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.commandPlayerViewportContent}
                      >
                        {visiblePlayerOptions.length === 0 ? (
                          <EmptyStateCard message="No players match that search." />
                        ) : (
                          <Animated.View
                            style={[
                              styles.playerGridCompact,
                              { transform: [{ scale: removePulse }] },
                            ]}
                          >
                              {visiblePlayerOptions.map((player) => {
                                const selected = selectedIds.includes(player.id);
                                const locked =
                                  !selected && !activeSelectedGroup && selectedIds.length >= 5;
                                const dimmed = Boolean(activeSelectedGroup) && !selected;

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
                  <EmptyStateCard
                    message="No saved groups found."
                    hint="Create a group in the Roster to quickly load your regular crew."
                    actionLabel="Open Roster"
                    onAction={() => router.push(APP_ROUTES.roster)}
                  />
                ) : (
                    <View style={styles.groupListCompact}>
                      {visibleGroups.map((group) => (
                        <GroupSelectionCard
                          key={group.id}
                          group={group}
                          selected={activeSelectedGroup?.id === group.id}
                          onPress={() => {
                            void loadGroup(group);
                          }}
                          playersById={playersById}
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
            {bridgeRows.map((row, rowIndex) => (
              <View key={`hub-row-${rowIndex}`} style={styles.hubGridRow}>
                {row.map((card, columnIndex) => (
                  <HubTileCard
                    key={card.key}
                    title={card.title}
                    description={card.description}
                    emphasis={bridgeDestinations.length > 4 ? "default" : "large"}
                    iconKey={card.iconKey ?? null}
                    layout={card.layout ?? (card.iconKey ? "graphic" : "text")}
                    tint={
                      (rowIndex * 2 + columnIndex) % 2 === 0
                        ? "rgba(96,165,250,0.16)"
                        : "rgba(168,85,247,0.14)"
                    }
                    style={[styles.hubTileBase, styles.hubTile]}
                    onPress={() => openBridgeDestination(card)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Sits under every tab: a bug is worth reporting from wherever the
            player noticed it, not only from one screen. */}
        <View style={styles.bugReportFooter}>
          <ActionButton
            title="Report a bug"
            subtitle="Tell Izzy what went wrong"
            variant="ghost"
            onPress={() => setBugReportOpen(true)}
            accessibilityHint="Opens a form to describe a problem with the app"
          />
        </View>
      </View>

      <BugReportModal
        appVersion={getAppVersion()}
        onClose={() => setBugReportOpen(false)}
        platform={Platform.OS}
        profileId={reporterProfileId}
        reporterName={reporterName}
        visible={bugReportOpen}
      />
      <PlayerAccessModal
        mode={playerAccessMode}
        candidates={
          playerAccessMode === "existing-guest"
            ? existingGuestOptions
            : existingPlayerOptions
        }
        pendingPlayer={pendingAccessPlayer}
        busy={playerAccessBusy}
        error={playerAccessError}
        onClose={closePlayerAccess}
        onSelectExisting={(player) => openPlayerVerification(player)}
        onCreateGuest={(input) => {
          void handleCreateGuest(input);
        }}
        onVerify={(passcode) => {
          void handleVerifyPlayer(passcode);
        }}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  addToGameActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addToGameButton: {
    flexGrow: 1,
    minWidth: 130,
  },
  playerAddedNotice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.38)",
    backgroundColor: "rgba(16,185,129,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playerAddedNoticeText: {
    color: "#A7F3D0",
    fontSize: 13,
    fontWeight: "900",
  },
  gameRosterList: {
    gap: 8,
  },
  gameRosterRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gameRosterRowRemovable: {
    borderColor: "rgba(248,113,113,0.18)",
  },
  gameRosterRowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  gameRosterNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(96,165,250,0.18)",
  },
  gameRosterNumberText: {
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "900",
  },
  gameRosterName: {
    flex: 1,
    color: "#F8FBFF",
    fontSize: 15,
    fontWeight: "900",
  },
  gameRosterHost: {
    color: "#67E8F9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  gameRosterRemove: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  homeShellContent: {
    flex: 1,
  },
  headerAction: {
    alignSelf: "center",
    minWidth: 0,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    opacity: 0.8,
  },
  homeTabControl: {
    marginTop: 2,
    alignSelf: "center",
  },
  homeTabContent: {
    flex: 1,
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
  commandPrepStack: {
    gap: 12,
  },
  commandPlayerHint: {
    color: "#7D9BC4",
    fontSize: 11,
    fontWeight: "600",
  },
  commandPlayerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  commandPlayerMetaText: {
    flex: 1,
    color: "#A9C1E7",
    fontSize: 11,
    fontWeight: "700",
  },
  commandPlayerToggleButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(96,165,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.24)",
  },
  commandPlayerToggleText: {
    color: "#BFE4FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  commandPlayerViewport: {
    height: 198,
    overflow: "hidden",
  },
  commandHalfButton: {
    flex: 1,
  },
  primaryActions: {
    marginBottom: 0,
  },
  startGameButton: {
    width: "100%",
    minHeight: 56,
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
    minWidth: 82,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leaderboardPanel: {
    flex: 1,
    minHeight: 0,
  },
  bugReportFooter: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  hubsPanel: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 10,
  },
  hubGridRow: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  hubTileBase: {
    minHeight: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  hubTile: {
    flex: 1,
    flexBasis: "auto",
  },
});
