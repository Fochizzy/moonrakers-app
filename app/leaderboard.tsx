import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";

import { useStore } from "@/store/useStore";
import StarryNight from "@/components/ui/StarryNight";
import Text from "@/components/ui/Text";
import { APP_ICONS } from "@/utils/iconAccess";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";

type Tab = "game" | "leaderboard" | "nav";

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
};

type GroupLike = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt?: number;
  objectiveStatsEligible?: boolean;
  inferredUseCount?: number;
  inferredRecentAt?: number;
};

type GameLike = {
  id?: string;
  groupId?: string;
  groupName?: string;
  createdAt?: number;
  players?: Array<{ id?: string; playerId?: string; name?: string }>;
};

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value: any): string {
  return String(value ?? "").trim();
}

function normalizeName(value: any): string {
  return String(value ?? "").trim();
}

function getInitials(name?: string, fallback?: string) {
  const raw = String(name ?? fallback ?? "").trim();
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getPlayerAccent(color?: string) {
  switch ((color ?? "").toLowerCase()) {
    case "blue":
      return "#60A5FA";
    case "green":
      return "#84CC16";
    case "purple":
      return "#C084FC";
    case "orange":
      return "#FB923C";
    case "yellow":
      return "#FACC15";
    case "red":
      return "#F87171";
    case "pink":
      return "#F472B6";
    default:
      return "#60A5FA";
  }
}

function normalizePlayer(raw: any, index: number): PlayerLike | null {
  if (!raw) return null;

  const id =
    normalizeId(raw.id) ||
    normalizeId(raw.playerId) ||
    normalizeId(raw.uuid) ||
    `player-${index}`;

  const name =
    normalizeName(raw.name) ||
    normalizeName(raw.playerName) ||
    normalizeName(raw.displayName) ||
    normalizeName(raw.label) ||
    `Player ${index + 1}`;

  return {
    ...raw,
    id,
    name,
    color: normalizeName(raw.color) || undefined,
    initials:
      normalizeName(raw.initials) || getInitials(name, `P${index + 1}`),
    assignedCardArtIndex:
      typeof raw.assignedCardArtIndex === "number" &&
      Number.isFinite(raw.assignedCardArtIndex)
        ? raw.assignedCardArtIndex
        : null,
  };
}

function normalizeGroup(raw: any, index: number): GroupLike | null {
  if (!raw) return null;

  const id =
    normalizeId(raw.id) ||
    normalizeId(raw.groupId) ||
    normalizeId(raw.uuid) ||
    `group-${index}`;

  const name =
    normalizeName(raw.name) ||
    normalizeName(raw.groupName) ||
    normalizeName(raw.label) ||
    normalizeName(raw.title) ||
    `Group ${index + 1}`;

  const playerIdsRaw =
    raw.playerIds ??
    raw.players ??
    raw.memberIds ??
    raw.members ??
    raw.roster ??
    [];

  const playerIds = asArray(playerIdsRaw)
    .map((item: any) =>
      typeof item === "string"
        ? normalizeId(item)
        : normalizeId(item?.id ?? item?.playerId ?? item?.uuid)
    )
    .filter(Boolean);

  return {
    ...raw,
    id,
    name,
    playerIds,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : undefined,
    objectiveStatsEligible:
      typeof raw.objectiveStatsEligible === "boolean"
        ? raw.objectiveStatsEligible
        : undefined,
  };
}

function normalizeGame(raw: any): GameLike | null {
  if (!raw || typeof raw !== "object") return null;

  const players = asArray(raw.players).map((p: any) => ({
    id: normalizeId(p?.id),
    playerId: normalizeId(p?.playerId),
    name: normalizeName(p?.name),
  }));

  return {
    id: normalizeId(raw.id) || undefined,
    groupId: normalizeId(raw.groupId) || undefined,
    groupName: normalizeName(raw.groupName) || undefined,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : undefined,
    players,
  };
}

function getGamePlayerIds(game: GameLike): string[] {
  return asArray(game.players)
    .map((p) => normalizeId(p.id ?? p.playerId))
    .filter(Boolean);
}

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((id, index) => id === bSorted[index]);
}

