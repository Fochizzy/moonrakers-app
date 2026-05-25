import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import HubTileCard from "@/components/ui/HubTileCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { resolveHomeRedirect } from "@/lib/auth/launchRoute";
import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import Text from "@/components/ui/Text";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import RankBadge from "@/components/RankBadge";
import { getBridgeDestinations, type HubCard } from "@/utils/appHubs";
import {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildHistoryRoute,
  buildPlayerProfileRoute,
  normalizeHomeTab,
} from "@/utils/appRoutes";
import { calculateElo } from "@/utils/elo";
import {
  ensureRequiredPlayerSelection,
  filterGroupsForSignedInPlayer,
} from "@/utils/homeCommandSelection";
import { buildCloudPlayableCommandDirectory } from "@/utils/registeredProfilePlayer";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type Tab = "game" | "leaderboard" | "hubs";

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  wins?: number;
  gamesPlayed?: number;
  score?: number;
  totalPrestige?: number;
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

type PlayerTotals = {
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type GamePlayer = {
  id?: string;
  playerId?: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
};

type GameLike = {
  id?: string;
  groupId?: string;
  groupName?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, PlayerTotals>;
  players?: GamePlayer[];
};

type SortMetric =
  | "elo"
  | "wins"
  | "games"
  | "score"
  | "prestige"
  | "efficiency"
  | "avgPrestige";

type EnrichedPlayer = {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  elo: number;
  wins: number;
  gamesPlayed: number;
  score: number;
  prestige: number;
  efficiency: number;
  avgPrestige: number;
};

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown): string {
  return String(value ?? "").trim();
}

function getInitials(name?: string, fallback?: string) {
  const raw = String(name ?? fallback ?? "").trim();
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
    color: normalizeName(p?.color) || undefined,
    initials: normalizeName(p?.initials) || undefined,
    assignedCardArtIndex:
      typeof p?.assignedCardArtIndex === "number" ? p.assignedCardArtIndex : null,
    score: n(p?.score),
    prestige: n(p?.prestige),
    totalPrestige: n(p?.totalPrestige),
    directPrestige: n(p?.directPrestige),
    assistPrestigeReceived: n(p?.assistPrestigeReceived),
  }));

  return {
    id: normalizeId(raw.id) || undefined,
    groupId: normalizeId(raw.groupId) || undefined,
    groupName: normalizeName(raw.groupName) || undefined,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : undefined,
    winnerId: normalizeId(raw.winnerId) || undefined,
    selectedWinnerId: normalizeId(raw.selectedWinnerId) || undefined,
    manualWinnerId: normalizeId(raw.manualWinnerId) || undefined,
    totals: raw.totals,
    players,
  };
}

function getGamePlayerIds(game: GameLike): string[] {
  return asArray(game.players)
    .map((p) => normalizeId(p.id ?? p.playerId))
    .filter(Boolean);
}

function getWinnerId(game: GameLike): string {
  return normalizeId(game.manualWinnerId ?? game.selectedWinnerId ?? game.winnerId);
}

function getTotalPrestigeFromTotals(totals?: PlayerTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (Number.isFinite(Number(explicit))) return n(explicit);

  return (
    n(totals?.directPrestige) +
    n(totals?.assistPrestigeReceived) +
    n(totals?.objectivePrestige)
  );
}

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((id, index) => id === bSorted[index]);
}

function sameOrderedIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function sortLabel(metric: SortMetric) {
  switch (metric) {
    case "elo":
      return "ELO";
    case "wins":
      return "Wins";
    case "games":
      return "Games";
    case "score":
      return "Score";
    case "prestige":
      return "Prestige";
    case "efficiency":
      return "Eff";
    case "avgPrestige":
      return "Avg";
    default:
      return metric;
  }
}

