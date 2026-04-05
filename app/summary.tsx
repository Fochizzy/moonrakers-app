import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import { useStore } from '@/store/useStore';
import {
  getResolvedTotalsForPlayer,
  getWinnerIdFromGame,
} from '@/utils/gameTotals';

type Player = {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  startOrder?: number;
};

type PlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  objectivePrestige?: number;
  efficiency?: number;
  performance?: number;
};

type RoundLike = {
  id?: string;
  playerId?: string;
  prestige?: number;
  score?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
  objectivePrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  turnOrder?: number;
  roundNumber?: number;
  [key: string]: any;
};

type StoredGame = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  groupId?: string;
  groupName?: string;
  players?: Array<{
    id: string;
    name?: string;
    color?: string;
    initials?: string;
    startOrder?: number;
  }>;
  rounds?: RoundLike[];
  timeline?: RoundLike[];
  roundCount?: number;
  totals?: Record<string, PlayerTotals>;
};

function toNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function formatDate(value?: number): string {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleString();
}

function getWinnerId(game?: StoredGame): string | undefined {
  return getWinnerIdFromGame(game);
}

function getRoundsCount(game?: StoredGame): number {
  if (!game) return 0;

  if (
    typeof game.roundCount === 'number' &&
    Number.isFinite(game.roundCount)
  ) {
    return game.roundCount;
  }

  if (Array.isArray(game.rounds) && game.rounds.length > 0) {
    return game.rounds.length;
  }

  if (Array.isArray(game.timeline) && game.timeline.length > 0) {
    return game.timeline.length;
  }

  return 0;
}

function getPlayerName(
  playerId: string | undefined,
  gamePlayers: Array<{ id: string; name?: string }> | undefined,
  allPlayers: Player[]
): string {
  if (!playerId) return 'Unknown';

  const fromGame = gamePlayers?.find((p) => p.id === playerId)?.name;
  if (fromGame) return fromGame;

  const fromStore = allPlayers.find((p) => p.id === playerId)?.name;
  if (fromStore) return fromStore;

  return 'Unknown';
}

function getPlayerColor(
  playerId: string | undefined,
  gamePlayers: Array<{ id: string; color?: string }> | undefined,
  allPlayers: Player[]
): string {
  if (!playerId) return '#A855F7';

  const fromGame = gamePlayers?.find((p) => p.id === playerId)?.color;
  if (fromGame) return fromGame;

  const fromStore = allPlayers.find((p) => p.id === playerId)?.color;
  if (fromStore) return fromStore;

  return '#A855F7';
}

function getTotalPrestige(totals?: PlayerTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    toNumber(totals?.directPrestige) +
    toNumber(totals?.assistPrestigeReceived) +
    toNumber(totals?.objectivePrestige)
  );
}

