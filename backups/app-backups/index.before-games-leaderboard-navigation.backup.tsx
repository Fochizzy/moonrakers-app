import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import { LeaderboardContent } from '@/app/leaderboard';

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
  elo?: number;
  rating?: number;
  wins?: number;
  gamesPlayed?: number;
  totalPrestige?: number;
  prestige?: number;
};

type GroupLike = {
  id: string;
  name: string;
  playerIds?: string[];
  createdAt?: number;
};

type LeaderboardSort = 'elo' | 'wins' | 'games' | 'prestige' | 'name';
type LeaderboardStatMode = 'primary' | 'secondary';

const COLORS = {
  bg: '#040814',
  bgDeep: '#020611',
  surface: '#0A1428',
  surfaceAlt: '#0F172A',
  surfaceMuted: '#0B1220',
  surfaceGlass: '#0B1323',

  border: 'rgba(99, 102, 241, 0.22)',
  borderSoft: 'rgba(148, 163, 184, 0.18)',
  borderStrong: 'rgba(139, 92, 246, 0.36)',

  textPrimary: '#F8FBFF',
  textSecondary: '#C7D6F3',
  textMuted: '#8EA6C8',

  brand: '#8B5CF6',
  brandTint: 'rgba(139, 92, 246, 0.16)',
  brandTintStrong: 'rgba(139, 92, 246, 0.24)',
  brandSoft: '#C4B5FD',

  cyan: '#67E8F9',
  cyanTint: 'rgba(103, 232, 249, 0.12)',
  blueGlow: '#60A5FA',

  success: '#22c55e',
  successTint: 'rgba(34, 197, 94, 0.14)',

  danger: '#ef4444',
  dangerBg: 'rgba(90, 24, 24, 0.88)',
  dangerBorder: 'rgba(248, 113, 113, 0.28)',
  dangerText: '#FCA5A5',

  gold: '#FBBF24',
  silver: '#CBD5E1',
  bronze: '#D97706',
};

function toNumber(v: any) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function getPlayerColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#22c55e';
    case 'purple':
      return '#a855f7';
    case 'blue':
      return '#3b82f6';
    case 'orange':
      return '#f97316';
    case 'yellow':
      return '#eab308';
    case 'red':
      return '#ef4444';
    case 'pink':
      return '#ec4899';
    default:
      return '#9ca3af';
  }
}

function getPlayerGlow(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return 'rgba(34, 197, 94, 0.28)';
    case 'purple':
      return 'rgba(168, 85, 247, 0.28)';
    case 'blue':
      return 'rgba(59, 130, 246, 0.28)';
    case 'orange':
      return 'rgba(249, 115, 22, 0.28)';
    case 'yellow':
      return 'rgba(234, 179, 8, 0.28)';
    case 'red':
      return 'rgba(239, 68, 68, 0.24)';
    case 'pink':
      return 'rgba(236, 72, 153, 0.24)';
    default:
      return 'rgba(148, 163, 184, 0.20)';
  }
}

function getPlayerTint(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return 'rgba(34, 197, 94, 0.16)';
    case 'purple':
      return 'rgba(168, 85, 247, 0.16)';
    case 'blue':
      return 'rgba(59, 130, 246, 0.16)';
    case 'orange':
      return 'rgba(249, 115, 22, 0.16)';
    case 'yellow':
      return 'rgba(234, 179, 8, 0.16)';
    case 'red':
      return 'rgba(239, 68, 68, 0.14)';
    case 'pink':
      return 'rgba(236, 72, 153, 0.16)';
    default:
      return 'rgba(148, 163, 184, 0.14)';
  }
}