function tabLabel(tab: Tab) {
  switch (tab) {
    case "game":
      return "Command";
    case "leaderboard":
      return "Data Center";
    case "nav":
      return "Bridge";
    default:
      return tab;
  }
}

function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandMoon} />
      <Text style={styles.brandText}>Moonrakers</Text>
    </View>
  );
}

function SelectionShimmer({
  visible,
  borderRadius = 16,
}: {
  visible: boolean;
  borderRadius?: number;
}) {
  const translate = useRef(new Animated.Value(-220)).current;

  useEffect(() => {
    if (!visible) {
      translate.setValue(-220);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 220,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [translate, visible]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.shimmerWrap,
        { borderRadius },
      ]}
    >
      <View style={[styles.shimmerGlow, { borderRadius }]} />
      <Animated.View
        style={[
          styles.shimmerSweep,
          {
            transform: [{ translateX: translate }, { rotate: "18deg" }],
          },
        ]}
      />
    </View>
  );
}

function PlayerSelectionCard({
  player,
  selected,
  dimmed,
  locked,
  onPress,
  onLongPress,
}: {
  player: PlayerLike;
  selected: boolean;
  dimmed: boolean;
  locked: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const accent = getPlayerAccent(player.color);

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      onLongPress={locked ? undefined : onLongPress}
      delayLongPress={250}
      style={[
        styles.playerListItemCompact,
        { borderColor: "rgba(255,255,255,0.08)" },
        selected && [
          styles.playerListItemCompactSelected,
          {
            borderColor: `${accent}EE`,
            shadowColor: accent,
            backgroundColor: `${accent}14`,
          },
        ],
        dimmed && styles.playerListItemDimmed,
        locked && styles.playerListItemLocked,
      ]}
    >
      <SelectionShimmer visible={selected} borderRadius={14} />

      <View style={styles.playerCompactInner}>
        <PlayerCardIcon
          player={player as any}
          size={38}
          borderRadius={9}
          dimAmount={selected ? 0.03 : 0.08}
        />
        <Text
          style={[
            styles.playerCompactName,
            selected && { color: accent },
            locked && styles.lockedText,
          ]}
          numberOfLines={1}
        >
          {player.name ?? "Unknown"}
        </Text>
      </View>

      {locked ? (
        <View style={styles.lockBadge}>
          <Text style={styles.lockBadgeText}>FULL</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function GroupSelectionCard({
  group,
  selected,
  onPress,
  playersById,
}: {
  group: GroupLike;
  selected: boolean;
  onPress: () => void;
  playersById: Record<string, PlayerLike>;
}) {
  const visiblePlayers = group.playerIds
    .map((id) => playersById[id])
    .filter(Boolean)
    .slice(0, 5);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.groupCardCompact, selected && styles.groupCardCompactActive]}
    >
      <SelectionShimmer visible={selected} borderRadius={14} />

      <Text style={styles.groupLabel}>GROUP</Text>
      <Text style={styles.groupCompactName} numberOfLines={1}>
        {group.name}
      </Text>

      <View style={styles.groupPlayersRow}>
        {visiblePlayers.map((player) => (
          <View key={player.id} style={styles.groupMiniPlayer}>
            <PlayerCardIcon
              player={player as any}
              size={23}
              borderRadius={6}
              dimAmount={0.08}
            />
            <Text style={styles.groupMiniName} numberOfLines={1}>
              {player.initials || getInitials(player.name)}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function SelectedNamePill({
  name,
  color,
}: {
  name: string;
  color?: string;
}) {
  const accent = getPlayerAccent(color);
  return (
    <View
      style={[
        styles.selectedNamePill,
        {
          borderColor: `${accent}55`,
          backgroundColor: `${accent}12`,
        },
      ]}
    >
      <Text style={[styles.selectedNamePillText, { color: "#EAF2FF" }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const rawPlayers = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  );
  const rawGroups = useStore((s: any) =>
    Array.isArray(s.groups) ? s.groups : []
  );
  const rawGames = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  );
  const activeGame = useStore((s: any) => s.activeGame);
  const clearActiveGame = useStore((s: any) => s.clearActiveGame);

  const [tab, setTab] = useState<Tab>("game");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupLike | null>(null);

  const startPulse = useRef(new Animated.Value(1)).current;
  const removePulse = useRef(new Animated.Value(1)).current;
  const prevCanStart = useRef(false);

  const players = useMemo(
    () =>
      rawPlayers
        .map((player: any, index: number) => normalizePlayer(player, index))
        .filter(
          (player: PlayerLike | null): player is PlayerLike => Boolean(player)
        ),
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

  const playersById = useMemo(() => {
    return players.reduce<Record<string, PlayerLike>>((acc, player) => {
      acc[player.id] = player;
      return acc;
    }, {});
  }, [players]);

  const usage = useMemo(() => {
    const playerGameCount: Record<string, number> = {};
    const playerRecentAt: Record<string, number> = {};
    const groupUseCount: Record<string, number> = {};
    const groupRecentAt: Record<string, number> = {};
    const comboUseCount: Record<string, number> = {};
    const comboRecentAt: Record<string, number> = {};

    for (const game of games) {
      const createdAt = game.createdAt ?? 0;
      const gamePlayerIds = Array.from(new Set(getGamePlayerIds(game)));
      const comboKey = [...gamePlayerIds].sort().join("|");

      for (const playerId of gamePlayerIds) {
        playerGameCount[playerId] = (playerGameCount[playerId] ?? 0) + 1;
        playerRecentAt[playerId] = Math.max(
          playerRecentAt[playerId] ?? 0,
          createdAt
        );
      }

      if (game.groupId) {
        groupUseCount[game.groupId] = (groupUseCount[game.groupId] ?? 0) + 1;
        groupRecentAt[game.groupId] = Math.max(
          groupRecentAt[game.groupId] ?? 0,
          createdAt
        );
      }

      if (comboKey) {
        comboUseCount[comboKey] = (comboUseCount[comboKey] ?? 0) + 1;
        comboRecentAt[comboKey] = Math.max(
          comboRecentAt[comboKey] ?? 0,
          createdAt
        );
      }
    }

    return {
      playerGameCount,
      playerRecentAt,
      groupUseCount,
      groupRecentAt,
      comboUseCount,
      comboRecentAt,
    };
  }, [games]);

  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aCount = usage.playerGameCount[a.id] ?? 0;
      const bCount = usage.playerGameCount[b.id] ?? 0;
      if (bCount !== aCount) return bCount - aCount;

      const aRecent = usage.playerRecentAt[a.id] ?? 0;
      const bRecent = usage.playerRecentAt[b.id] ?? 0;
      if (bRecent !== aRecent) return bRecent - aRecent;

      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
  }, [players, usage]);

  const rankedGroups = useMemo(() => {
    return [...groups]
      .map((group) => {
        const directUseCount = usage.groupUseCount[group.id] ?? 0;
        const directRecentAt = usage.groupRecentAt[group.id] ?? 0;

        const comboKey = [...group.playerIds].sort().join("|");
        const comboUseCount = usage.comboUseCount[comboKey] ?? 0;
        const comboRecentAt = usage.comboRecentAt[comboKey] ?? 0;

        return {
          ...group,
          inferredUseCount: Math.max(directUseCount, comboUseCount),
          inferredRecentAt: Math.max(directRecentAt, comboRecentAt),
        };
      })
      .sort((a, b) => {
        if ((b.inferredUseCount ?? 0) !== (a.inferredUseCount ?? 0)) {
          return (b.inferredUseCount ?? 0) - (a.inferredUseCount ?? 0);
        }

        if ((b.inferredRecentAt ?? 0) !== (a.inferredRecentAt ?? 0)) {
          return (b.inferredRecentAt ?? 0) - (a.inferredRecentAt ?? 0);
        }

        return a.name.localeCompare(b.name);
      });
  }, [groups, usage]);

  const detectedGroup = useMemo(() => {
    if (selectedIds.length < 2 || selectedGroup) return null;

    const exactGroup =
      rankedGroups.find((group) => sameIdSet(group.playerIds, selectedIds)) ??
      null;

    if (exactGroup) return exactGroup;

    const comboKey = [...selectedIds].sort().join("|");
    const comboCount = usage.comboUseCount[comboKey] ?? 0;

    if (comboCount <= 0) return null;

    return {
      id: "",
      name: "Most-used combo",
      playerIds: [...selectedIds].sort(),
      inferredUseCount: comboCount,
      inferredRecentAt: usage.comboRecentAt[comboKey] ?? 0,
    } as GroupLike;
  }, [rankedGroups, selectedIds, usage, selectedGroup]);

  const selectedPlayers = useMemo(
    () => rankedPlayers.filter((player) => selectedIds.includes(player.id)),
    [rankedPlayers, selectedIds]
  );

  const canStart = selectedPlayers.length >= 2 && selectedPlayers.length <= 5;

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

  const triggerRemovePulse = () => {
    removePulse.setValue(1);
    Animated.sequence([
      Animated.timing(removePulse, {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(removePulse, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const togglePlayer = (id: string) => {
    setSelectedGroup(null);
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        triggerRemovePulse();
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const loadGroup = (group: GroupLike) => {
    setSelectedGroup(group);
    setSelectedIds(group.playerIds.slice(0, 5));
  };

  const clearSelection = () => {
    setSelectedGroup(null);
    setSelectedIds([]);
    triggerRemovePulse();
  };

  const openPlayerProfile = (player: PlayerLike) => {
    if (!player?.id) return;

    router.push({
      pathname: "/player-profile",
      params: { playerId: player.id },
    });
  };

  const openFullProfileFromNav = () => {
    const selectedPlayer = selectedPlayers[0] || rankedPlayers[0];
    if (!selectedPlayer?.id) return;

    router.push({
      pathname: "/player-profile",
      params: { playerId: selectedPlayer.id },
    });
  };

  const startGame = () => {
    if (!canStart) return;

    const effectiveGroup = selectedGroup;
    const selectedPlayerNamesOnly = rankedPlayers
      .filter((player) => selectedIds.includes(player.id))
      .map((player) => ({
        id: player.id,
        name: player.name ?? "Unknown",
      }));

    router.push({
      pathname: "/game-setup",
      params: {
        mode: effectiveGroup ? "group" : "players",
        selectedPlayers: JSON.stringify(
          effectiveGroup ? [] : selectedPlayerNamesOnly
        ),
        selectedGroups: JSON.stringify(
          effectiveGroup
            ? [
                {
                  id: effectiveGroup.id,
                  name: effectiveGroup.name,
                  playerIds: effectiveGroup.playerIds,
                },
              ]
            : []
        ),
        players: JSON.stringify(
          rankedPlayers.map((player) => ({
            id: player.id,
            name: player.name ?? "Unknown",
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <StarryNight count={100} />
        <View style={styles.homeBackgroundDim} />
      </View>

      <BrandHeader />

      <View style={styles.tabs}>
        {(["game", "leaderboard", "nav"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {tabLabel(t)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "game" && (
        <View style={styles.gameTabWrap}>
          <ScrollView
            contentContainerStyle={styles.gameScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeGame ? (
              <View style={styles.activeCard}>
                <Text style={styles.sectionTitle}>Active Game</Text>
                <Text style={styles.activeSub}>
                  Continue your current match or delete it to start fresh.
                </Text>

                <View style={styles.row}>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => router.push("/game")}
                  >
                    <Text style={styles.primaryText}>Continue</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dangerBtn}
                    onPress={() => {
                      clearActiveGame();
                    }}
                  >
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: startPulse }] }}>
              <Pressable
                onPress={startGame}
                disabled={!canStart}
                style={[styles.startBtnTop, canStart && styles.startActive]}
              >
                <Text
                  style={[styles.startText, canStart && styles.startTextActive]}
                >
                  Start Game
                </Text>
              </Pressable>
            </Animated.View>

            {detectedGroup?.name ? (
              <Text style={styles.detectedGroupText}>
                {selectedGroup?.name
                  ? `Selected group: ${selectedGroup.name}`
                  : detectedGroup.id
                    ? `Detected group: ${detectedGroup.name}`
                    : `${detectedGroup.name} • ${(detectedGroup.inferredUseCount ?? 0).toString()} uses`}
              </Text>
            ) : null}

            <View style={styles.setupColumnsCompact}>
              <View style={styles.setupColumn}>
                <View style={styles.columnHeaderCompact}>
                  <Text style={styles.sectionTitleSmall}>Players</Text>
                  <Text style={styles.columnCount}>{rankedPlayers.length}</Text>
                </View>

                {rankedPlayers.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyPanelText}>
                      No player profiles found.
                    </Text>
                  </View>
                ) : (
                  <Animated.View
                    style={[
                      styles.playerGridCompact,
                      { transform: [{ scale: removePulse }] },
                    ]}
                  >
                    {rankedPlayers.map((player) => {
                      const selected =
                        !selectedGroup && selectedIds.includes(player.id);
                      const locked =
                        !selected &&
                        !selectedGroup &&
                        selectedIds.length >= 5;
                      const dimmed = Boolean(selectedGroup) && !selected;

                      return (
                        <PlayerSelectionCard
                          key={player.id}
                          player={player}
                          selected={selected}
                          dimmed={dimmed}
                          locked={locked}
                          onPress={() => togglePlayer(player.id)}
                          onLongPress={() => openPlayerProfile(player)}
                        />
                      );
                    })}
                  </Animated.View>
                )}
              </View>

              <View style={styles.setupColumn}>
                <View style={styles.columnHeaderCompact}>
                  <Text style={styles.sectionTitleSmall}>Groups</Text>
                  <Text style={styles.columnCount}>{rankedGroups.length}</Text>
                </View>

                {rankedGroups.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyPanelText}>
                      No saved groups found.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.groupListCompact}>
                    {rankedGroups.map((group) => {
                      const isActive = selectedGroup?.id === group.id;

                      return (
                        <GroupSelectionCard
                          key={group.id}
                          group={group}
                          selected={isActive}
                          onPress={() => loadGroup(group)}
                          playersById={playersById}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.dockDividerGlow} />

          <View style={styles.bottomSetupDock}>
            <View style={styles.bottomSetupLeft}>
              {selectedPlayers.length === 0 ? (
                <Text style={styles.previewEmptyCompact}>No players selected</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedNamesRow}
                >
                  {selectedPlayers.map((player) => (
                    <SelectedNamePill
                      key={player.id}
                      name={player.name ?? "Unknown"}
                      color={player.color}
                    />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.bottomSetupRight}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{selectedPlayers.length}/5</Text>
              </View>
              <Pressable onPress={clearSelection} style={styles.clearBtnTop}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {tab === "leaderboard" && (
        <View style={styles.leaderboardTabWrap}>
          <LeaderboardContent />
        </View>
      )}

      {tab === "nav" && (
        <View style={styles.navScreen}>
          <View style={styles.navGridFull}>
            {[
              ["compare", "/charts/compare"],
              ["history", "/history"],
              ["charts", "/charts"],
              ["statistics", "/stats"],
              ["elo", "/elo"],
              ["definitions", "/definitions"],
              ["addRemoves", "/add-players"],
              ["fullProfile", "PROFILE"],
            ].map(([key, route], index) => (
              <Pressable
                key={key}
                onPress={() => {
                  if (route === "PROFILE") {
                    openFullProfileFromNav();
                  } else {
                    router.push(route as any);
                  }
                }}
                style={styles.navCardFull}
              >
                <View
                  style={[
                    styles.navTileTint,
                    index % 2 === 0 ? styles.navTileBlue : styles.navTilePurple,
                  ]}
                />
                <Image
                  source={APP_ICONS[key as keyof typeof APP_ICONS]}
                  style={styles.navIconLarge}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },

  homeBackgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,6,18,0.16)",
  },

  brandHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMoon: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#60A5FA",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  brandText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#A855F7",
    letterSpacing: 0.3,
  },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(96,165,250,0.08)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.22)",
  },
  tabActive: {
    backgroundColor: "rgba(168,85,247,0.22)",
    borderColor: "rgba(96,165,250,0.5)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tabText: {
    color: "#9CCBFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tabTextActive: {
    color: "#EAD9FF",
  },

  gameTabWrap: {
    flex: 1,
  },
  gameScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 92,
    gap: 10,
  },

  activeCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(9,14,28,0.88)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.14)",
  },
  activeSub: {
    color: "#93C5FD",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.18)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.35)",
  },
  dangerBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  primaryText: {
    color: "#EAF2FF",
    fontSize: 14,
    fontWeight: "900",
  },
  dangerText: {
    color: "#FCA5A5",
    fontSize: 14,
    fontWeight: "900",
  },

  startBtnTop: {
    minHeight: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.18)",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.14)",
  },
  startActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(96,165,250,0.92)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  startText: {
    color: "#D8B4FE",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  startTextActive: {
    color: "#7C3AED",
  },

  detectedGroupText: {
    marginTop: 2,
    paddingHorizontal: 2,
    color: "#60A5FA",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  setupColumnsCompact: {
    flexDirection: "row",
    gap: 10,
  },
  setupColumn: {
    flex: 1,
    gap: 8,
  },
  columnHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  columnCount: {
    minWidth: 24,
    textAlign: "center",
    color: "#C4B5FD",
    fontSize: 11,
    fontWeight: "900",
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(168,85,247,0.16)",
  },
  sectionTitleSmall: {
    color: "#B9D8FF",
    fontSize: 15,
    fontWeight: "900",
  },

  emptyPanel: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.12)",
  },
  emptyPanelText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },

  playerGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  playerListItemCompact: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "rgba(9,14,28,0.92)",
    borderWidth: 1.25,
    overflow: "hidden",
    minHeight: 78,
  },
  playerListItemCompactSelected: {
    shadowOpacity: 0.46,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  playerListItemDimmed: {
    opacity: 0.42,
  },
  playerListItemLocked: {
    opacity: 0.36,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  playerCompactInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  playerCompactName: {
    color: "#EAF2FF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  },
  lockedText: {
    color: "#94A3B8",
  },
  lockBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(15,23,42,0.88)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
  },
  lockBadgeText: {
    color: "#94A3B8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  groupListCompact: {
    gap: 8,
  },
  groupCardCompact: {
    borderRadius: 14,
    padding: 8,
    backgroundColor: "rgba(5,9,20,0.98)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.1)",
    overflow: "hidden",
  },
  groupCardCompactActive: {
    borderColor: "rgba(96,165,250,0.78)",
    backgroundColor: "rgba(96,165,250,0.08)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  groupLabel: {
    color: "#A855F7",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  groupCompactName: {
    color: "#E9D5FF",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
  },
  groupPlayersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 2,
  },
  groupMiniPlayer: {
    flex: 1,
    alignItems: "center",
  },
  groupMiniName: {
    marginTop: 2,
    color: "#B9D8FF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },

  dockDividerGlow: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 68,
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(96,165,250,0.55)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  bottomSetupDock: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 8,
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(6,10,22,0.97)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.16)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bottomSetupLeft: {
    flex: 1,
    minWidth: 0,
  },
  bottomSetupRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(168,85,247,0.16)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
  },
  countBadgeText: {
    color: "#E9D5FF",
    fontSize: 10,
    fontWeight: "900",
  },
  clearBtnTop: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.16)",
  },
  clearBtnText: {
    color: "#B9D8FF",
    fontSize: 11,
    fontWeight: "900",
  },
  previewEmptyCompact: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "700",
  },
  selectedNamesRow: {
    gap: 6,
    paddingRight: 2,
    alignItems: "center",
  },
  selectedNamePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  selectedNamePillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  shimmerWrap: {
    overflow: "hidden",
  },
  shimmerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  shimmerSweep: {
    position: "absolute",
    top: -30,
    bottom: -30,
    width: 72,
    backgroundColor: "rgba(255,255,255,0.1)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },

  leaderboardTabWrap: {
    flex: 1,
  },

  navScreen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  navGridFull: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "stretch",
  },
  navCardFull: {
    width: "50%",
    height: "25%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    margin: 0,
    padding: 0,
    position: "relative",
    overflow: "hidden",
  },
  navTileTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0.5,
    borderColor: "rgba(168,85,247,0.14)",
  },
  navTileBlue: {
    backgroundColor: "rgba(96,165,250,0.06)",
  },
  navTilePurple: {
    backgroundColor: "rgba(168,85,247,0.06)",
  },
  navIconLarge: {
    width: 132,
    height: 132,
    resizeMode: "contain",
    tintColor: undefined,
  },

  sectionTitle: {
    color: "#E9D5FF",
    fontSize: 18,
    fontWeight: "900",
  },
});
