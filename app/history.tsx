import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Alert,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { loadCloudSnapshot } from '@/lib/cloud/loadCloudSnapshot';
import { loadRegisteredProfiles } from '@/lib/cloud/loadRegisteredProfiles';
import { loadStatsSnapshot } from '@/lib/cloud/loadStatsSnapshot';
import { deleteCompletedGame } from '@/lib/game-save/deleteCompletedGame';
import { formatSupabaseConfigError } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import Text from '@/components/ui/Text';
import { APP_ROUTES } from '@/utils/appRoutes';

import {
  getWinnerIdFromGame,
} from '@/utils/gameTotals';
import { mergeRegisteredProfilesIntoPlayers } from '@/utils/registeredProfilePlayer';

type Player = {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  startOrder?: number;
  [key: string]: unknown;
};

type PlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  objectivePrestige?: number;
};

type Round = {
  id?: string;
  playerId: string;
};

type StoredGame = {
  id?: string;
  hostProfileId?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  groupId?: string;
  groupName?: string;
  players?: any[];
  rounds?: Round[];
  timeline?: Round[];
  roundCount?: number;
  totals?: Record<string, PlayerTotals>;
  [key: string]: unknown;
};

type HistoryFilter = 'all' | 'group' | 'mine';
type HistorySort = 'newest' | 'oldest' | 'winner' | 'rounds';

const SUMMARY_ROUTE = '/summary';
const REPLAY_ROUTE = '/charts/replay';

const COLORS = {
  bg: '#081120',
  card: 'rgba(12,18,38,0.92)',
  cardAlt: 'rgba(16,24,48,0.95)',
  text: '#E2E8F0',
  sub: '#94A3B8',
  muted: '#64748B',
  accent: '#A855F7',
  accentSoft: 'rgba(168,85,247,0.18)',
  blue: '#3B82F6',
  blueSoft: 'rgba(59,130,246,0.18)',
  green: '#22C55E',
  greenSoft: 'rgba(34,197,94,0.16)',
  red: '#FB7185',
  redSoft: 'rgba(251,113,133,0.18)',
  border: 'rgba(255,255,255,0.08)',
  whiteSoft: 'rgba(255,255,255,0.06)',
  input: 'rgba(255,255,255,0.045)',
};

function formatDate(value?: number): string {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleString();
}

function normalizeHistoryId(value: unknown): string {
  return String(value ?? '').trim();
}

function isHistoryUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeHistoryId(value)
  );
}

function normalizeHistoryName(value: unknown): string {
  return String(value ?? '').trim();
}

function getWinnerId(game?: StoredGame): string | undefined {
  return getWinnerIdFromGame(game);
}

function getRoundsCount(game: StoredGame): number {
  if (typeof game?.roundCount === 'number' && Number.isFinite(game.roundCount)) {
    return game.roundCount;
  }
  if (Array.isArray(game?.rounds) && game.rounds.length > 0) return game.rounds.length;
  if (Array.isArray(game?.timeline) && game.timeline.length > 0) return game.timeline.length;
  return 0;
}

function getWinnerColor(game: StoredGame, players: Player[]): string {
  const winnerId = getWinnerId(game);
  const playerColor = players.find((p) => p.id === winnerId)?.color;
  return typeof playerColor === 'string' && playerColor.trim()
    ? playerColor
    : COLORS.accent;
}

function resolveHistoryPlayerId({
  players,
  authProfileId,
  authSessionUserId,
  authPlayerName,
  authDisplayName,
}: {
  players: Player[];
  authProfileId?: string | null;
  authSessionUserId?: string | null;
  authPlayerName?: string | null;
  authDisplayName?: string | null;
}) {
  for (const candidateId of [authProfileId, authSessionUserId]) {
    const normalizedCandidateId = normalizeHistoryId(candidateId);
    if (!normalizedCandidateId) continue;

    const matchedPlayer = players.find(
      (player) => normalizeHistoryId(player?.id) === normalizedCandidateId
    );
    if (matchedPlayer) {
      return normalizedCandidateId;
    }
  }

  for (const candidateName of [authPlayerName, authDisplayName]) {
    const normalizedCandidateName = normalizeHistoryName(candidateName).toLowerCase();
    if (!normalizedCandidateName) continue;

    const matchedPlayer = players.find(
      (player) => normalizeHistoryName(player?.name).toLowerCase() === normalizedCandidateName
    );
    if (matchedPlayer?.id) {
      return normalizeHistoryId(matchedPlayer.id);
    }
  }

  return '';
}