function getPodiumAccent(rank: number) {
  if (rank === 0) {
    return {
      color: COLORS.gold,
      tint: 'rgba(251, 191, 36, 0.14)',
      label: 'Gold',
    };
  }
  if (rank === 1) {
    return {
      color: COLORS.silver,
      tint: 'rgba(203, 213, 225, 0.14)',
      label: 'Silver',
    };
  }
  if (rank === 2) {
    return {
      color: COLORS.bronze,
      tint: 'rgba(217, 119, 6, 0.14)',
      label: 'Bronze',
    };
  }
  return null;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function derivePlayerStats(player: PlayerLike, games: any[]) {
  const directWins = toNumber(player?.wins);
  const directGames = toNumber(player?.gamesPlayed);
  const directPrestige = toNumber(player?.totalPrestige ?? player?.prestige);
  const elo = toNumber(player?.elo ?? player?.rating);

  let winsFromGames = 0;
  let gamesFromGames = 0;
  let prestigeFromGames = 0;
  let recentPoints = 0;
  let recentCount = 0;

  const safeGames = Array.isArray(games) ? [...games] : [];
  safeGames.sort((a, b) => toNumber(b?.createdAt) - toNumber(a?.createdAt));

  for (const game of safeGames) {
    const gamePlayers = Array.isArray(game?.players) ? game.players : [];
    const result = gamePlayers.find(
      (p: any) => p?.id === player.id || p?.playerId === player.id
    );
    if (!result) continue;

    gamesFromGames += 1;
    const prestige = toNumber(
      result?.totalPrestige ??
        result?.prestige ??
        result?.score ??
        result?.finalPrestige
    );
    prestigeFromGames += prestige;

    const placement = toNumber(result?.placement ?? result?.place ?? result?.rank);
    const isWinner =
      result?.isWinner === true || placement === 1 || result?.won === true;

    if (isWinner) winsFromGames += 1;

    if (recentCount < 5) {
      recentPoints += isWinner ? 3 : prestige > 0 ? 1 : 0;
      recentCount += 1;
    }
  }

  const wins = Math.max(directWins, winsFromGames);
  const gamesPlayed = Math.max(directGames, gamesFromGames);
  const prestige = Math.max(directPrestige, prestigeFromGames);
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const avgPrestige = gamesPlayed > 0 ? prestige / gamesPlayed : 0;
  const recentForm = recentCount > 0 ? recentPoints / recentCount : 0;

  return {
    elo,
    wins,
    games: gamesPlayed,
    prestige,
    winRate,
    avgPrestige,
    recentForm,
  };
}

function getInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function AnimatedTabButton({
  label,
  isActive,
  accent,
  accentTint,
  onPress,
}: {
  label: string;
  isActive: boolean;
  accent: string;
  accentTint: string;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isActive, progress]);

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  const activeBorderOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1],
  });

  const activeTintOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Pressable onPress={onPress} style={styles.tabNavButton}>
      <View style={styles.tabButtonInner}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabGlow,
            {
              backgroundColor: accent,
              opacity: glowOpacity,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabActiveTint,
            {
              backgroundColor: accentTint,
              opacity: activeTintOpacity,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabActiveBorder,
            {
              borderColor: accent,
              opacity: activeBorderOpacity,
            },
          ]}
        />
        <Text
          style={[
            styles.tabNavText,
            isActive && {
              color: '#FFFFFF',
              fontWeight: '900',
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function SortSegment({
  label,
  active,
  accent,
  accentTint,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  accentTint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        active && {
          borderColor: accent,
          backgroundColor: accentTint,
        },
      ]}
    >
      <Text style={[styles.segmentButtonText, active && { color: accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SelectablePlayerRow({
  player,
  selected,
  expanded,
  rank,
  onToggleExpand,
  onToggleSelect,
  onOpenProfile,
  onPrefetchProfile,
  onDelete,
}: {
  player: PlayerLike;
  selected: boolean;
  expanded: boolean;
  rank?: number | null;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onOpenProfile: () => void;
  onPrefetchProfile?: () => void;
  onDelete: () => void;
}) {
  const playerColor = getPlayerColor(player.color);
  const glowColor = getPlayerGlow(player.color);
  const tintColor = 'rgba(255,255,255,0.06)';
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expanded, progress]);

  const borderWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [selected ? 0.24 : 0, selected ? 0.95 : 0.55],
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  return (
    <Animated.View
      style={[
        styles.compactRowCard,
        expanded && styles.compactRowCardExpanded,
        {
          transform: [{ scale }],
          borderColor: selected ? playerColor : expanded ? COLORS.brand : '#22324d',
          borderWidth,
          shadowColor: expanded ? playerColor : COLORS.brand,
          shadowOpacity: expanded ? 0.12 : 0,
          shadowRadius: expanded ? 8 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: expanded ? 4 : 0,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.playerRowGlow,
          {
            backgroundColor: glowColor,
            opacity: glowOpacity,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.playerRowTint,
          {
            backgroundColor: tintColor,
            opacity: glowOpacity,
          },
        ]}
      />

      <Pressable onPress={onToggleExpand} style={styles.playerRowPressArea}>
        <View style={styles.playerInfo}>
          <View
            style={[
              styles.playerBadge,
              styles.playerBadgeCompact,
              {
                backgroundColor: playerColor,
                shadowColor: playerColor,
              },
            ]}
          >
            <Text style={styles.playerBadgeText}>{getInitials(player.name)}</Text>
          </View>

          <View style={styles.playerTextWrap}>
            <Text style={styles.listTitle}>{player.name}</Text>
            {expanded ? (
              <Text style={styles.listMeta}>
                {selected
                  ? 'Selected for next game'
                  : rank
                    ? `Rank #${rank}`
                    : player.color ?? 'No color'}
              </Text>
            ) : null}
          </View>
        </View>

        <Text
          style={[
            styles.selectStateText,
            { color: selected ? playerColor : COLORS.textMuted },
          ]}
        >
          {expanded ? 'Hide' : 'Open'}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.inlinePlayerActions}>
          <Pressable
            onPress={onToggleSelect}
            style={[
              styles.inlineSelectButton,
              {
                borderColor: playerColor,
                backgroundColor: selected
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(8, 14, 28, 0.84)',
              },
            ]}
          >
            <Text style={[styles.inlineSelectButtonText, { color: playerColor }]}>
              {selected ? 'Selected' : 'Select'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onOpenProfile}
            onPressIn={onPrefetchProfile}
            style={[
              styles.inlineProfileButton,
              { borderColor: playerColor, backgroundColor: `${playerColor}16` },
            ]}
          >
            <Text style={[styles.inlineProfileButtonText, { color: playerColor }]}>
              Open Profile
            </Text>
          </Pressable>

          <Pressable onPress={onDelete} style={styles.inlineDeleteButton}>
            <Text style={styles.inlineDeleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

function AnimatedSelectableGroupRow({
  group,
  count,
  selected,
  favorite,
  onPress,
  onDelete,
  onToggleFavorite,
}: {
  group: GroupLike;
  count: number;
  selected: boolean;
  favorite: boolean;
  onPress: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [selected, progress]);

  const borderWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  return (
    <Animated.View
      style={[
        styles.compactRowCard,
        styles.groupRowCard,
        {
          transform: [{ scale }],
          borderColor: selected ? '#FFFFFF' : '#22324d',
          borderWidth,
          shadowColor: '#FFFFFF',
          shadowOpacity: selected ? 0.08 : 0,
          shadowRadius: selected ? 6 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: selected ? 3 : 0,
          backgroundColor: selected ? 'rgba(255,255,255,0.06)' : COLORS.surfaceAlt,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.groupRowGlow,
          {
            backgroundColor: 'rgba(255,255,255,0.06)',
            opacity: glowOpacity,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.groupRowTint,
          {
            backgroundColor: 'rgba(255,255,255,0.05)',
            opacity: glowOpacity,
          },
        ]}
      />

      <Pressable onPress={onPress} style={styles.groupRowMainPressable}>
        <View style={styles.listMain}>
          <View style={styles.groupTitleRow}>
            <Text
              style={[
                styles.listTitle,
                selected && { color: '#FFFFFF' },
              ]}
            >
              {group.name}
            </Text>

            {favorite ? (
              <View style={styles.favoriteBadge}>
                <Text style={styles.favoriteBadgeText}>★</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.listMeta}>
            {count} player{count === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.rowActions}>
          <Text
            style={[
              styles.groupSelectState,
              selected
                ? {
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: '#FFFFFF',
                  }
                : {
                    color: COLORS.textMuted,
                    borderColor: COLORS.borderSoft,
                  },
            ]}
          >
            {selected ? 'Selected' : 'Tap'}
          </Text>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            style={[
              styles.favoriteButton,
              favorite && styles.favoriteButtonActive,
            ]}
          >
            <Text
              style={[
                styles.favoriteButtonText,
                favorite && styles.favoriteButtonTextActive,
              ]}
            >
              ★
            </Text>
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onDelete();
            }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as PlayerLike[];

  const groups = useStore((s: any) =>
    Array.isArray(s.groups) ? s.groups : []
  ) as GroupLike[];

  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as any[];

  const activeGame = useStore((s: any) => s.activeGame);
  const addGroup = useStore((s: any) => s.addGroup);
  const removeGroup = useStore((s: any) => s.removeGroup);
  const removePlayer = useStore((s: any) => s.removePlayer);
  const clearActiveGame = useStore((s: any) => s.clearActiveGame);

  const [groupName, setGroupName] = useState('');
  const [groupDraftPlayerIds, setGroupDraftPlayerIds] = useState<string[]>([]);
  const [manualSelectedPlayerIds, setManualSelectedPlayerIds] = useState<string[]>([]);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<LeaderboardSort>('elo');
  const [statMode, setStatMode] = useState<LeaderboardStatMode>('primary');
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [favoriteGroupIds, setFavoriteGroupIds] = useState<string[]>([]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const activeSelectedPlayerIds = useMemo(() => {
    if (selectedGroup) {
      return Array.isArray(selectedGroup.playerIds)
        ? selectedGroup.playerIds.filter(Boolean)
        : [];
    }
    return manualSelectedPlayerIds;
  }, [manualSelectedPlayerIds, selectedGroup]);

  const manualSelectedPlayers = useMemo(() => {
    const selected = new Set(manualSelectedPlayerIds);
    return players.filter((player) => selected.has(player.id));
  }, [players, manualSelectedPlayerIds]);

  const selectedGroupLeadPlayer = useMemo(() => {
    const firstId = selectedGroup?.playerIds?.[0];
    return players.find((p) => p.id === firstId) ?? null;
  }, [players, selectedGroup]);

  const orderedGroups = useMemo(() => {
    const favorites = new Set(favoriteGroupIds);

    return [...groups].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 1 : 0;
      const bFav = favorites.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      return toNumber(b.createdAt) - toNumber(a.createdAt);
    });
  }, [groups, favoriteGroupIds]);

  const activeColor =
    manualSelectedPlayers[0]?.color ?? selectedGroupLeadPlayer?.color ?? 'purple';
  const accent = getPlayerColor(activeColor);
  const accentTint = getPlayerTint(activeColor);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const leaderboard = useMemo(() => {
    const mapped = players.map((player) => {
      const stats = derivePlayerStats(player, games);
      return {
        ...player,
        ...stats,
      };
    });

    mapped.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'wins':
          return b.wins - a.wins || b.elo - a.elo || a.name.localeCompare(b.name);
        case 'games':
          return b.games - a.games || b.elo - a.elo || a.name.localeCompare(b.name);
        case 'prestige':
          return (
            b.prestige - a.prestige ||
            b.elo - a.elo ||
            a.name.localeCompare(b.name)
          );
        case 'elo':
        default:
          return b.elo - a.elo || b.wins - a.wins || a.name.localeCompare(b.name);
      }
    });

    return mapped;
  }, [players, games, sortBy]);

  const leaderboardRankByPlayerId = useMemo(() => {
    const map: Record<string, number> = {};
    leaderboard.forEach((player, index) => {
      map[player.id] = index + 1;
    });
    return map;
  }, [leaderboard]);

  const visibleLeaderboard = useMemo(() => {
    return showAllLeaderboard ? leaderboard : leaderboard.slice(0, 10);
  }, [leaderboard, showAllLeaderboard]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [sortBy, statMode, showAllLeaderboard, leaderboard.map((p) => p.id).join('|')]);

  const animatedBg = useRef(new Animated.Value(0)).current;
  const previousAccent = useRef(accentTint);

  useEffect(() => {
    if (previousAccent.current !== accentTint) {
      animatedBg.setValue(0);
      Animated.timing(animatedBg, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      previousAccent.current = accentTint;
    }
  }, [accentTint, animatedBg]);

  const bgOverlayOpacity = animatedBg.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.18],
  });

  const getPlayerProfilePath = (playerId: string) =>
    `/player-profile/${encodeURIComponent(String(playerId))}`;

  const prefetchPlayerProfile = (playerId: string) => {
    try {
      router.prefetch(getPlayerProfilePath(playerId));
    } catch {
      // Ignore prefetch failures and fall back to normal navigation.
    }
  };

  useEffect(() => {
    const idsToPrefetch = players.slice(0, 12).map((player) => player.id).filter(Boolean);
    idsToPrefetch.forEach(prefetchPlayerProfile);
  }, [players]);

  const toggleDraftPlayer = (playerId: string) => {
    setGroupDraftPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const toggleSelectedPlayer = (playerId: string) => {
    setSelectedGroupId(null);
    setManualSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const togglePlayerExpand = (playerId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedGroupId(null);
    setExpandedPlayerId((current) => (current === playerId ? null : playerId));
  };

  const clearSelection = () => {
    setSelectedGroupId(null);
    setManualSelectedPlayerIds([]);
    setExpandedPlayerId(null);
  };

  const clearGroupDraft = () => {
    setGroupName('');
    setGroupDraftPlayerIds([]);
    setSelectedGroupId(null);
    setManualSelectedPlayerIds([]);
    setExpandedPlayerId(null);
  };

  const handleSelectGroup = (group: GroupLike) => {
    setSelectedGroupId(group.id);
    setManualSelectedPlayerIds([]);
    setExpandedPlayerId(null);
  };

  const toggleFavoriteGroup = (groupId: string) => {
    setFavoriteGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [groupId, ...current]
    );
  };

  const handleCreateGroup = () => {
    const trimmed = groupName.trim();

    if (!trimmed) {
      Alert.alert('Missing group name', 'Enter a name for the group.');
      return;
    }

    if (groupDraftPlayerIds.length === 0) {
      Alert.alert(
        'No players selected',
        'Select at least one player for the group.'
      );
      return;
    }

    if (typeof addGroup !== 'function') {
      Alert.alert(
        'Store update needed',
        'Your store needs addGroup support before groups can be saved.'
      );
      return;
    }

    addGroup({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      playerIds: groupDraftPlayerIds,
      createdAt: Date.now(),
    });

    setGroupName('');
    setGroupDraftPlayerIds([]);
  };

  const handleDeletePlayer = (player: PlayerLike) => {
    Alert.alert(
      'Delete Player',
      `Remove ${player.name}? This should also remove them from saved groups and stats views.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (typeof removePlayer !== 'function') {
              Alert.alert(
                'Store update needed',
                'Your store needs removePlayer support before players can be deleted.'
              );
              return;
            }

            removePlayer(player.id);
            setManualSelectedPlayerIds((current) =>
              current.filter((id) => id !== player.id)
            );
            setExpandedPlayerId((current) => (current === player.id ? null : current));
            setGroupDraftPlayerIds((current) =>
              current.filter((id) => id !== player.id)
            );

            if (selectedGroup?.playerIds?.includes(player.id)) {
              setSelectedGroupId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = (groupId: string, groupNameValue: string) => {
    Alert.alert('Delete Group', `Remove ${groupNameValue}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (typeof removeGroup === 'function') {
            removeGroup(groupId);

            if (selectedGroupId === groupId) {
              setSelectedGroupId(null);
            }

            setFavoriteGroupIds((current) => current.filter((id) => id !== groupId));
          }
        },
      },
    ]);
  };

  const goToGameSetup = (playerIds: string[], group?: GroupLike) => {
    const cleanIds = playerIds.filter(Boolean);

    if (cleanIds.length === 0) {
      Alert.alert('No players selected', 'Select at least one player first.');
      return;
    }

    router.push({
      pathname: '/game-setup',
      params: {
        playerIds: JSON.stringify(cleanIds),
        groupId: group?.id,
        groupName: group?.name,
      },
    });
  };

  const startButtonLabel = useMemo(() => {
    const count = activeSelectedPlayerIds.length;
    if (count === 0) return 'Start Game';
    if (selectedGroup?.name) return `Launch ${selectedGroup.name}`;
    if (count === 1) return 'Launch Solo Session';
    return `Launch ${count}-Player Session`;
  }, [activeSelectedPlayerIds, selectedGroup]);

  const handleStartGame = () => {
    if (activeSelectedPlayerIds.length === 0) {
      Alert.alert(
        'No players selected',
        'Tap one or more players, or choose a group first.'
      );
      return;
    }

    goToGameSetup(activeSelectedPlayerIds, selectedGroup ?? undefined);
  };

  const handleContinueGame = () => {
    if (!activeGame) return;
    router.push('/game');
  };

  const handleDeleteActiveGame = () => {
    if (!activeGame) return;

    Alert.alert(
      'Delete Active Game',
      'Are you sure you want to delete the active game?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (typeof clearActiveGame === 'function') {
              clearActiveGame();
            }
          },
        },
      ]
    );
  };

  const handleOpenPlayerProfile = (playerId: string) => {
    prefetchPlayerProfile(playerId);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    router.push(getPlayerProfilePath(playerId));
  };

  const isGroupClearDisabled =
    groupName.trim().length === 0 &&
    groupDraftPlayerIds.length === 0 &&
    selectedGroupId === null &&
    manualSelectedPlayerIds.length === 0;

  const canStart = activeSelectedPlayerIds.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View pointerEvents="none" style={styles.nebulaPurple} />
        <View pointerEvents="none" style={styles.nebulaBlue} />
        <View pointerEvents="none" style={styles.stellarRingOne} />
        <View pointerEvents="none" style={styles.stellarRingTwo} />
        <View style={styles.backgroundDim} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.animatedAccentOverlay,
            {
              backgroundColor: accentTint,
              opacity: bgOverlayOpacity,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyHeaderWrap}>
          <View style={styles.headerBoard}>
            <View style={styles.headerTitleRow}>
              <View style={styles.orbitBadge} />
              <Text style={styles.headerBoardTitle}>Moonraker&apos;s</Text>
            </View>
            <Text style={styles.headerBoardSubtitle}>Fleet Command Interface</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { borderColor: COLORS.brand }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>View Your Mission Log</Text>
              <Text style={styles.heroHeadline}>View the Data of Previous Games</Text>
            </View>
          </View>

          <View style={[styles.tabNav, { borderColor: COLORS.brand }]}>
            {[
              { label: 'Stats', route: '/stats' },
              { label: 'ELO', route: '/elo' },
              { label: 'History', route: '/history' },
              { label: 'Charts', route: '/charts' },
              { label: 'Compare', route: '/charts/compare' },
              { label: 'Player Card', route: '/ColorPlayerCard' },
            ].map((tab) => (
              <AnimatedTabButton
                key={tab.route}
                label={tab.label}
                isActive={pathname === tab.route}
                accent={COLORS.brand}
                accentTint={COLORS.brandTint}
                onPress={() => router.push(tab.route as any)}
              />
            ))}
          </View>

          <Pressable
            onPress={() => {
              router.push('/player-profile' as any);
            }}
            style={styles.fullProfileButton}
          >
            <Text style={styles.fullProfileButtonText}>Full Player Profile</Text>
          </Pressable>
        </View>

        <LeaderboardContent embedded />

        <View style={[styles.card, styles.selectionCard]}>
          <View style={styles.compactSectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>Crew Assembly</Text>
              <Text style={styles.sectionTitle}>Select Players</Text>
            </View>

            <View style={styles.selectionHeaderActions}>
              <Pressable
                onPress={() => router.push('/add-players' as any)}
                style={[
                  styles.headerUtilityButton,
                  styles.headerUtilityButtonSoft,
                ]}
              >
                <Text
                  style={[
                    styles.headerUtilityButtonText,
                    { color: COLORS.brand },
                  ]}
                >
                  Add Player
                </Text>
              </Pressable>

              <Pressable
                onPress={clearSelection}
                style={[
                  styles.headerUtilityButton,
                  activeSelectedPlayerIds.length === 0 &&
                    styles.headerUtilityButtonDisabled,
                ]}
                disabled={activeSelectedPlayerIds.length === 0}
              >
                <Text style={styles.headerUtilityButtonText}>Clear</Text>
              </Pressable>
            </View>
          </View>

          {activeGame ? (
            <View style={styles.activeGameActionsRow}>
              <Pressable
                onPress={handleContinueGame}
                style={[
                  styles.activeGameButton,
                  styles.primaryButton,
                  styles.continueGameButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Continue Active Game</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteActiveGame}
                style={[styles.activeGameButton, styles.deleteActiveGameButton]}
              >
                <Text style={styles.deleteActiveGameButtonText}>Delete</Text>
              </Pressable>
            </View>
          ) : null}

          {players.length === 0 ? (
            <Text style={styles.emptyText}>
              No players yet. Add a player profile first.
            </Text>
          ) : (
            <View style={styles.compactListTight}>
              {players.map((player) => (
                <SelectablePlayerRow
                  key={player.id}
                  player={player}
                  selected={
                    !selectedGroupId && manualSelectedPlayerIds.includes(player.id)
                  }
                  expanded={expandedPlayerId === player.id}
                  rank={leaderboardRankByPlayerId[player.id]}
                  onToggleExpand={() => togglePlayerExpand(player.id)}
                  onToggleSelect={() => toggleSelectedPlayer(player.id)}
                  onOpenProfile={() => handleOpenPlayerProfile(player.id)}
                  onPrefetchProfile={() => prefetchPlayerProfile(player.id)}
                  onDelete={() => handleDeletePlayer(player)}
                />
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.startButtonBetweenSections,
            {
              backgroundColor: canStart ? '#FFFFFF' : '#8B5CF6',
              borderColor: '#A78BFA',
            },
            !canStart && styles.startButtonDisabled,
          ]}
          onPress={handleStartGame}
          disabled={!canStart}
        >
          <Text
            style={[
              styles.startButtonText,
              {
                textAlign: 'center',
                color: canStart ? '#8B5CF6' : '#FFFFFF',
              },
            ]}
          >
            {startButtonLabel}
          </Text>
        </Pressable>

        <View style={[styles.card, styles.groupCard]}>
          <View style={styles.compactSectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>Saved Formations</Text>
              <Text style={styles.sectionTitle}>Select Group</Text>
            </View>

            <View style={styles.selectionHeaderActions}>
              <Text style={[styles.sectionMeta, { color: COLORS.textMuted }]}>
                {groups.length}
              </Text>

              <Pressable
                onPress={clearGroupDraft}
                style={[
                  styles.headerUtilityButton,
                  isGroupClearDisabled && styles.headerUtilityButtonDisabled,
                ]}
                disabled={isGroupClearDisabled}
              >
                <Text style={styles.headerUtilityButtonText}>Clear</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="New group name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />

          <View style={styles.selectableList}>
            {players.map((player) => {
              const selected = groupDraftPlayerIds.includes(player.id);
              const playerColor = getPlayerColor(player.color);

              return (
                <Pressable
                  key={player.id}
                  onPress={() => toggleDraftPlayer(player.id)}
                  style={[
                    styles.groupSelectChip,
                    selected && {
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderColor: playerColor,
                    },
                  ]}
                >
                  <View
                    style={[styles.colorDot, { backgroundColor: playerColor }]}
                  />
                  <Text
                    style={[
                      styles.groupSelectChipText,
                      selected && styles.groupSelectChipTextActive,
                    ]}
                  >
                    {player.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.createGroupButton, styles.primaryButton]}
            onPress={handleCreateGroup}
          >
            <Text style={styles.createGroupButtonText}>Save Group</Text>
          </Pressable>

          <View style={styles.compactListTight}>
            {orderedGroups.length === 0 ? (
              <Text style={styles.emptyText}>No saved groups yet.</Text>
            ) : (
              orderedGroups.map((group) => {
                const count = Array.isArray(group.playerIds)
                  ? group.playerIds.length
                  : 0;

                const selected = group.id === selectedGroupId;
                const favorite = favoriteGroupIds.includes(group.id);

                return (
                  <View key={group.id}>
                    <AnimatedSelectableGroupRow
                      group={group}
                      count={count}
                      selected={selected}
                      favorite={favorite}
                      onPress={() => handleSelectGroup(group)}
                      onToggleFavorite={() => toggleFavoriteGroup(group.id)}
                      onDelete={() => handleDeleteGroup(group.id, group.name)}
                    />
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  nebulaPurple: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    top: 36,
    right: -72,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.22,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  nebulaBlue: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    bottom: 110,
    left: -56,
    backgroundColor: 'rgba(96, 165, 250, 0.10)',
    shadowColor: '#60A5FA',
    shadowOpacity: 0.18,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  stellarRingOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 999,
    top: -140,
    left: -120,
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.06)',
  },

  stellarRingTwo: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 999,
    bottom: -120,
    right: -80,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.06)',
  },

  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 18, 0.44)',
  },

  animatedAccentOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  container: {
    padding: 12,
    paddingBottom: 28,
    gap: 10,
  },

  stickyHeaderWrap: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    backgroundColor: 'rgba(4,8,20,0.72)',
  },

  headerBoard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#0A1428',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  orbitBadge: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  headerBoardTitle: {
    color: '#C4B5FD',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  headerBoardSubtitle: {
    color: '#67E8F9',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  heroCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  heroTopRow: {
    gap: 8,
  },

  heroTitleWrap: {
    gap: 4,
  },

  heroEyebrow: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  heroHeadline: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  startButtonBetweenSections: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'stretch',
  },

  startButtonDisabled: {
    opacity: 0.45,
  },

  startButtonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  tabNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#09111F',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 8,
  },

  tabNavButton: {
    flexGrow: 1,
    minWidth: '30%',
  },

  tabButtonInner: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },

  tabGlow: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    bottom: -8,
    borderRadius: 16,
  },

  tabActiveTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },

  tabActiveBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1.5,
  },

  tabNavText: {
    color: '#D6E3FF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.35,
  },

  fullProfileButton: {
    marginTop: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.brand,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullProfileButtonText: {
    color: COLORS.brandSoft,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  card: {
    backgroundColor: '#0A1428',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
    gap: 10,
  },

  leaderboardCard: {
    padding: 10,
  },

  selectionCard: {
    padding: 9,
    gap: 8,
  },

  groupCard: {
    padding: 9,
    gap: 8,
  },

  leaderboardHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  utilityPillButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  utilityPillButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },

  compactSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  sectionEyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FBFF',
    letterSpacing: 0.2,
  },

  sectionMeta: {
    fontSize: 11,
    fontWeight: '700',
  },

  selectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  headerUtilityButton: {
    backgroundColor: 'rgba(10, 16, 30, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  headerUtilityButtonSoft: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.28)',
  },

  headerUtilityButtonDisabled: {
    opacity: 0.45,
  },

  headerUtilityButtonText: {
    color: '#D6E3FF',
    fontSize: 12,
    fontWeight: '800',
  },

  segmentedControl: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#09111F',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.10)',
    borderRadius: 16,
    padding: 6,
  },

  segmentButton: {
    flexGrow: 1,
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },

  segmentButtonText: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceMuted,
    fontSize: 13,
  },

  selectableList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  groupSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  groupSelectChipText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 12,
  },

  groupSelectChipTextActive: {
    color: COLORS.textPrimary,
  },

  createGroupButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },

  createGroupButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  compactList: {
    gap: 8,
  },

  compactListTight: {
    gap: 6,
  },

  compactRowCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#22324d',
    gap: 6,
  },

  compactRowCardExpanded: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  playerRowPressArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 1,
    minHeight: 30,
  },

  playerRowGlow: {
    ...StyleSheet.absoluteFillObject,
  },

  playerRowTint: {
    ...StyleSheet.absoluteFillObject,
  },

  leaderboardRow: {
    backgroundColor: '#0B1220',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  leaderboardRowTop3: {
    paddingVertical: 12,
    minHeight: 74,
    borderWidth: 1.2,
  },

  leaderboardRowSelected: {
    borderWidth: 1.5,
  },

  leaderboardAccentRail: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },

  leaderboardRank: {
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  leaderboardRankText: {
    fontSize: 14,
    fontWeight: '900',
  },

  podiumLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  selectedBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },

  selectedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

  leaderboardMain: {
    flex: 1,
  },

  leaderboardChevronWrap: {
    width: 18,
    alignItems: 'flex-end',
  },

  leaderboardChevron: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },

  listMain: {
    flex: 1,
  },

  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E6EDF7',
  },

  listMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#93A9D1',
  },

  primaryStatStrong: {
    fontSize: 12,
    fontWeight: '900',
  },

  secondaryStatText: {
    color: '#8EA6C8',
    fontSize: 12,
    fontWeight: '600',
  },

  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    zIndex: 1,
  },

  playerTextWrap: {
    flex: 1,
  },

  playerBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  playerBadgeCompact: {
    width: 26,
    height: 26,
  },

  leaderboardPlayerBadge: {
    width: 38,
    height: 38,
  },

  playerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  selectStateText: {
    fontSize: 12,
    fontWeight: '800',
    zIndex: 1,
  },

  inlinePlayerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    zIndex: 1,
    flexWrap: 'wrap',
  },

  inlineSelectButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  inlineSelectButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },

  inlineProfileButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  inlineProfileButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },

  inlineDeleteButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerBg,
  },

  inlineDeleteButtonText: {
    color: COLORS.dangerText,
    fontSize: 12,
    fontWeight: '800',
  },

  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  activeGameActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 2,
  },

  activeGameButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueGameButton: {
    flex: 1,
  },

  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#A78BFA',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  deleteButton: {
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },

  deleteButtonText: {
    color: COLORS.dangerText,
    fontSize: 12,
    fontWeight: '700',
  },

  deleteActiveGameButton: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    minWidth: 88,
  },

  deleteActiveGameButtonText: {
    color: COLORS.dangerText,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  groupRowCard: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  groupRowGlow: {
    ...StyleSheet.absoluteFillObject,
  },

  groupRowTint: {
    ...StyleSheet.absoluteFillObject,
  },

  groupRowMainPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 1,
  },

  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  groupSelectState: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },

  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(10, 16, 30, 0.92)',
  },

  favoriteButtonActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
  },

  favoriteButtonText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '900',
  },

  favoriteButtonTextActive: {
    color: COLORS.gold,
  },

  favoriteBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.34)',
    paddingHorizontal: 4,
  },

  favoriteBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '900',
  },
});



