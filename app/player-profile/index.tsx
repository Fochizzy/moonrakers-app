import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';
import { useStore } from '@/store/useStore';

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

const COLORS = {
  bg: '#040814',
  surface: 'rgba(10, 20, 40, 0.92)',
  surfaceAlt: 'rgba(15, 23, 42, 0.96)',
  surfaceMuted: 'rgba(9, 17, 31, 0.98)',
  border: 'rgba(99, 102, 241, 0.16)',
  borderSoft: 'rgba(148, 163, 184, 0.12)',
  textPrimary: '#F8FBFF',
  textSecondary: '#C7D6F3',
  textMuted: '#8EA6C8',
  brand: '#8B5CF6',
  brandSoft: '#C4B5FD',
  brandTint: 'rgba(139, 92, 246, 0.14)',
  cyan: '#67E8F9',
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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

function getPlayerTint(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return 'rgba(34, 197, 94, 0.14)';
    case 'purple':
      return 'rgba(168, 85, 247, 0.14)';
    case 'blue':
      return 'rgba(59, 130, 246, 0.14)';
    case 'orange':
      return 'rgba(249, 115, 22, 0.14)';
    case 'yellow':
      return 'rgba(234, 179, 8, 0.14)';
    case 'red':
      return 'rgba(239, 68, 68, 0.12)';
    case 'pink':
      return 'rgba(236, 72, 153, 0.14)';
    default:
      return 'rgba(148, 163, 184, 0.12)';
  }
}

function getInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function derivePlayerPreview(player: PlayerLike, games: any[]) {
  const directWins = toNumber(player?.wins);
  const directGames = toNumber(player?.gamesPlayed);
  const directPrestige = toNumber(player?.totalPrestige ?? player?.prestige);
  const elo = toNumber(player?.elo ?? player?.rating);

  let winsFromGames = 0;
  let gamesFromGames = 0;
  let prestigeFromGames = 0;

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

    const placement = toNumber(
      result?.placement ?? result?.place ?? result?.rank
    );
    const isWinner =
      result?.isWinner === true || placement === 1 || result?.won === true;

    if (isWinner) winsFromGames += 1;
  }

  const wins = Math.max(directWins, winsFromGames);
  const gamesPlayed = Math.max(directGames, gamesFromGames);
  const prestige = Math.max(directPrestige, prestigeFromGames);
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  return {
    elo,
    wins,
    gamesPlayed,
    prestige,
    winRate,
  };
}

function TinyStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={styles.tinyStat}>
      <Text style={styles.tinyStatLabel}>{label}</Text>
      <Text
        style={[styles.tinyStatValue, accent ? { color: accent } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function PlayerOptionCard({
  player,
  selected,
  onPress,
}: {
  player: PlayerLike & {
    preview: {
      elo: number;
      wins: number;
      gamesPlayed: number;
      prestige: number;
      winRate: number;
    };
  };
  selected: boolean;
  onPress: () => void;
}) {
  const accent = getPlayerColor(player.color);
  const tint = getPlayerTint(player.color);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.playerCard,
        selected && {
          borderColor: accent,
          backgroundColor: tint,
        },
      ]}
    >
      <View style={styles.playerTopRow}>
        <View style={[styles.avatar, { backgroundColor: accent }]}>
          <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
        </View>

        <View style={styles.playerMain}>
          <Text numberOfLines={1} style={styles.playerName}>
            {player.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.playerMeta, selected && { color: accent }]}
          >
            {player.color?.toUpperCase() || 'UNASSIGNED'}
          </Text>
        </View>

        <View
          style={[
            styles.selectionDot,
            selected && {
              borderColor: accent,
              backgroundColor: accent,
            },
          ]}
        />
      </View>

      <View style={styles.playerStatsRow}>
        <TinyStat label="ELO" value={player.preview.elo || 0} accent={accent} />
        <TinyStat label="W" value={player.preview.wins} />
        <TinyStat label="WR" value={`${player.preview.winRate}%`} />
      </View>
    </Pressable>
  );
}

