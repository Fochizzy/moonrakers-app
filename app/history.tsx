import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Alert,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Easing,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Swipeable } from 'react-native-gesture-handler';

import { useStore } from '@/store/useStore';
import { importAndMergeBackup } from '../utils/csv/importCSV';
import { exportGamesToCSV } from '../utils/csv/exportCSV';
import Text from '@/components/ui/Text';

import {
  getWinnerIdFromGame,
  normalizeGameWithComputedTotals,
} from '@/utils/gameTotals';

type Player = {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  startOrder?: number;
  [key: string]: unknown;
};

type Group = {
  id: string;
  name: string;
  playerIds?: string[];
  members?: string[];
  createdAt?: number;
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

type HistoryFilter = 'all' | 'group' | 'solo';
type HistorySort = 'newest' | 'oldest' | 'winner' | 'rounds';

const LAST_BACKUP_AT_KEY = 'moonrakers_last_backup_at';
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

function SortTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.underlineMainTab} onPress={onPress} activeOpacity={0.9}>
      <Text style={[styles.underlineMainTabText, active && styles.underlineMainTabTextActive]}>
        {label}
      </Text>
      <View style={[styles.underlineMainTabLine, active && styles.underlineMainTabLineActive]} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();

  const rawPlayers = useStore((s: any) => s.players);
  const rawGroups = useStore((s: any) => s.groups);
  const rawGames = useStore((s: any) => s.games);
  const removeGame = useStore((s: any) => s.removeGame);
  const setPlayers = useStore((s: any) => s.setPlayers);
  const setGroups = useStore((s: any) => s.setGroups);
  const mergeImportedGames = useStore((s: any) => s.mergeImportedGames);

  const players = useMemo<Player[]>(() => (Array.isArray(rawPlayers) ? rawPlayers : []), [rawPlayers]);
  const groups = useMemo<Group[]>(() => (Array.isArray(rawGroups) ? rawGroups : []), [rawGroups]);
  const games = useMemo<StoredGame[]>(() => (Array.isArray(rawGames) ? rawGames : []), [rawGames]);

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historySort, setHistorySort] = useState<HistorySort>('newest');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFileName, setExportFileName] = useState('MoonrakersBackup.json');
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [fileNameFocused, setFileNameFocused] = useState(false);

  const backupPulse = useRef(new Animated.Value(0)).current;
  const successFlash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadLastBackup = async () => {
      try {
        const lastBackupRaw = await SecureStore.getItemAsync(LAST_BACKUP_AT_KEY);
        if (!lastBackupRaw) return;
        const parsed = Number(lastBackupRaw);
        if (Number.isFinite(parsed) && parsed > 0) {
          setLastBackup(parsed);
        }
      } catch (error) {
        console.error('Failed to load last backup timestamp', error);
      }
    };

    loadLastBackup();
  }, []);

  const triggerBackupSuccessEffects = () => {
    backupPulse.stopAnimation();
    successFlash.stopAnimation();

    backupPulse.setValue(0);
    successFlash.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(backupPulse, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(backupPulse, {
          toValue: 0.45,
          duration: 210,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(backupPulse, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(backupPulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.timing(successFlash, {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(successFlash, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

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
  }, [games, historyFilter, historySort, searchQuery, players, selectedGroupName]);

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

  const handleExportBackup = async () => {
    const trimmedName = exportFileName.trim();
    const normalizedFileName = trimmedName
      ? trimmedName.toLowerCase().endsWith('.json')
        ? trimmedName
        : `${trimmedName}.json`
      : 'MoonrakersBackup.json';

    Alert.alert('Please Confirm', 'Are you sure you want to export this backup?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Export',
        onPress: async () => {
          try {
            const fileUri = await exportGamesToCSV(
              {
                players,
                groups,
                games,
              },
              normalizedFileName
            );

            if (!fileUri) {
              Alert.alert('Export failed', 'Could not export backup.');
              return;
            }

            const now = Date.now();
            setLastBackup(now);
            await SecureStore.setItemAsync(LAST_BACKUP_AT_KEY, String(now));
            triggerBackupSuccessEffects();

            Alert.alert(
              'Export complete',
              `Backup exported successfully as ${normalizedFileName}.`
            );
          } catch (error: any) {
            console.error(error);
            Alert.alert('Export failed', error?.message ?? 'Could not export backup.');
          }
        },
      },
    ]);
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        Alert.alert('Import cancelled', 'No file was selected.');
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.name ?? 'backup';

      if (!fileUri) {
        throw new Error('Selected file does not have a readable URI.');
      }

      const fileText = await FileSystem.readAsStringAsync(fileUri);
      if (!fileText || !fileText.trim()) {
        throw new Error('The selected backup file is empty.');
      }

      const trimmed = fileText.trim();
      if (typeof importAndMergeBackup !== 'function') {
        throw new Error('Import helper is not exported correctly. Check ../utils/csv/importCSV.');
      }

      const merged = importAndMergeBackup(
        players as any[],
        groups as any[],
        trimmed,
        fileName,
        games as any[]
      );

      const mergedPlayers = Array.isArray(merged?.players) ? merged.players : [];
      const mergedGroups = Array.isArray(merged?.groups) ? merged.groups : [];
      const importedGames = Array.isArray(merged?.games)
        ? merged.games.map((game: any) => normalizeGameWithComputedTotals(game))
        : [];

      if (typeof setPlayers === 'function') setPlayers(mergedPlayers);
      if (typeof setGroups === 'function') setGroups(mergedGroups);
      if (typeof mergeImportedGames === 'function' && importedGames.length > 0) {
        mergeImportedGames(importedGames);
      }

      const playersLabel = `${mergedPlayers.length} player record${mergedPlayers.length === 1 ? '' : 's'}`;
      const groupsLabel = `${mergedGroups.length} group record${mergedGroups.length === 1 ? '' : 's'}`;
      const gamesLabel =
        importedGames.length > 0
          ? `, and ${importedGames.length} game${importedGames.length === 1 ? '' : 's'}`
          : '';

      Alert.alert(
        'Import complete',
        `Imported ${playersLabel}, ${groupsLabel}${gamesLabel} from ${fileName}.`
      );
    } catch (error: any) {
      console.error('Import failed', error);
      Alert.alert('Import failed', error?.message ?? 'Could not import backup.');
    }
  };

  const handleDeleteGame = (game: StoredGame, index: number) => {
    if (!game?.id || typeof removeGame !== 'function') {
      Alert.alert(
        'Delete unavailable',
        'This game cannot be removed because the store is missing removeGame or the game has no id.'
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
            if (selectedGameId === game.id) setSelectedGameId(undefined);
            removeGame(game.id);
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

  const backupGlowBorderColor = backupPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, 'rgba(59,130,246,0.50)'],
  });

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
            <Text style={styles.sectionTitle}>History</Text>
            <Text style={styles.sectionSub}>Mission archive and game timeline</Text>
          </View>
        </View>

        <Animated.View style={[styles.sectionCompact, styles.backupCompactSection, { borderColor: backupGlowBorderColor }]}> 
          <View style={styles.backupCompactTopRow}>
            <View style={styles.backupCompactTitleWrap}>
              <Text style={styles.sectionTitle}>Backup + Sync</Text>
              <Text style={styles.backupCompactMeta}>
                {lastBackup ? `Last ${new Date(lastBackup).toLocaleString()}` : 'No backup yet'}
              </Text>
            </View>

            <View style={styles.backupSegmentedControl}>
              <ScalePressable style={styles.backupSegmentWrap} onPress={handleExportBackup}>
                <View style={[styles.backupSegment, styles.backupSegmentLeft, styles.backupSegmentAccent]}> 
                  <Text style={[styles.backupSegmentText, { color: COLORS.accent }]}>Export</Text>
                </View>
              </ScalePressable>

              <ScalePressable style={styles.backupSegmentWrap} onPress={handleImportBackup}>
                <View style={[styles.backupSegment, styles.backupSegmentRight, styles.backupSegmentBlue]}> 
                  <Text style={[styles.backupSegmentText, { color: COLORS.blue }]}>Import</Text>
                </View>
              </ScalePressable>
            </View>
          </View>

          <TextInput
            value={exportFileName}
            onChangeText={setExportFileName}
            onFocus={() => setFileNameFocused(true)}
            onBlur={() => setFileNameFocused(false)}
            placeholder="MoonrakersBackup.json"
            placeholderTextColor={COLORS.sub}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.backupCompactInput, fileNameFocused && styles.inputFocused]}
          />
        </Animated.View>

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

          <View style={styles.underlineSelectorRow}>
            {(['all', 'group'] as HistoryFilter[]).map((filter) => {
              const active = historyFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={styles.underlineTabButton}
                  onPress={() => setHistoryFilter(filter)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
                    {filter === 'all' ? 'All' : 'Groups'}
                  </Text>
                  <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
                </TouchableOpacity>
              );
            })}
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

        <View style={styles.tabGrid}>
          <View style={styles.tabGridRowTwo}>
            <SortTab label="Newest" active={historySort === 'newest'} onPress={() => setHistorySort('newest')} />
            <SortTab label="Oldest" active={historySort === 'oldest'} onPress={() => setHistorySort('oldest')} />
          </View>
          <View style={styles.tabGridRowTwo}>
            <SortTab label="Winner" active={historySort === 'winner'} onPress={() => setHistorySort('winner')} />
            <SortTab label="Most Rounds" active={historySort === 'rounds'} onPress={() => setHistorySort('rounds')} />
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
  backupCompactSection: {
    paddingTop: 7,
    paddingBottom: 7,
  },
  backupCompactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  backupCompactTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  backupCompactMeta: {
    color: COLORS.sub,
    fontSize: 10,
    marginTop: 2,
  },
  backupSegmentedControl: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minWidth: 154,
  },
  backupSegmentWrap: {
    flex: 1,
  },
  backupSegment: {
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  backupSegmentLeft: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  backupSegmentRight: {
  },
  backupSegmentAccent: {
    backgroundColor: COLORS.accentSoft,
  },
  backupSegmentBlue: {
    backgroundColor: COLORS.blueSoft,
  },
  backupSegmentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  backupCompactInput: {
    marginBottom: 0,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
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
  tabGrid: {
    marginBottom: 6,
    gap: 8,
  },
  tabGridRowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  underlineMainTab: {
    flex: 1,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  underlineMainTabText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: '800',
  },
  underlineMainTabTextActive: {
    color: COLORS.accent,
  },
  underlineMainTabLine: {
    marginTop: 5,
    height: 3,
    width: '100%',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
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