function tabLabel(tab: Tab) {
  switch (tab) {
    case "game":
      return "Command";
    case "leaderboard":
      return "Data Center";
    case "hubs":
      return "Hubs";
    default:
      return tab;
  }
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
    return () => loop.stop();
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
  const accent = getPlayerAccentColor(player.color);

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      onLongPress={locked ? undefined : onLongPress}
      delayLongPress={250}
      style={({ pressed }) => [
        styles.playerListItemCompact,
        { borderColor: `${accent}88` },
        selected && [
          styles.playerListItemCompactSelected,
          {
            borderColor: accent,
            shadowColor: accent,
            backgroundColor: `${accent}14`,
            transform: [{ scale: 1.04 }],
          },
        ],
        dimmed && styles.playerListItemDimmed,
        locked && styles.playerListItemLocked,
        pressed && !locked && styles.pressScaleSm,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: accent,
        }}
      />
      <SelectionShimmer visible={selected} borderRadius={10} />

      <View style={styles.playerCompactInner}>
        <View style={styles.playerCompactCopy}>
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

        <PlayerCardIcon
          player={player as any}
          size={58}
          borderRadius={12}
          showInitial={false}
        />
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
      style={({ pressed }) => [
        styles.groupCardCompact,
        selected && styles.groupCardCompactActive,
        pressed && styles.pressScaleSm,
      ]}
    >
      <SelectionShimmer visible={selected} borderRadius={10} />

      <View style={styles.groupRowUltraCompact}>
        <Text style={styles.groupNameUltraCompact} numberOfLines={1}>
          {group.name}
        </Text>

        <View style={styles.groupInitialsRow}>
          <Text
            style={styles.groupInitialsText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {visiblePlayers
              .map((p) => p.initials || getInitials(p.name))
              .join(" ")}
          </Text>
        </View>
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
  const accent = getPlayerAccentColor(color);
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
      <Text style={styles.selectedNamePillText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function AnimatedSelectedNamePill({
  name,
  color,
}: {
  name: string;
  color?: string;
}) {
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 14,
        stiffness: 180,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 13,
        stiffness: 210,
        mass: 0.75,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <SelectedNamePill name={name} color={color} />
    </Animated.View>
  );
}

function HomeLeaderboardTab({
  players,
  games,
}: {
  players: PlayerLike[];
  games: GameLike[];
}) {
  const [sortBy, setSortBy] = useState<SortMetric>("elo");

  const eloMap = useMemo(() => {
    try {
      return calculateElo(games as any) ?? {};
    } catch {
      return {};
    }
  }, [games]);

  const sorted = useMemo<EnrichedPlayer[]>(() => {
    const playerMap = new Map<
      string,
      Omit<EnrichedPlayer, "efficiency" | "avgPrestige">
    >();

    const ensurePlayer = (id: string, fallback?: Partial<PlayerLike>) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) return null;

      const existing = playerMap.get(normalizedId);
      if (existing) {
        if (
          (!existing.name ||
            normalizeName(existing.name).toLowerCase() === "recovered player") &&
          fallback?.name
        ) {
          existing.name = fallback.name;
        }
        if (!existing.color && fallback?.color) existing.color = fallback.color;
        if (!existing.initials && fallback?.initials) existing.initials = fallback.initials;
        if (
          typeof existing.assignedCardArtIndex !== "number" &&
          typeof fallback?.assignedCardArtIndex === "number"
        ) {
          existing.assignedCardArtIndex = fallback.assignedCardArtIndex;
        }
        return existing;
      }

      const fallbackName = normalizeName(fallback?.name);
      if (!fallbackName) return null;

      const created = {
        id: normalizedId,
        name: fallbackName,
        color: fallback?.color,
        initials: fallback?.initials,
        assignedCardArtIndex:
          typeof fallback?.assignedCardArtIndex === "number"
            ? fallback.assignedCardArtIndex
            : null,
        elo: n((eloMap as any)[normalizedId]) || 1000,
        wins: 0,
        gamesPlayed: 0,
        score: 0,
        prestige: 0,
      };

      playerMap.set(normalizedId, created);
      return created;
    };

    for (const player of players) {
      ensurePlayer(player.id, player);
    }

    for (const game of games) {
      const winnerId = getWinnerId(game);
      const gamePlayerIds = new Set<string>();
      const gamePlayers = Array.isArray(game.players) ? game.players : [];

      for (const gp of gamePlayers) {
        const playerId = normalizeId(gp.id ?? gp.playerId);
        if (!playerId) continue;
        gamePlayerIds.add(playerId);

        const entry = ensurePlayer(playerId, {
          name: gp.name,
          color: gp.color,
          initials: gp.initials,
          assignedCardArtIndex: gp.assignedCardArtIndex ?? null,
        });

        if (!entry) continue;

        const totals = game.totals?.[playerId];
        const fallbackPrestige =
          Number.isFinite(Number(gp.totalPrestige))
            ? n(gp.totalPrestige)
            : Number.isFinite(Number(gp.prestige))
              ? n(gp.prestige)
              : 0;

        entry.score += n(totals?.score) || n(gp.score);
        entry.prestige += getTotalPrestigeFromTotals(totals) || fallbackPrestige;
      }

      const totalsEntries = Object.entries(game.totals ?? {});
      for (const [rawId, totals] of totalsEntries) {
        const playerId = normalizeId(rawId);
        if (!playerId) continue;

        if (!gamePlayerIds.has(playerId)) {
          continue;
        }

        const entry = ensurePlayer(playerId);
        if (!entry) continue;

        entry.score += n(totals?.score);
        entry.prestige += getTotalPrestigeFromTotals(totals);
      }

      for (const playerId of gamePlayerIds) {
        const entry = ensurePlayer(playerId);
        if (!entry) continue;
        entry.gamesPlayed += 1;
        if (winnerId && winnerId === playerId) {
          entry.wins += 1;
        }
      }
    }

    return Array.from(playerMap.values())
      .filter((player) => !!normalizeId(player.id))
      .map((player) => {
        const efficiency =
          player.gamesPlayed > 0 ? player.wins / player.gamesPlayed : 0;
        const avgPrestige =
          player.gamesPlayed > 0 ? player.prestige / player.gamesPlayed : 0;

        return {
          ...player,
          efficiency,
          avgPrestige,
        };
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "wins":
            if (b.wins !== a.wins) return b.wins - a.wins;
            break;
          case "games":
            if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
            break;
          case "score":
            if (b.score !== a.score) return b.score - a.score;
            break;
          case "prestige":
            if (b.prestige !== a.prestige) return b.prestige - a.prestige;
            break;
          case "efficiency":
            if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
            break;
          case "avgPrestige":
            if (b.avgPrestige !== a.avgPrestige) return b.avgPrestige - a.avgPrestige;
            break;
          case "elo":
          default:
            if (b.elo !== a.elo) return b.elo - a.elo;
            break;
        }
        return a.name.localeCompare(b.name);
      });
  }, [players, games, eloMap, sortBy]);

  return (
    <View style={styles.inlineLeaderboardRoot}>
      <ScrollView
        contentContainerStyle={styles.inlineLeaderboardContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toggleRow}>
          {(
            [
              "elo",
              "wins",
              "games",
              "score",
              "prestige",
              "efficiency",
              "avgPrestige",
            ] as SortMetric[]
          ).map((metric) => {
            const active = sortBy === metric;
            return (
              <Pressable
                key={metric}
                onPress={() => setSortBy(metric)}
                style={({ pressed }) => [
                  styles.toggle,
                  pressed && styles.pressScaleSm,
                ]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {sortLabel(metric)}
                </Text>
                <View style={[styles.toggleLine, active && styles.toggleLineActive]} />
              </Pressable>
            );
          })}
        </View>

        {sorted.length === 0 ? (
          <View style={styles.lbCard}>
            <Text style={styles.emptyText}>No leaderboard data available yet.</Text>
          </View>
        ) : (
          sorted.map((p, i) => (
            <View key={p.id} style={styles.lbCard}>
              <View style={styles.playerRow}>
                <PlayerCardIcon
                  player={p as any}
                  size={34}
                  borderRadius={8}
                />

                <View style={styles.lbPlayerInfo}>
                  <Text style={styles.lbName}>{p.name}</Text>
                  <Text style={styles.lbSub}>
                    {p.wins} wins • {p.gamesPlayed} games • Eff{" "}
                    {(p.efficiency * 100).toFixed(0)}%
                  </Text>
                </View>

                <RankBadge rating={p.elo} size="sm" />
              </View>

              <View style={styles.metaRow}>
                <Text style={i === 0 ? styles.metaRankTop : styles.metaRank}>#{i + 1}</Text>
                <Text style={styles.metaElo}>ELO {Math.round(p.elo)}</Text>
                <Text style={styles.metaScore}>Score {Math.round(p.score)}</Text>
                <Text style={styles.metaPrestige}>Prestige {Math.round(p.prestige)}</Text>
                <Text style={styles.metaAvg}>Avg {p.avgPrestige.toFixed(1)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialTab?: string }>();

  const authBootstrapStatus = useStore((s: any) => s.authBootstrapStatus);
  const authSession = useStore((s: any) => s.authSession);
  const authProfile = useStore((s: any) => s.authProfile);
  const passwordRecoveryPending = useStore((s: any) => s.passwordRecoveryPending);
  const clearAuthState = useStore((s: any) => s.clearAuthState);
  const setPasswordRecoveryPending = useStore(
    (s: any) => s.setPasswordRecoveryPending
  );
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
    return [...commandGroups]
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
  }, [commandGroups, usage]);

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

  const detectedGroup = useMemo(() => {
    if (selectedIds.length < 2 || selectedGroup) return null;

    const exactGroup =
      visibleGroups.find((group) => sameIdSet(group.playerIds, selectedIds)) ?? null;

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
  }, [visibleGroups, selectedIds, usage, selectedGroup]);

  const selectedPlayers = useMemo(
    () => rankedPlayers.filter((player) => selectedIds.includes(player.id)),
    [rankedPlayers, selectedIds]
  );

  const filteredPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) {
      return rankedPlayers;
    }

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
    if (!signedInPlayerId) {
      return;
    }

    setSelectedIds((current) => {
      const next = ensureRequiredPlayerSelection(current, signedInPlayerId);
      return sameOrderedIds(current, next) ? current : next;
    });
  }, [signedInPlayerId]);

  useEffect(() => {
    setSelectedGroup((current) => {
      if (!current) {
        return current;
      }

      const nextGroup = visibleGroups.find((group) => group.id === current.id) ?? null;
      if (!nextGroup) {
        return null;
      }

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
        if (id === signedInPlayerId) {
          return prev;
        }
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
    tab === "leaderboard"
      ? "Data Center"
      : tab === "hubs"
        ? "Hubs"
        : "Command";

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
              <SectionCard
                eyebrow="Active Game"
                title="Current Match"
              >
                <View style={styles.commandActionRow}>
                  <ActionButton
                    title="Continue"
                    onPress={() => router.push(APP_ROUTES.game)}
                    style={styles.commandHalfButton}
                  />
                  <ActionButton
                    title="Delete"
                    variant="danger"
                    onPress={() => {
                      clearActiveGame();
                    }}
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

            {false && detectedGroup?.name ? (
              <Text style={styles.detectedGroupText}>
                {selectedGroup?.name
                  ? `Selected group: ${selectedGroup.name}`
                  : detectedGroup.id
                    ? `Detected group: ${detectedGroup.name}`
                    : `${detectedGroup.name} • ${(detectedGroup.inferredUseCount ?? 0).toString()} uses`}
              </Text>
            ) : null}

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
                  {visibleGroups.map((group) => {
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
                    <SelectedNamePill
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
          <HomeLeaderboardTab players={players} games={games} />
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
  container: {
    flex: 1,
    backgroundColor: "#02040F",
  },
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

  homeBackgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,6,18,0.16)",
  },

  homePrimaryRail: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 10,
  },
  homePrimaryPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  homePrimaryPillActive: {
    backgroundColor: "rgba(96,165,250,0.16)",
    borderColor: "rgba(96,165,250,0.32)",
  },
  homePrimaryPillPressed: {
    transform: [{ scale: 0.985 }],
  },
  homePrimaryPillText: {
    color: "#9CCBFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  homePrimaryPillTextActive: {
    color: "#F8FBFF",
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

  activeCard: {
    borderRadius: 16,
    padding: 10,
    backgroundColor: "rgba(9,14,28,0.88)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.14)",
  },
  activeSub: {
    color: "#93C5FD",
    fontSize: 12,
    marginTop: 3,
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  primaryBtn: {
    flex: 0.48,
    minHeight: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.18)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.35)",
  },
  dangerBtn: {
    flex: 0.48,
    minHeight: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  primaryText: {
    color: "#EAF2FF",
    fontSize: 12,
    fontWeight: "900",
  },
  dangerText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "900",
  },

  startBtnTop: {
    minHeight: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.18)",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.14)",
  },
  startActive: {
    backgroundColor: "#60A5FA",
    borderColor: "rgba(96,165,250,0.92)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  startText: {
    color: "#D8B4FE",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  startTextActive: {
    color: "#02040F",
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
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  setupColumn: {
  flex: 1,
  gap: 6,
  alignSelf: "flex-start",
  height: 300,
},
  columnHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 20,
  },
  sectionTitleSmall: {
    color: "#B9D8FF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.35,
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
  playerListItemCompact: {
  width: "48.5%",
  borderRadius: 10,
  paddingVertical: 8,
  paddingHorizontal: 8,
  backgroundColor: "rgba(9,14,28,0.96)",
  borderWidth: 1,
  overflow: "hidden",
  minHeight: 96,
},
  playerListItemCompactSelected: {
    shadowOpacity: 0.34,
    shadowRadius: 12,
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
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},
  playerCompactCopy: {
  flex: 1,
  alignItems: "flex-start",
  justifyContent: "center",
},
  playerCompactName: {
  color: "#EAF2FF",
  fontSize: 14,
  fontWeight: "800",
  textAlign: "left",
  width: "100%",
},
  lockedText: {
    color: "#94A3B8",
  },
  lockBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
  },
  lockBadgeText: {
    color: "#94A3B8",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.4,
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
  commandPlayerViewport: {
    height: 198,
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
  groupCardCompact: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(5,9,20,0.98)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    overflow: "hidden",
  },
  groupCardCompactActive: {
    borderColor: "rgba(96,165,250,0.78)",
    backgroundColor: "rgba(96,165,250,0.08)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  groupRowUltraCompact: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  groupNameUltraCompact: {
    flexShrink: 1,
    minWidth: 0,
    color: "#E9D5FF",
    fontSize: 11,
    fontWeight: "900",
    marginRight: 6,
  },
  groupInitialsRow: {
    flexShrink: 1,
    maxWidth: "50%",
    alignItems: "flex-end",
  },
  groupInitialsText: {
    color: "#60A5FA",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  dockDividerGlow: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 62,
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
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(6,10,22,0.98)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  bottomSetupDockGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(96,165,250,0.14)",
    borderRadius: 14,
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
    minHeight: 34,
  },
  selectedNamePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  selectedNamePillText: {
    color: "#EAF2FF",
    fontSize: 11,
    fontWeight: "800",
  },

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
  emptyText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },

  navScreen: {
    flex: 1,
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
    gap: 6,
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
    backgroundColor: "rgba(96,165,250,0.08)",
  },
  navTilePurple: {
    backgroundColor: "rgba(168,85,247,0.08)",
  },
  navIconLarge: {
    width: 132,
    height: 132,
    resizeMode: "contain",
  },
  navCardTitle: {
    color: "#F8FBFF",
    fontSize: 14,
    fontWeight: "900",
  },
  navCardMeta: {
    color: "#9CCBFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  startBtnWrap: {
    position: "relative",
  },
  startGlowLoop: {
    position: "absolute",
    top: -6,
    bottom: -6,
    left: -2,
    right: -2,
    borderRadius: 18,
    backgroundColor: "rgba(96,165,250,0.22)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  pressScaleSm: {
    transform: [{ scale: 0.975 }],
  },
  pressScaleStart: {
    transform: [{ scale: 0.985 }],
  },
  pressScaleNav: {
    transform: [{ scale: 0.97 }],
  },

  footerWrap: {
    marginTop: 16,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLine: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(96,165,250,0.18)",
  },
  footerText: {
    color: "#A855F7",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
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

  sectionTitle: {
    color: "#E9D5FF",
    fontSize: 18,
    fontWeight: "900",
  },
});