export default function PlayerProfilePickerScreen() {
  const router = useRouter();

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as PlayerLike[];

  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as any[];

  const [selectedPlayerCardId, setSelectedPlayerCardId] = useState<string | null>(
    null
  );

  const playerOptions = useMemo(() => {
    return [...players]
      .map((player) => ({
        ...player,
        preview: derivePlayerPreview(player, games),
      }))
      .sort((a, b) => {
        const eloDiff = b.preview.elo - a.preview.elo;
        if (eloDiff !== 0) return eloDiff;

        const winsDiff = b.preview.wins - a.preview.wins;
        if (winsDiff !== 0) return winsDiff;

        return a.name.localeCompare(b.name);
      });
  }, [games, players]);

  const visiblePlayers = useMemo(() => playerOptions.slice(0, 6), [playerOptions]);

  const selectedPlayer = useMemo(
    () =>
      playerOptions.find((player) => player.id === selectedPlayerCardId) ?? null,
    [playerOptions, selectedPlayerCardId]
  );

  const handleSelect = (playerId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPlayerCardId(playerId);
  };

  const handleContinue = () => {
    if (!selectedPlayerCardId) return;

    router.push({
      pathname: '/player-profile/[playerId]' as any,
      params: { playerId: String(selectedPlayerCardId) },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View pointerEvents="none" style={styles.backgroundDim} />
      </View>

      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {playerOptions.length} players
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>Player Profiles</Text>
            <Text style={styles.title}>Select Player</Text>
            <Text style={styles.subtitle}>Tap once, then open profile.</Text>
          </View>

          <Pressable
            onPress={handleContinue}
            disabled={!selectedPlayerCardId}
            style={[
              styles.continueButton,
              !selectedPlayerCardId && styles.continueButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueButtonText,
                !selectedPlayerCardId && styles.continueButtonTextDisabled,
              ]}
            >
              Open
            </Text>
          </Pressable>
        </View>

        <View style={styles.gridCard}>
          {visiblePlayers.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                No players found. Add a player first.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {visiblePlayers.map((player) => (
                <PlayerOptionCard
                  key={player.id}
                  player={player}
                  selected={selectedPlayerCardId === player.id}
                  onPress={() => handleSelect(player.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.footerCard}>
          <View style={styles.footerTextWrap}>
            <Text style={styles.footerEyebrow}>Selected</Text>
            <Text numberOfLines={1} style={styles.footerName}>
              {selectedPlayer ? selectedPlayer.name : 'No player selected'}
            </Text>
          </View>

          {selectedPlayer ? (
            <View style={styles.footerStats}>
              <TinyStat
                label="ELO"
                value={selectedPlayer.preview.elo || 0}
                accent={getPlayerColor(selectedPlayer.color)}
              />
              <TinyStat label="Wins" value={selectedPlayer.preview.wins} />
              <TinyStat label="WR" value={`${selectedPlayer.preview.winRate}%`} />
            </View>
          ) : (
            <Text style={styles.footerHint}>Tap a card to continue</Text>
          )}
        </View>
      </View>
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

  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 18, 0.38)',
  },

  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 16, 30, 0.94)',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },

  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.brandTint,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.24)',
  },

  headerBadgeText: {
    color: COLORS.brandSoft,
    fontSize: 11,
    fontWeight: '900',
  },

  heroCard: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  heroTextWrap: {
    flex: 1,
    gap: 1,
  },

  eyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },

  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },

  continueButton: {
    minHeight: 38,
    minWidth: 72,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.08)',
  },

  continueButtonText: {
    color: COLORS.brand,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  continueButtonTextDisabled: {
    color: COLORS.textMuted,
  },

  gridCard: {
    flex: 1,
    minHeight: 0,
    borderRadius: 14,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
    justifyContent: 'space-between',
  },

  playerCard: {
    width: '48.5%',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 7,
  },

  playerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  playerMain: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },

  playerName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },

  playerMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
  },

  selectionDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
  },

  playerStatsRow: {
    flexDirection: 'row',
    gap: 6,
  },

  tinyStat: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  tinyStatLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  tinyStatValue: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 1,
  },

  footerCard: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },

  footerTextWrap: {
    gap: 1,
  },

  footerEyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  footerName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },

  footerHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  footerStats: {
    flexDirection: 'row',
    gap: 6,
  },
});