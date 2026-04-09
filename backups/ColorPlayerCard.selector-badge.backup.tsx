import React, { useMemo } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useStore } from '@/store/useStore';
import { calculateElo } from '@/utils/elo';
import { getPlayerColors } from '@/utils/colors';
import { buildPlayerIdentity } from '@/utils/playerIdentity';
import PlayerInitialBadge from '../components/player/PlayerInitialBadge';
import StarryNight from '@/components/ui/StarryNight';

type PlayerStats = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
  score?: number;
  wins?: number;
  gamesPlayed?: number;
};

type Player = {
  id?: string;
  name?: string;
  initials?: string;
  color?: string;
  elo?: number;
  prestige?: number;
  totalPrestige?: number;
  score?: number;
  wins?: number;
  gamesPlayed?: number;
  title?: string;
  subtitle?: string;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contractsSucceeded?: number;
  contractsFailed?: number;
  objectivesCompleted?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
  rank?: number;
  stats?: PlayerStats;
};

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  objectivePrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  contracts?: number;
  assists?: number;
  failures?: number;
  score?: number;
};

type Game = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, Totals>;
};

type CardProps = {
  player?: Player | null;
  isSelected?: boolean;
  onPress?: () => void;
};

const SHEET = require('@/assets/images/player-card-sheet.png');

type ResolvedPlayerStats = {
  totalPrestige: number;
  score: number;
  wins: number;
  gamesPlayed: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  contractsSucceeded: number;
  contractsFailed: number;
  objectivesCompleted: number;
  assists: number;
};

function getColorColumn(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'blue':
      return 0;
    case 'green':
      return 1;
    case 'purple':
      return 2;
    case 'orange':
      return 3;
    case 'yellow':
      return 4;
    default:
      return 2;
  }
}

function cropPosition(index: number) {
  return {
    row: Math.floor(index / 5),
    col: index % 5,
  };
}

function buildCardArtIndex(color?: string, seed = 0) {
  const column = getColorColumn(color);
  const row = Math.abs(seed) % 6;
  return row * 5 + column;
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
          position: 'absolute',
          width: width * 5,
          height: height * 6,
          left: -(col * width),
          top: -(row * height),
        }}
      />
    </View>
  );
}
function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function getInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function getPlayerIdentitySubtitle(player?: Partial<Player> | null) {
  if (!player) return 'No player data';
  if (typeof player.subtitle === 'string' && player.subtitle.trim()) {
    return player.subtitle.trim();
  }
  if (typeof player.title === 'string' && player.title.trim()) {
    return player.title.trim();
  }
  return `Callsign ${getInitials(player.name)}`;
}

function safeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getEfficiencyTier(value: number) {
  if (value >= 2) return 'Elite';
  if (value >= 1.5) return 'Strong';
  if (value >= 1) return 'Average';
  return 'Inefficient';
}

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getPlayerStat(player: Player, key: keyof PlayerStats) {
  const nested = player.stats?.[key];
  const direct = player[key as keyof Player] as unknown;
  return toNumber(nested ?? direct);
}

function getPlayerTotalPrestige(player: Player) {
  const explicit =
    player.stats?.totalPrestige ??
    player.totalPrestige ??
    player.stats?.prestige ??
    player.prestige;

  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  const direct = getPlayerStat(player, 'directPrestige');
  const assist = getPlayerStat(player, 'assistPrestigeReceived');
  return direct + assist;
}

function getTotalPrestige(totals?: Totals) {
  const direct = toNumber(totals?.directPrestige);
  const assist = toNumber(totals?.assistPrestigeReceived);
  const objective = toNumber(totals?.objectivePrestige);
  const explicit = totals?.totalPrestige ?? totals?.prestige;

  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return direct + assist + objective;
}