function buildReplayRows(game?: StoredGame) {
  if (!game) return [];

  const source = Array.isArray(game.timeline) && game.timeline.length > 0
    ? game.timeline
    : Array.isArray(game.rounds)
      ? game.rounds
      : [];

  return source.map((item, index) => ({
    key: item?.id ?? `turn-${index}`,
    step: index + 1,
    playerId: item?.playerId,
    directPrestige: toNumber(
      item?.directPrestige ?? item?.prestige ?? item?.score
    ),
    assistPrestige: toNumber(item?.assistPrestigeReceived),
    objectivePrestige: toNumber(item?.objectivePrestige),
    contracts: toNumber(item?.contracts),
    assists: toNumber(item?.assists),
    failures: toNumber(item?.failures),
    turnOrder: toNumber(item?.turnOrder),
    roundNumber: toNumber(item?.roundNumber),
  }));
}

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string }>();

  const rawPlayers = useStore((s: any) => s.players);
  const rawGames = useStore((s: any) => s.games);

  const players = useMemo<Player[]>(
    () => (Array.isArray(rawPlayers) ? rawPlayers : []),
    [rawPlayers]
  );

  const games = useMemo<StoredGame[]>(
    () => (Array.isArray(rawGames) ? rawGames : []),
    [rawGames]
  );

  const game = useMemo(() => {
    if (!params?.gameId) return undefined;
    return games.find((g) => g?.id === params.gameId);
  }, [games, params?.gameId]);

  const winnerId = useMemo(() => getWinnerId(game), [game]);

  const winnerName = useMemo(
    () => getPlayerName(winnerId, game?.players, players),
    [winnerId, game?.players, players]
  );

  const roundsCount = useMemo(() => getRoundsCount(game), [game]);

  const rankedPlayers = useMemo(() => {
    if (!game?.players?.length) return [];

    return [...game.players]
      .map((gp) => {
        const totals = getResolvedTotalsForPlayer(game as any, gp.id) as PlayerTotals;

        return {
          id: gp.id,
          name: getPlayerName(gp.id, game.players, players),
          color: getPlayerColor(gp.id, game.players, players),
          totalPrestige: getTotalPrestige(totals),
          directPrestige: toNumber(totals?.directPrestige),
          assistPrestigeReceived: toNumber(totals?.assistPrestigeReceived),
          assistPrestigeSent: toNumber(totals?.assistPrestigeSent),
          objectivePrestige: toNumber(totals?.objectivePrestige),
          score: toNumber(totals?.score),
          assists: toNumber(totals?.assists),
          failures: toNumber(totals?.failures),
          contracts: toNumber(totals?.contracts),
          efficiency: toNumber(totals?.efficiency),
          performance: toNumber(totals?.performance),
        };
      })
      .sort((a, b) => {
        if (b.totalPrestige !== a.totalPrestige) {
          return b.totalPrestige - a.totalPrestige;
        }
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      });
  }, [game, players]);

  const replayRows = useMemo(() => buildReplayRows(game), [game]);

  const topPerformer = rankedPlayers[0];
  const mostContracts = [...rankedPlayers].sort((a, b) => b.contracts - a.contracts)[0];
  const mostAssists = [...rankedPlayers].sort((a, b) => b.assists - a.assists)[0];

  if (!params?.gameId) {
    return (
      <View style={styles.root}>
        <StarryNight />
        <View style={styles.centered}>
          <Text style={styles.appHeader}>Moonrakers</Text>
          <Text style={styles.emptyTitle}>No game selected</Text>
          <Text style={styles.emptySubtitle}>
            Open this screen from History by tapping a saved game.
          </Text>
          <Pressable style={styles.backPill} onPress={() => router.back()}>
            <Text style={styles.backPillText}>← Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.root}>
        <StarryNight />
        <View style={styles.centered}>
          <Text style={styles.appHeader}>Moonrakers</Text>
          <Text style={styles.emptyTitle}>Game not found</Text>
          <Text style={styles.emptySubtitle}>
            That saved game could not be found in the current store.
          </Text>
          <Pressable style={styles.backPill} onPress={() => router.back()}>
            <Text style={styles.backPillText}>← Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StarryNight />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.appHeader}>Moonrakers</Text>
          <Text style={styles.heroTitle}>Game Summary</Text>
          <Text style={styles.heroSubtitle}>
            Review the final standings, detailed totals, and replay flow.
          </Text>
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.backPill} onPress={() => router.back()}>
            <Text style={styles.backPillText}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Saved Game</Text>
            </View>
          </View>

          <View style={styles.overviewHeader}>
            <View style={styles.overviewTextWrap}>
              <Text style={styles.overviewGameName}>Completed Match</Text>
              <Text style={styles.overviewDate}>{formatDate(game.createdAt)}</Text>
            </View>

            <View style={styles.winnerChip}>
              <Text style={styles.winnerChipLabel}>Winner</Text>
              <Text style={styles.winnerChipValue}>{winnerName}</Text>
            </View>
          </View>

          <View style={styles.summaryStatRow}>
            <View style={styles.summaryStatCard}>
              <Text style={styles.summaryStatLabel}>Players</Text>
              <Text style={styles.summaryStatValue}>{game.players?.length ?? 0}</Text>
            </View>

            <View style={styles.summaryStatCard}>
              <Text style={styles.summaryStatLabel}>Rounds</Text>
              <Text style={styles.summaryStatValue}>{roundsCount}</Text>
            </View>
          </View>

          {game.groupName ? (
            <View style={styles.groupTag}>
              <Text style={styles.groupTagText}>Group: {game.groupName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Quick View</Text>
            </View>
          </View>

          <View style={styles.highlightsGrid}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Top Prestige</Text>
              <Text style={styles.highlightValue}>
                {topPerformer?.name ?? '—'}
              </Text>
              <Text style={styles.highlightMeta}>
                {topPerformer ? `${topPerformer.totalPrestige} prestige` : 'No data'}
              </Text>
            </View>

            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Most Contracts</Text>
              <Text style={styles.highlightValue}>
                {mostContracts?.name ?? '—'}
              </Text>
              <Text style={styles.highlightMeta}>
                {mostContracts ? `${mostContracts.contracts} contracts` : 'No data'}
              </Text>
            </View>

            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Most Assists</Text>
              <Text style={styles.highlightValue}>
                {mostAssists?.name ?? '—'}
              </Text>
              <Text style={styles.highlightMeta}>
                {mostAssists ? `${mostAssists.assists} assists` : 'No data'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Final Standings</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rankedPlayers.length}</Text>
            </View>
          </View>

          <View style={styles.rankList}>
            {rankedPlayers.map((player, index) => (
              <View key={player.id} style={styles.rankCard}>
                <View
                  style={[
                    styles.rankAccent,
                    { backgroundColor: player.color || '#A855F7' },
                  ]}
                />

                <View style={styles.rankTopRow}>
                  <View style={styles.rankIdentity}>
                    <View style={styles.rankBubble}>
                      <Text style={styles.rankBubbleText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.rankTextWrap}>
                      <Text style={styles.rankName}>{player.name}</Text>
                      <Text style={styles.rankMeta}>
                        {player.totalPrestige} total prestige
                      </Text>
                    </View>
                  </View>

                  {winnerId === player.id ? (
                    <View style={styles.smallWinnerPill}>
                      <Text style={styles.smallWinnerPillText}>Winner</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Direct</Text>
                    <Text style={styles.metricValue}>{player.directPrestige}</Text>
                  </View>

                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Assist In</Text>
                    <Text style={styles.metricValue}>
                      {player.assistPrestigeReceived}
                    </Text>
                  </View>

                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Objectives</Text>
                    <Text style={styles.metricValue}>
                      {player.objectivePrestige}
                    </Text>
                  </View>

                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Contracts</Text>
                    <Text style={styles.metricValue}>{player.contracts}</Text>
                  </View>

                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Assists</Text>
                    <Text style={styles.metricValue}>{player.assists}</Text>
                  </View>

                  <View style={styles.metricPill}>
                    <Text style={styles.metricLabel}>Failures</Text>
                    <Text style={styles.metricValue}>{player.failures}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Replay Flow</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{replayRows.length} Turns</Text>
            </View>
          </View>

          {replayRows.length === 0 ? (
            <Text style={styles.emptyInlineText}>
              No timeline data is available for this saved game yet.
            </Text>
          ) : (
            <View style={styles.replayList}>
              {replayRows.map((row) => {
                const playerName = getPlayerName(row.playerId, game.players, players);
                const playerColor = getPlayerColor(row.playerId, game.players, players);

                return (
                  <View key={row.key} style={styles.replayCard}>
                    <View
                      style={[
                        styles.replayAccent,
                        { backgroundColor: playerColor || '#A855F7' },
                      ]}
                    />

                    <View style={styles.replayHeader}>
                      <View>
                        <Text style={styles.replayTitle}>
                          Turn {row.step} · {playerName}
                        </Text>
                        <Text style={styles.replaySubtitle}>
                          {row.roundNumber > 0
                            ? `Round ${row.roundNumber}`
                            : 'Timeline entry'}
                        </Text>
                      </View>

                      <View style={styles.turnChip}>
                        <Text style={styles.turnChipText}>+{row.directPrestige}</Text>
                      </View>
                    </View>

                    <View style={styles.replayMetrics}>
                      <View style={styles.replayMetricPill}>
                        <Text style={styles.replayMetricLabel}>Direct</Text>
                        <Text style={styles.replayMetricValue}>
                          {row.directPrestige}
                        </Text>
                      </View>

                      <View style={styles.replayMetricPill}>
                        <Text style={styles.replayMetricLabel}>Assist</Text>
                        <Text style={styles.replayMetricValue}>
                          {row.assistPrestige}
                        </Text>
                      </View>

                      <View style={styles.replayMetricPill}>
                        <Text style={styles.replayMetricLabel}>Objective</Text>
                        <Text style={styles.replayMetricValue}>
                          {row.objectivePrestige}
                        </Text>
                      </View>

                      <View style={styles.replayMetricPill}>
                        <Text style={styles.replayMetricLabel}>Contracts</Text>
                        <Text style={styles.replayMetricValue}>
                          {row.contracts}
                        </Text>
                      </View>

                      <View style={styles.replayMetricPill}>
                        <Text style={styles.replayMetricLabel}>Assists</Text>
                        <Text style={styles.replayMetricValue}>
                          {row.assists}
                        </Text>
                      </View>

                      <View style={styles.replayMetricPill}>
                        <Text style={styles.replayMetricLabel}>Failures</Text>
                        <Text style={styles.replayMetricValue}>
                          {row.failures}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => router.back()}
            >
              <Text style={styles.actionButtonText}>Back to History</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() =>
                Alert.alert(
                  'Replay graph',
                  'This page is ready for your replay graph component. Plug it into the Replay Flow section or replace it with your chart view.'
                )
              }
            >
              <Text style={styles.actionButtonText}>Replay Graph</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#081120',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: '#081120',
  },

  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
  },

  appHeader: {
    color: '#A855F7',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(168, 85, 247, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },

  heroTitle: {
    color: '#F5F3FF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  heroSubtitle: {
    color: '#B8C2D9',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },

  emptyTitle: {
    color: '#F5F3FF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptySubtitle: {
    color: '#B8C2D9',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },

  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  backPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
  },

  backPillText: {
    color: '#D8B4FE',
    fontWeight: '900',
    fontSize: 13,
  },

  section: {
    backgroundColor: 'rgba(13, 20, 38, 0.88)',
    borderRadius: 22,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#F5F3FF',
    fontWeight: '900',
    fontSize: 18,
  },

  badge: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: '#D8B4FE',
    fontSize: 12,
    fontWeight: '900',
  },

  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  overviewTextWrap: {
    flex: 1,
    gap: 4,
  },

  overviewGameName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },

  overviewDate: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '700',
  },

  winnerChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.30)',
    alignSelf: 'flex-start',
    minWidth: 92,
  },

  winnerChipLabel: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  winnerChipValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  summaryStatRow: {
    flexDirection: 'row',
    gap: 10,
  },

  summaryStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(9, 15, 31, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    gap: 4,
  },

  summaryStatLabel: {
    color: '#8EA3C7',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  summaryStatValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },

  groupTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.22)',
  },

  groupTagText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '800',
  },

  highlightsGrid: {
    gap: 10,
  },

  highlightCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    gap: 4,
  },

  highlightLabel: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  highlightValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },

  highlightMeta: {
    color: '#B8C2D9',
    fontSize: 12,
    fontWeight: '700',
  },

  rankList: {
    gap: 12,
  },

  rankCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.18)',
    gap: 12,
  },

  rankAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    opacity: 0.95,
  },

  rankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  rankIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  rankBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.28)',
  },

  rankBubbleText: {
    color: '#F5F3FF',
    fontWeight: '900',
    fontSize: 12,
  },

  rankTextWrap: {
    flex: 1,
  },

  rankName: {
    color: '#F8FAFC',
    fontWeight: '900',
    fontSize: 15,
  },

  rankMeta: {
    color: '#B8C2D9',
    marginTop: 2,
    fontWeight: '700',
    fontSize: 12,
  },

  smallWinnerPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.24)',
  },

  smallWinnerPillText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '900',
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  metricPill: {
    width: '31%',
    minWidth: 96,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(9, 15, 31, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    gap: 3,
  },

  metricLabel: {
    color: '#8EA3C7',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  metricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  replayList: {
    gap: 12,
  },

  replayCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.16)',
    gap: 12,
  },

  replayAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  replayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },

  replayTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
  },

  replaySubtitle: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  turnChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.30)',
  },

  turnChipText: {
    color: '#E9D5FF',
    fontWeight: '900',
    fontSize: 12,
  },

  replayMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  replayMetricPill: {
    width: '31%',
    minWidth: 96,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(9, 15, 31, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    gap: 3,
  },

  replayMetricLabel: {
    color: '#8EA3C7',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  replayMetricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  emptyInlineText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flex: 1,
  },

  primaryAction: {
    backgroundColor: 'rgba(124, 58, 237, 0.24)',
    borderColor: 'rgba(196, 181, 253, 0.38)',
  },

  secondaryAction: {
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderColor: 'rgba(147, 197, 253, 0.32)',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
