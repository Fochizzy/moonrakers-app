import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppStatusBanner from '@/components/status/AppStatusBanner';
import {
  useAuthSession,
  useAuthProfile,
  useGames,
  usePlayers,
  useHydrateCloudSnapshot,
} from '@/store/useStore';
import ActionButton from '@/components/ui/ActionButton';
import EmptyStateCard from '@/components/ui/EmptyStateCard';
import HeroCard from '@/components/ui/HeroCard';
import PageShell from '@/components/ui/PageShell';
import SectionCard from '@/components/ui/SectionCard';
import Text from '@/components/ui/Text';
import { useHistoryDataManager } from '@/lib/history/useHistoryDataManager';
import { deleteCompletedGame } from '@/lib/game-save/deleteCompletedGame';
import { loadHydratedCloudState } from '@/lib/cloud/loadHydratedCloudState';
import { importBackupFromPicker } from '@/lib/migration/importBackupFromPicker';
import { APP_ROUTES, buildSummaryRoute } from '@/utils/appRoutes';

import {
  getWinnerIdFromGame,
} from '@/utils/gameTotals';
import { COLORS } from '@/utils/colors';
import { formatDate } from '@/utils/formatters';
import ScalePressable from '@/components/ui/ScalePressable';

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
  const params = useLocalSearchParams<{ intent?: string | string[] }>();

  const authSession = useAuthSession();
  const authProfile = useAuthProfile();
  const rawPlayers = usePlayers();
  const rawGames = useGames();
  const hydrateCloudSnapshot = useHydrateCloudSnapshot();
  const importIntent =
    String(Array.isArray(params.intent) ? params.intent[0] : params.intent ?? '')
      .trim()
      .toLowerCase() === 'import';

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
  const {
    importingBackup,
    deletingGameId,
    status: historyStatus,
    clearStatus: clearHistoryStatus,
    importBackup,
    removeGame,
  } = useHistoryDataManager({
    authSession,
    authProfile,
    hydrateCloudSnapshot,
  });

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
              try {
                await deleteCompletedGame(normalizedGameId);

                if (selectedGameId === normalizedGameId) {
                  setSelectedGameId(undefined);
                }

                const hydratedSnapshot = await loadHydratedCloudState(activeSession as any);
                hydrateCloudSnapshot(hydratedSnapshot);
              } catch (error) {
                console.error('Delete Game failed:', error);
                Alert.alert(
                  "Couldn't delete game",
                  error instanceof Error
                    ? error.message
                    : 'Something went wrong deleting the game.'
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

    router.push(buildSummaryRoute(game.id) as any);
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1 }}>
    <PageShell density="compact">
      <HeroCard
        eyebrow="History"
        title="Mission Archive"
        subtitle="Game timeline and mission logs"
        size="compact"
        headerAction={
          <ActionButton
            variant="ghost"
            title="Back to Command"
            onPress={() => router.push(APP_ROUTES.home)}
            style={styles.backButton}
          />
        }
      />

      <AppStatusBanner
        status={historyStatus}
        onDismiss={historyStatus ? clearHistoryStatus : null}
      />

      <SectionCard
        title="Backup Center"
        subtitle="Import older Moonrakers backups into this cloud profile"
        style={importIntent ? styles.sectionHighlighted : undefined}
      >
        <ActionButton
          title={importingBackup ? 'Importing...' : 'Import backup'}
          subtitle="Merge a local JSON backup into this signed-in profile"
          onPress={() => {
            void importBackupFromPicker({
              signedInProfileId: authSession?.user?.id ?? '',
              signedInPlayerName: authProfile?.player_name ?? '',
              resolvedProfilesByName: {},
            }).then(() => importBackup()).catch((error) => {
              Alert.alert(
                'Import failed',
                error instanceof Error
                  ? error.message
                  : 'Something went wrong while importing that backup.',
              );
            });
          }}
          disabled={importingBackup}
        />
        <Text style={styles.backupCenterNote}>
          Best for older local backup files you want reflected in History, Charts, and Stats.
        </Text>
      </SectionCard>

      <SectionCard title="Filter" subtitle={`${displayedGames.length} visible`}>
        <View style={styles.searchWrap}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by winner, group, or date"
            placeholderTextColor={COLORS.sub}
            style={[styles.input, searchFocused && styles.inputFocused, searchQuery.length > 0 && styles.inputWithClear]}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [styles.searchClear, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

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
              <Pressable
                style={({ pressed }) => [styles.underlineTabButton, pressed && { opacity: 0.9 }]}
                onPress={() => setSelectedGroupName('all')}
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
              </Pressable>

              {availableHistoryGroups.map((groupName) => {
                const active = selectedGroupName === groupName;
                return (
                  <Pressable
                    key={groupName}
                    style={({ pressed }) => [styles.underlineTabButton, pressed && { opacity: 0.9 }]}
                    onPress={() => setSelectedGroupName(groupName)}
                  >
                    <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
                      {groupName}
                    </Text>
                    <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Sort By" subtitle="Reorder the archive without leaving the main lane">
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
      </SectionCard>

      <SectionCard title="Game History" subtitle="Tap a card to expand actions">
        {displayedGames.length === 0 ? (
            <EmptyStateCard
              message="No matching mission logs."
              hint="Try a different search or filter, or import a backup to populate history."
            />
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
                          <View style={styles.chevronWrap}>
                            <Text style={[styles.chevronText, isSelected && styles.chevronTextActive]}>
                              {isSelected ? '▴' : '▾'}
                            </Text>
                          </View>
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
                                pathname: APP_ROUTES.replay as any,
                                params: {
                                  gameId: game.id,
                                  selectedGameId: game.id,
                                  source: 'history',
                                },
                              });
                            }}
                          >
                            <View style={[styles.actionCard, { backgroundColor: COLORS.blueSoft }]}>
                              <Text style={[styles.metricValueCompact, { color: COLORS.blue }]}>Replay</Text>
                            </View>
                          </ScalePressable>

                          <ScalePressable style={styles.metricCardDense} onPress={() => handleDeleteGame(game, index)}>
                            <View style={[styles.actionCard, { backgroundColor: COLORS.redSoft }]}>
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
      </SectionCard>
    </PageShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
  },
  sectionHighlighted: {
    borderColor: 'rgba(168,85,247,0.48)',
  },
  backupCenterNote: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 8,
  },
  searchWrap: {
    position: 'relative',
    marginBottom: 8,
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
  },
  inputWithClear: {
    paddingRight: 36,
  },
  searchClear: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: '800',
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
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: '900',
  },
  chevronTextActive: {
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