function resolvePlayerStats(player: Player | null, games: Game[]): ResolvedPlayerStats {
  if (!player?.id) {
    return {
      totalPrestige: 0,
      score: 0,
      wins: 0,
      gamesPlayed: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      contractsSucceeded: 0,
      contractsFailed: 0,
      objectivesCompleted: 0,
      assists: 0,
    };
  }

  let gameGamesPlayed = 0;
  let gameWins = 0;
  let gameTotalPrestige = 0;
  let gameDirectPrestige = 0;
  let gameAssistPrestigeReceived = 0;
  let gameObjectivesCompleted = 0;
  let gameTotalContracts = 0;
  let gameTotalAssists = 0;
  let gameTotalFailures = 0;
  let gameTotalScore = 0;

  for (const game of games) {
    const totals = game.totals?.[String(player.id)];
    if (!totals) continue;

    gameGamesPlayed += 1;

    const prestige = getTotalPrestige(totals);
    const direct = toNumber(totals.directPrestige);
    const objective = toNumber(totals.objectivePrestige);
    const assistReceived =
      typeof totals.assistPrestigeReceived === 'number' &&
      Number.isFinite(totals.assistPrestigeReceived)
        ? toNumber(totals.assistPrestigeReceived)
        : Math.max(0, prestige - direct - objective);

    const contracts = toNumber(totals.contracts);
    const assists = toNumber(totals.assists);
    const failures = toNumber(totals.failures);
    const score = toNumber(totals.score);

    gameTotalPrestige += prestige;
    gameDirectPrestige += direct;
    gameAssistPrestigeReceived += assistReceived;
    gameObjectivesCompleted += objective;
    gameTotalContracts += contracts;
    gameTotalAssists += assists;
    gameTotalFailures += failures;
    gameTotalScore += score;

    if (getWinnerId(game) === String(player.id)) {
      gameWins += 1;
    }
  }

  const savedGamesPlayed = getPlayerStat(player, 'gamesPlayed');
  const savedWins = getPlayerStat(player, 'wins');
  const savedTotalPrestige = getPlayerTotalPrestige(player);
  const savedDirectPrestige = getPlayerStat(player, 'directPrestige');
  const savedAssistPrestigeReceived = getPlayerStat(player, 'assistPrestigeReceived');
  const savedContracts = toNumber(player.contractsSucceeded) || getPlayerStat(player, 'contracts');
  const savedAssists = getPlayerStat(player, 'assists');
  const savedFailures = toNumber(player.contractsFailed) || getPlayerStat(player, 'failures');
  const savedScore = getPlayerStat(player, 'score');
  const savedObjectives = toNumber(player.objectivesCompleted);

  const totalPrestige =
    gameTotalPrestige > 0 ? gameTotalPrestige : savedTotalPrestige;

  const directPrestige =
    gameDirectPrestige > 0 ? gameDirectPrestige : savedDirectPrestige;

  const assistPrestigeReceived =
    gameAssistPrestigeReceived > 0
      ? gameAssistPrestigeReceived
      : savedAssistPrestigeReceived > 0
        ? savedAssistPrestigeReceived
        : Math.max(0, totalPrestige - directPrestige - gameObjectivesCompleted);

  const contractsSucceeded =
    gameTotalContracts > 0 ? gameTotalContracts : savedContracts;

  const assists =
    gameTotalAssists > 0 ? gameTotalAssists : savedAssists;

  const contractsFailed =
    gameTotalFailures > 0 ? gameTotalFailures : savedFailures;

  const score =
    gameTotalScore > 0 ? gameTotalScore : savedScore;

  const wins =
    gameWins > 0 || gameGamesPlayed > 0 ? gameWins : savedWins;

  const gamesPlayed =
    gameGamesPlayed > 0 ? gameGamesPlayed : savedGamesPlayed;

  const objectivesCompleted =
    gameObjectivesCompleted > 0 ? gameObjectivesCompleted : savedObjectives;

  return {
    totalPrestige,
    score,
    wins,
    gamesPlayed,
    directPrestige,
    assistPrestigeReceived,
    contractsSucceeded,
    contractsFailed,
    objectivesCompleted,
    assists,
  };
}