function gameIncludesPlayer(game: StoredGame, playerId: string) {
  const normalizedPlayerId = normalizeHistoryId(playerId);
  if (!normalizedPlayerId) return false;

  if (
    Array.isArray(game.players) &&
    game.players.some(
      (player) =>
        normalizeHistoryId((player as any)?.id ?? (player as any)?.playerId) === normalizedPlayerId
    )
  ) {
    return true;
  }

  if (
    Object.keys(game.totals ?? {}).some(
      (candidateId) => normalizeHistoryId(candidateId) === normalizedPlayerId
    )
  ) {
    return true;
  }

  if (
    Array.isArray(game.rounds) &&
    game.rounds.some((round) => normalizeHistoryId(round?.playerId) === normalizedPlayerId)
  ) {
    return true;
  }

  if (
    Array.isArray(game.timeline) &&
    game.timeline.some((round) => normalizeHistoryId(round?.playerId) === normalizedPlayerId)
  ) {
    return true;
  }

  return false;
}

function ScalePressable({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 28,
      bounciness: value === 1 ? 7 : 0,
    }).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}> 
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => animateTo(0.985)}
        onPressOut={() => animateTo(1)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function HistoryTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.historyTab} onPress={onPress}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[styles.historyTabText, active && styles.historyTabTextActive]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.historyTabUnderline,
          active && styles.historyTabUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();

  const authSession = useStore((s: any) => s.authSession);
  const authProfile = useStore((s: any) => s.authProfile);
  const rawPlayers = useStore((s: any) => s.players);
  const rawGames = useStore((s: any) => s.games);
  const hydrateCloudSnapshot = useStore((s: any) => s.hydrateCloudSnapshot);

  const players = useMemo<Player[]>(() => (Array.isArray(rawPlayers) ? rawPlayers : []), [rawPlayers]);
  const games = useMemo<StoredGame[]>(() => (Array.isArray(rawGames) ? rawGames : []), [rawGames]);
  const signedInPlayerId = useMemo(
    () =>
      resolveHistoryPlayerId({
        players,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authPlayerName: authProfile?.player_name,
        authDisplayName: authProfile?.display_name,
      }),
    [
      players,
      authProfile?.id,
      authProfile?.player_name,
      authProfile?.display_name,
      authSession?.user?.id,
    ]
  );

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historySort, setHistorySort] = useState<HistorySort>('newest');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();
  const [searchFocused, setSearchFocused] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);

  const availableHistoryGroups = useMemo(() => {
    const names = games
      .map((game) => String(game.groupName ?? '').trim())
      .filter((name) => name.length > 0);

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [games]);

  const displayedGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = [...games].filter((game) => {
      const isGroupGame = !!game.groupName;

      if (historyFilter === 'group' && !isGroupGame) return false;
      if (historyFilter === 'mine' && !gameIncludesPlayer(game, signedInPlayerId)) return false;
      if (
        historyFilter === 'group' &&
        selectedGroupName !== 'all' &&
        String(game.groupName ?? '').trim() !== selectedGroupName
      ) {
        return false;
      }

      if (!query) return true;

      const winnerId = getWinnerId(game);
      const winnerName = players.find((p) => p.id === winnerId)?.name?.toLowerCase() ?? '';
      const groupName = game.groupName?.toLowerCase() ?? '';
      const dateText = formatDate(game.createdAt).toLowerCase();
      const gameLabel = `game ${game.id ?? ''}`.toLowerCase();

      return (
        winnerName.includes(query) ||
        groupName.includes(query) ||
        dateText.includes(query) ||
        gameLabel.includes(query)
      );
    });

    filtered.sort((a, b) => {
      const aTime = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const bTime = typeof b.createdAt === 'number' ? b.createdAt : 0;
      const aWinner = players.find((p) => p.id === getWinnerId(a))?.name?.toLowerCase() ?? '';
      const bWinner = players.find((p) => p.id === getWinnerId(b))?.name?.toLowerCase() ?? '';
      const aRounds = getRoundsCount(a);
      const bRounds = getRoundsCount(b);

      switch (historySort) {
        case 'oldest':
          return aTime - bTime;
        case 'winner':
          return aWinner.localeCompare(bWinner) || bTime - aTime;
        case 'rounds':
          return bRounds - aRounds || bTime - aTime;
        case 'newest':
        default:
          return bTime - aTime;
      }
    });

    return filtered;
  }, [games, historyFilter, historySort, searchQuery, players, selectedGroupName, signedInPlayerId]);

  useEffect(() => {
    if (historyFilter !== 'group') {
      if (selectedGroupName !== 'all') setSelectedGroupName('all');
      return;
    }

    if (
      selectedGroupName !== 'all' &&
      !availableHistoryGroups.includes(selectedGroupName)
    ) {
      setSelectedGroupName('all');
    }
  }, [historyFilter, selectedGroupName, availableHistoryGroups]);

  useEffect(() => {
    if (displayedGames.length === 0) {
      if (selectedGameId) setSelectedGameId(undefined);
      return;
    }

    const selectedStillVisible = displayedGames.some(
      (game) => game.id && game.id === selectedGameId
    );

    if (!selectedStillVisible && selectedGameId) {
      setSelectedGameId(undefined);
    }
  }, [displayedGames, selectedGameId]);

  const handleDeleteGame = (game: StoredGame, index: number) => {
    const normalizedGameId = normalizeHistoryId(game?.id);
    const normalizedHostProfileId = normalizeHistoryId(game?.hostProfileId);
    const signedInProfileId = normalizeHistoryId(authSession?.user?.id);

    if (!normalizedGameId || !isHistoryUuid(normalizedGameId)) {
      Alert.alert(
        'Delete unavailable',
        'Only Supabase-saved games can be deleted from History now.'
      );
      return;
    }

    if (!signedInProfileId || !authSession?.user?.id) {
      Alert.alert('Login required', 'Log in before deleting a saved cloud game.');
      return;
    }

    const activeSession = authSession;

    if (!normalizedHostProfileId) {
      Alert.alert(
        'Delete unavailable',
        'This game is missing its cloud owner, so it cannot be deleted from Supabase here.'
      );
      return;
    }

    if (normalizedHostProfileId !== signedInProfileId) {
      Alert.alert(
        'Delete unavailable',
        'Only the host who saved this game can delete it from Supabase.'
      );
      return;
    }

    const winnerId = getWinnerId(game);
    const winnerName = players.find((p) => p.id === winnerId)?.name ?? 'Unknown';
    const label = `Game ${index + 1} • ${formatDate(game.createdAt)}`;

    Alert.alert(
      'Delete Game',
      `Delete this game permanently?\n\n${label}\nWinner: ${winnerName}\nRounds: ${getRoundsCount(
        game
      )}\n\nThis should remove it from history and all statistics.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (deletingGameId === normalizedGameId) return;

            void (async () => {
              setDeletingGameId(normalizedGameId);

              try {
                await deleteCompletedGame(normalizedGameId);

                if (selectedGameId === normalizedGameId) {
                  setSelectedGameId(undefined);
                }

                try {
                  const [snapshot, registeredProfiles] = await Promise.all([
                    loadCloudSnapshot(activeSession.user.id),
                    loadRegisteredProfiles().catch(() => []),
                  ]);
                  const statsSnapshot = await loadStatsSnapshot({
                    profileId: activeSession.user.id,
                    groups: snapshot.groups,
                    games: snapshot.games,
                  });

                  hydrateCloudSnapshot({
                    session: activeSession,
                    snapshot: {
                      ...snapshot,
                      players: mergeRegisteredProfilesIntoPlayers(
                        snapshot.players,
                        registeredProfiles,
                      ),
                    },
                    statsSnapshot,
                  });
                } catch (refreshError) {
                  console.error('Game deleted, but cloud refresh failed:', refreshError);
                  Alert.alert(
                    'Game deleted',
                    'The game was deleted from Supabase, but the local view could not refresh yet.'
                  );
                  return;
                }
              } catch (error) {
                console.error('Delete Game failed:', error);
                Alert.alert(
                  "Couldn't delete game",
                  formatSupabaseConfigError(error) || 'Something went wrong deleting the game.'
                );
              } finally {
                setDeletingGameId((current) =>
                  current === normalizedGameId ? null : current
                );
              }
            })();
          },
        },
      ]
    );
  };

  const handleOpenGameSummary = (game: StoredGame) => {
    if (!game?.id) {
      Alert.alert('Open unavailable', 'This game cannot be opened because it has no saved id.');
      return;
    }

    router.push({ pathname: SUMMARY_ROUTE as any, params: { gameId: game.id } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>History</Text>
              <Text style={styles.sectionSub}>Mission archive and game timeline</Text>
            </View>
            <Pressable
              onPress={() => router.push(APP_ROUTES.home)}
              style={styles.commandButton}
            >
              <Text style={styles.commandButtonText}>Back to Command</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Filter</Text>
            <Text style={styles.sectionSub}>{displayedGames.length} visible</Text>
          </View>

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by winner, group, or date"
            placeholderTextColor={COLORS.sub}
            style={[styles.input, searchFocused && styles.inputFocused]}
          />

          <View style={styles.historyTabRail}>
            <HistoryTab
              label="All"
              active={historyFilter === 'all'}
              onPress={() => setHistoryFilter('all')}
            />
            <HistoryTab
              label="Groups"
              active={historyFilter === 'group'}
              onPress={() => setHistoryFilter('group')}
            />
            <HistoryTab
              label="Include Me"
              active={historyFilter === 'mine'}
              onPress={() => setHistoryFilter('mine')}
            />
          </View>

          {historyFilter === 'group' ? (
            <View style={styles.groupFilterSection}>
              <Text style={styles.groupFilterLabel}>Group</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.underlineSelectorRow}
              >
                <TouchableOpacity
                  style={styles.underlineTabButton}
                  onPress={() => setSelectedGroupName('all')}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.underlineTabText,
                      selectedGroupName === 'all' && styles.underlineTabTextActive,
                    ]}
                  >
                    All Groups
                  </Text>
                  <View
                    style={[
                      styles.underlineTabLine,
                      selectedGroupName === 'all' && styles.underlineTabLineActive,
                    ]}
                  />
                </TouchableOpacity>

                {availableHistoryGroups.map((groupName) => {
                  const active = selectedGroupName === groupName;
                  return (
                    <TouchableOpacity
                      key={groupName}
                      style={styles.underlineTabButton}
                      onPress={() => setSelectedGroupName(groupName)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
                        {groupName}
                      </Text>
                      <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <Text style={styles.sectionSub}>Reorder the archive without leaving the main lane</Text>
          </View>

          <View style={styles.historyTabRail}>
            <HistoryTab
              label="Newest"
              active={historySort === 'newest'}
              onPress={() => setHistorySort('newest')}
            />
            <HistoryTab
              label="Oldest"
              active={historySort === 'oldest'}
              onPress={() => setHistorySort('oldest')}
            />
            <HistoryTab
              label="Winner"
              active={historySort === 'winner'}
              onPress={() => setHistorySort('winner')}
            />
            <HistoryTab
              label="Most Rounds"
              active={historySort === 'rounds'}
              onPress={() => setHistorySort('rounds')}
            />
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Game History</Text>
            <Text style={styles.sectionSub}>Tap a card to expand actions</Text>
          </View>

          {displayedGames.length === 0 ? (
            <Text style={styles.emptyText}>No matching mission logs. Try a different search or filter.</Text>
          ) : (
            <View style={styles.historyList}>
              {displayedGames.map((game, index) => {
                const winnerId = getWinnerId(game);
                const winnerName = players.find((p) => p.id === winnerId)?.name ?? 'Unknown';
                const gameKey = game.id ?? `${game.createdAt ?? 'game'}-${index}`;
                const accentColor = getWinnerColor(game, players);
                const rounds = getRoundsCount(game);
                const isSelected = !!game.id && game.id === selectedGameId;

                return (
                  <Swipeable
                    key={gameKey}
                    overshootRight={false}
                    renderRightActions={() => (
                      <View style={styles.swipeDeleteWrap}>
                        <ScalePressable onPress={() => handleDeleteGame(game, index)}>
                          <View style={styles.swipeDeleteAction}>
                            <Text style={styles.swipeDeleteText}>Delete</Text>
                          </View>
                        </ScalePressable>
                      </View>
                    )}
                  >
                    <ScalePressable
                      onPress={() => {
                        if (!game?.id) {
                          handleOpenGameSummary(game);
                          return;
                        }
                        setSelectedGameId((current) => (current === game.id ? undefined : game.id));
                      }}
                    >
                      <View style={[styles.leaderboardRow, isSelected && styles.leaderboardRowSelected]}>
                        <View style={[styles.gameCardAccent, { backgroundColor: accentColor }]} />

                        <View style={styles.leaderboardLeft}>
                          <View style={[styles.rankBadge, isSelected && styles.rankBadgeSelected]}>
                            <Text style={[styles.rankText, isSelected && styles.rankTextSelected]}>
                              {displayedGames.length - index}
                            </Text>
                          </View>

                          <View style={styles.gameInfoWrap}>
                            <Text style={styles.leaderboardName}>{winnerName}</Text>
                            <Text style={styles.leaderboardMeta}>
                              {rounds} round{rounds === 1 ? '' : 's'}
                              {game.groupName ? `   ${game.groupName}` : ''}
                            </Text>
                            <Text style={styles.gameDateText}>{formatDate(game.createdAt)}</Text>
                          </View>
                        </View>

                        <View style={styles.leaderboardRight}>
                          <Text style={[styles.statusText, isSelected && styles.statusTextActive]}>
                            {isSelected ? 'Selected' : 'Select'}
                          </Text>
                        </View>
                      </View>
                    </ScalePressable>

                    {isSelected ? (
                      <View style={styles.expandedCard}>
                        <Text style={styles.cardSummary}>
                          Winner confirmed{game.groupName ? ` in ${game.groupName}` : ''}.
                        </Text>

                        <View style={styles.metricGridDense}>
                          <ScalePressable style={styles.metricCardDense} onPress={() => handleOpenGameSummary(game)}>
                            <View style={[styles.actionCard, { backgroundColor: COLORS.accentSoft }]}> 
                              <Text style={styles.metricLabelCompact}>Open</Text>
                              <Text style={[styles.metricValueCompact, { color: COLORS.accent }]}>Summary</Text>
                            </View>
                          </ScalePressable>

                          <ScalePressable
                            style={styles.metricCardDense}
                            onPress={() => {
                              if (!game?.id) {
                                Alert.alert(
                                  'Replay unavailable',
                                  'This game cannot be replayed because it has no saved id.'
                                );
                                return;
                              }

                              router.push({
                                pathname: REPLAY_ROUTE as any,
                                params: {
                                  gameId: game.id,
                                  selectedGameId: game.id,
                                  source: 'history',
                                },
                              });
                            }}
                          >
                            <View style={[styles.actionCard, { backgroundColor: COLORS.blueSoft }]}> 
                              <Text style={styles.metricLabelCompact}>Open</Text>
                              <Text style={[styles.metricValueCompact, { color: COLORS.blue }]}>Replay</Text>
                            </View>
                          </ScalePressable>

                          <ScalePressable style={styles.metricCardDense} onPress={() => handleDeleteGame(game, index)}>
                            <View style={[styles.actionCard, { backgroundColor: COLORS.redSoft }]}> 
                              <Text style={styles.metricLabelCompact}>Remove</Text>
                              <Text style={[styles.metricValueCompact, { color: COLORS.red }]}>Delete</Text>
                            </View>
                          </ScalePressable>
                        </View>
                      </View>
                    ) : null}
                  </Swipeable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
    paddingBottom: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 6,
  },
  commandButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.26)',
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandButtonText: {
    color: '#EAF2FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: 'right',
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: COLORS.input,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: COLORS.blue,
  },
  historyTabRail: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    gap: 6,
  },
  historyTab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 6,
  },
  historyTabText: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  historyTabTextActive: {
    color: '#EAF2FF',
  },
  historyTabUnderline: {
    width: '100%',
    minWidth: 34,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  historyTabUnderlineActive: {
    backgroundColor: COLORS.blue,
  },
  underlineSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 8,
    alignItems: 'flex-end',
  },
  underlineTabButton: {
    paddingBottom: 2,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: '700',
  },
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  groupFilterSection: {
    marginTop: 8,
  },
  groupFilterLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  metricGridDense: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  metricCardDense: {
    width: '32%',
  },
  actionCard: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  historyList: {
    gap: 6,
  },
  swipeDeleteWrap: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  swipeDeleteAction: {
    minWidth: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: COLORS.redSoft,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.30)',
  },
  swipeDeleteText: {
    color: '#FECDD3',
    fontWeight: '900',
    fontSize: 12,
  },
  leaderboardRow: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardRowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  leaderboardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  rankText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  rankTextSelected: {
    color: COLORS.accent,
  },
  leaderboardName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 1,
  },
  leaderboardMeta: {
    color: COLORS.sub,
    fontSize: 10,
  },
  gameInfoWrap: {
    flex: 1,
  },
  gameDateText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },
  statusText: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextActive: {
    color: COLORS.accent,
  },
  gameCardAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 999,
  },
  expandedCard: {
    backgroundColor: COLORS.cardAlt,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -2,
    marginBottom: 4,
    padding: 8,
  },
  cardSummary: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 8,
  },
});