function buildEfficiencyStats(resolved: ResolvedPlayerStats) {
  const allEff = safeDivide(
    resolved.directPrestige + resolved.assistPrestigeReceived,
    resolved.contractsSucceeded + resolved.assists
  );

  const assistEff = safeDivide(
    resolved.assistPrestigeReceived,
    resolved.assists
  );

  const directEff = safeDivide(
    resolved.directPrestige,
    resolved.contractsSucceeded
  );

  return {
    allEff,
    assistEff,
    directEff,
    allTier: getEfficiencyTier(allEff),
    assistTier: getEfficiencyTier(assistEff),
    directTier: getEfficiencyTier(directEff),
  };
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View style={[styles.statTile, { borderColor: `${accent}22` }]}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={[styles.statTileValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PlayerCard({
  player,
  games,
  isSelected = false,
  onPress,
}: CardProps & { games: Game[] }) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const safePlayer = player ?? null;

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const palette = useMemo(() => {
    const raw = getPlayerColors?.(safePlayer?.color);

    return {
      base:
        safeString(raw?.base, '') ||
        safeString(safePlayer?.color, '') ||
        '#8B5CF6',
      text: safeString(raw?.text, '#F8FAFC'),
      background: safeString(raw?.background, '#0A1120'),
      border: safeString(raw?.border, 'rgba(148,163,184,0.16)'),
      muted: safeString(raw?.muted, '#94A3B8'),
      soft: safeString(raw?.soft, 'rgba(255,255,255,0.05)'),
    };
  }, [safePlayer?.color]);

  const accent = palette.base;
  const elo = Math.round(toNumber(safePlayer?.elo) || 1000);
  const rank = toNumber(safePlayer?.rank);

  const resolved = useMemo(
    () => resolvePlayerStats(safePlayer, games),
    [safePlayer, games]
  );

  const winRate =
    resolved.gamesPlayed > 0
      ? Math.round((resolved.wins / resolved.gamesPlayed) * 100)
      : 0;

  const eff = useMemo(() => buildEfficiencyStats(resolved), [resolved]);

  const identity = useMemo(() => {
    if (!safePlayer) {
      return {
        displayName: 'Unknown Player',
        subtitle: 'No player data',
      };
    }

    try {
      const built = buildPlayerIdentity(safePlayer);
      return {
        displayName:
          safeString((built as any)?.displayName, '') ||
          safeString(safePlayer.name, 'Unknown Player'),
        subtitle:
          safeString((built as any)?.subtitle, '') ||
          getPlayerIdentitySubtitle(safePlayer),
      };
    } catch {
      return {
        displayName: safeString(safePlayer.name, 'Unknown Player'),
        subtitle: getPlayerIdentitySubtitle(safePlayer),
      };
    }
  }, [safePlayer]);

  const displayName = safeString(identity.displayName, 'Unknown Player');
  const subtitle = safeString(identity.subtitle, 'No player data');
  const featuredStats = `${resolved.gamesPlayed} Games • ${resolved.wins} Wins • ${winRate}% WR`;

  const openPlayerProfile = () => {
    if (!safePlayer?.id) return;

    if (onPress) {
      onPress();
      return;
    }

    router.push({
      pathname: '/player-profile/[playerId]',
      params: { playerId: String(safePlayer.id) },
    });
  };

  const openCompare = () => {
    if (!safePlayer?.id) return;

    router.push({
      pathname: '/charts/compare',
      params: { playerId: String(safePlayer.id) },
    });
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={openPlayerProfile}
        onPressIn={() => {
          scale.value = withSpring(0.985, {
            damping: 18,
            stiffness: 220,
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {
            damping: 18,
            stiffness: 220,
          });
        }}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: isSelected ? `${accent}88` : palette.border,
              shadowColor: accent,
              backgroundColor: palette.background,
            },
            isSelected && styles.cardSelected,
            anim,
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.selectionOverlay,
              isSelected && styles.selectionOverlayVisible,
            ]}
          />

          <View style={[styles.topGlow, { backgroundColor: `${accent}16` }]} />
          <View style={[styles.sideGlow, { backgroundColor: `${accent}10` }]} />

          <View style={styles.gridLineHorizontal} />
          <View style={styles.gridLineVertical} />

          <View style={styles.headerRow}>
            <View style={styles.badgeShell}>
              <PlayerInitialBadge
                name={displayName}
                color={accent}
                size={58}
                initials={getInitials(displayName)}
              />
            </View>

            <View style={styles.headerTextWrap}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                  {displayName}
                </Text>

                {rank > 0 ? (
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        borderColor: `${accent}44`,
                        backgroundColor: `${accent}14`,
                      },
                    ]}
                  >
                    <Text style={[styles.rankBadgeText, { color: accent }]}>
                      #{rank}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[styles.subtitle, { color: palette.muted }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>

              <View
                style={[
                  styles.featuredStatRow,
                  {
                    borderColor: `${accent}24`,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  },
                ]}
              >
                <View style={[styles.featuredDot, { backgroundColor: accent }]} />
                <Text style={styles.featuredStatText} numberOfLines={1}>
                  {featuredStats}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.eloBanner,
              {
                borderColor: `${accent}30`,
                backgroundColor: `${accent}12`,
              },
            ]}
          >
            <View>
              <Text style={styles.eloLabel}>ELO RATING</Text>
              <Text style={[styles.eloValue, { color: accent }]}>{elo}</Text>
            </View>

            <View style={styles.eloMeta}>
              <Text style={styles.eloMetaLabel}>Prestige</Text>
              <Text style={[styles.eloMetaValue, { color: palette.text }]}>
                {resolved.totalPrestige}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Performance Snapshot</Text>
          </View>

          <View style={styles.grid}>
            <StatTile label="Score" value={resolved.score} accent={accent} />
            <StatTile label="Wins" value={resolved.wins} accent={accent} />
            <StatTile label="Win Rate" value={`${winRate}%`} accent={accent} />
            <StatTile label="Games" value={resolved.gamesPlayed} accent={accent} />
            <StatTile label="Objectives" value={resolved.objectivesCompleted} accent={accent} />
            <StatTile label="Direct" value={resolved.directPrestige} accent={accent} />
            <StatTile label="Assists" value={resolved.assistPrestigeReceived} accent={accent} />
            <StatTile
              label="Contracts"
              value={`${resolved.contractsSucceeded}-${resolved.contractsFailed}`}
              accent={accent}
            />
            <StatTile label="All Eff" value={eff.allEff.toFixed(2)} accent={accent} />
            <StatTile label="Assist Eff" value={eff.assistEff.toFixed(2)} accent={accent} />
            <StatTile label="Direct Eff" value={eff.directEff.toFixed(2)} accent={accent} />
            <StatTile label="Eff Tier" value={eff.allTier} accent={accent} />
          </View>
        </Animated.View>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={openPlayerProfile}
          style={[
            styles.actionButtonPrimary,
            {
              borderColor: `${accent}66`,
              backgroundColor: isSelected ? '#FFFFFF' : `${accent}16`,
            },
          ]}
        >
          <Text
            style={[
              styles.actionButtonPrimaryText,
              { color: isSelected ? accent : palette.text },
            ]}
          >
            Player Card
          </Text>
        </Pressable>

        <Pressable
          onPress={openCompare}
          style={[
            styles.actionButtonSecondary,
            {
              borderColor: `${accent}2A`,
              backgroundColor: 'rgba(255,255,255,0.04)',
            },
          ]}
        >
          <Text style={[styles.actionButtonSecondaryText, { color: palette.text }]}>
            Compare
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ColorPlayerCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as Player[];

  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as Game[];

  const selectedPlayerIdFromStore = useStore((s: any) => s?.selectedPlayerId);
  const setSelectedPlayerId = useStore((s: any) => s?.setSelectedPlayerId);

  const eloMap = useMemo(() => {
    try {
      return calculateElo(games as any) ?? {};
    } catch {
      return {};
    }
  }, [games]);

  const routePlayerId =
    typeof params.playerId === 'string'
      ? params.playerId
      : Array.isArray(params.playerId) && typeof params.playerId[0] === 'string'
        ? params.playerId[0]
        : null;

  const effectivePlayerId =
    routePlayerId ||
    (typeof selectedPlayerIdFromStore === 'string' && selectedPlayerIdFromStore.trim()
      ? selectedPlayerIdFromStore
      : null) ||
    (players[0]?.id ? String(players[0].id) : null);

  const selectedPlayer = useMemo(
    () => players.find((p) => String(p.id) === String(effectivePlayerId)) ?? null,
    [players, effectivePlayerId]
  );

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => {
        const resolved = resolvePlayerStats(player, games);

        return {
          ...player,
          totalPrestige: resolved.totalPrestige,
          score: resolved.score,
          wins: resolved.wins,
          gamesPlayed: resolved.gamesPlayed,
          directPrestige: resolved.directPrestige,
          assistPrestigeReceived: resolved.assistPrestigeReceived,
          contractsSucceeded: resolved.contractsSucceeded,
          contractsFailed: resolved.contractsFailed,
          objectivesCompleted: resolved.objectivesCompleted,
          assists: resolved.assists,
          elo: Math.round(eloMap[String(player.id)] ?? 1000),
        };
      })
      .sort((a, b) => {
        if ((b.elo ?? 0) !== (a.elo ?? 0)) return (b.elo ?? 0) - (a.elo ?? 0);
        if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
        if ((b.totalPrestige ?? 0) !== (a.totalPrestige ?? 0)) {
          return (b.totalPrestige ?? 0) - (a.totalPrestige ?? 0);
        }
        return String(a.name ?? '').localeCompare(String(b.name ?? ''));
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));
  }, [players, games, eloMap]);

  const rankedSelectedPlayer = useMemo(
    () =>
      rankedPlayers.find((p) => String(p.id) === String(selectedPlayer?.id)) ??
      selectedPlayer,
    [rankedPlayers, selectedPlayer]
  );

  const handleSelectPlayer = (playerId: string) => {
    if (typeof setSelectedPlayerId === 'function') {
      setSelectedPlayerId(playerId);
    }

    router.replace({
      pathname: '/ColorPlayerCard',
      params: { playerId: String(playerId) },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenEyebrow}>Pilot Registry</Text>
          <Text style={styles.screenTitle}>Player Card</Text>
          <Text style={styles.screenSubtitle}>
            Pick which player card to inspect. The selected player now drives this
            screen.
          </Text>
        </View>

        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No players found</Text>
            <Text style={styles.emptyStateText}>
              Add a player first so the card has data to display.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.selectorShell}>
              <Text style={styles.selectorLabel}>Select Player</Text>

              <View style={styles.selectorRow}>
                {rankedPlayers.map((player) => {
                  const active = String(player.id) === String(rankedSelectedPlayer?.id);
                  const accent = safeString(player.color, '#8B5CF6');

                  return (
                    <Pressable
                      key={String(player.id)}
                      onPress={() => handleSelectPlayer(String(player.id))}
                      style={[
                        styles.selectorPill,
                        active && {
                          borderColor: `${accent}88`,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          active && styles.selectorPillTextActive,
                        ]}
                      >
                        {safeString(player.name, 'Unknown')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <PlayerCard
              player={rankedSelectedPlayer}
              games={games}
              isSelected
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#081120',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  screenContent: {
    padding: 16,
    paddingBottom: 28,
  },
  screenHeader: {
    marginBottom: 14,
  },
  screenEyebrow: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  screenTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
  },
  screenSubtitle: {
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  selectorShell: {
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(10,16,32,0.76)',
    padding: 12,
  },
  selectorLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorPill: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorPillText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  selectorPillTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(10,16,32,0.76)',
    padding: 16,
  },
  emptyStateTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyStateText: {
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 13,
  },
  wrapper: {
    marginBottom: 18,
  },
  pressable: {},
  card: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 390,
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.26,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  cardSelected: {
    borderWidth: 1.5,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0)',
  },
  selectionOverlayVisible: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  topGlow: {
    position: 'absolute',
    top: -45,
    right: -25,
    width: 190,
    height: 190,
    borderRadius: 999,
  },
  sideGlow: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
  },
  gridLineHorizontal: {
    position: 'absolute',
    top: 118,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 76,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    zIndex: 1,
  },
  badgeShell: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  rankBadge: {
    minWidth: 54,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '600',
  },
  featuredStatRow: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  featuredStatText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  eloBanner: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eloLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  eloValue: {
    marginTop: 4,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
  },
  eloMeta: {
    alignItems: 'flex-end',
  },
  eloMetaLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  eloMetaValue: {
    marginTop: 6,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionHeaderText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '31.5%',
    minWidth: 92,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statTileLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statTileValue: {
    marginTop: 7,
    fontSize: 18,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionButtonPrimaryText: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  actionButtonSecondaryText: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});



