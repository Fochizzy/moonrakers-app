import React, { useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';

type Player = {
  id: string;
  name: string;
  color?: string;
  startOrder?: number;
};

type Round = {
  id?: string;
  playerId: string;
  prestige?: number;
  contracts?: number;
  failures?: number;
  assistRecipients?: Record<string, number>;
  assistPrestigeRecipients?: Record<string, number>;
  createdAt?: number;
};

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type Game = {
  id: string;
  createdAt?: number;
  players?: Player[];
  rounds?: Round[];
  totals?: Record<string, Totals>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getTotalPrestige(totals?: Totals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    toNumber(totals?.directPrestige) +
    toNumber(totals?.assistPrestigeReceived)
  );
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
    default:
      return color || '#94a3b8';
  }
}

function formatDate(value?: number) {
  if (!value || !Number.isFinite(value)) return 'Unknown date';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Unknown date';
  }
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function GameTrendsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string | string[] }>();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as Game[];

  const game = useMemo(() => {
    if (!gameId) return undefined;
    return games.find((g) => g.id === gameId);
  }, [games, gameId]);

  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const players = game?.players ?? [];
  const rounds = game?.rounds ?? [];
  const totals = game?.totals ?? {};
  const winnerId = getWinnerId(game);
  const winner = players.find((p) => p.id === winnerId);

  const orderedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const seatA =
        typeof a.startOrder === 'number' && Number.isFinite(a.startOrder)
          ? a.startOrder
          : 999;
      const seatB =
        typeof b.startOrder === 'number' && Number.isFinite(b.startOrder)
          ? b.startOrder
          : 999;
      return seatA - seatB;
    });
  }, [players]);

  const prestigeTrendRows = useMemo(() => {
    const running: Record<string, number> = {};
    players.forEach((p) => {
      running[p.id] = 0;
    });

    return rounds.map((round, index) => {
      running[round.playerId] = (running[round.playerId] ?? 0) + toNumber(round.prestige);

      return {
        round: index + 1,
        leaderId: [...players]
          .sort((a, b) => (running[b.id] ?? 0) - (running[a.id] ?? 0))[0]?.id,
        values: { ...running },
      };
    });
  }, [players, rounds]);

  const turnOrderEffectRows = useMemo(() => {
    return orderedPlayers.map((player, index) => {
      const stat = totals[player.id];
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        seat: typeof player.startOrder === 'number' ? player.startOrder + 1 : index + 1,
        totalPrestige: getTotalPrestige(stat),
        directPrestige: toNumber(stat?.directPrestige),
        assistPrestige: toNumber(stat?.assistPrestigeReceived),
        score: toNumber(stat?.score),
        winner: winnerId === player.id,
      };
    });
  }, [orderedPlayers, totals, winnerId]);

  const contractFailureRows = useMemo(() => {
    return orderedPlayers.map((player) => {
      const stat = totals[player.id];
      const contracts = toNumber(stat?.contracts);
      const failures = toNumber(stat?.failures);
      const attempts = contracts + failures;

      return {
        id: player.id,
        name: player.name,
        color: player.color,
        contracts,
        failures,
        attempts,
        successRate: safeDivide(contracts, attempts),
      };
    });
  }, [orderedPlayers, totals]);

  const winnerPredictionRows = useMemo(() => {
    if (!players.length) return [];

    const running: Record<string, number> = {};
    players.forEach((p) => {
      running[p.id] = 0;
    });

    return rounds.map((round, index) => {
      running[round.playerId] = (running[round.playerId] ?? 0) + toNumber(round.prestige);

      const ranked = [...players]
        .map((player) => ({
          id: player.id,
          name: player.name,
          total: running[player.id] ?? 0,
        }))
        .sort((a, b) => b.total - a.total);

      const leader = ranked[0];
      const second = ranked[1];
      const margin = leader && second ? leader.total - second.total : leader?.total ?? 0;

      return {
        round: index + 1,
        projectedWinnerId: leader?.id,
        projectedWinnerName: leader?.name ?? '—',
        projectedTotal: leader?.total ?? 0,
        margin,
        correct: leader?.id === winnerId,
      };
    });
  }, [players, rounds, winnerId]);

  const playerCardRows = useMemo(() => {
    return orderedPlayers.map((player) => {
      const stat = totals[player.id];
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        totalPrestige: getTotalPrestige(stat),
        directPrestige: toNumber(stat?.directPrestige),
        assistPrestige: toNumber(stat?.assistPrestigeReceived),
        score: toNumber(stat?.score),
        assists: toNumber(stat?.assists),
        contracts: toNumber(stat?.contracts),
        failures: toNumber(stat?.failures),
      };
    });
  }, [orderedPlayers, totals]);

  function scrollToSection(key: string) {
    const y = sectionOffsets.current[key];
    if (typeof y === 'number' && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 88), animated: true });
    }
  }

  if (!game) {
    return (
      <View style={styles.root}>
        <View style={styles.backgroundLayer}>
          <StarryNight />
          <View style={styles.backgroundDim} />
        </View>

        <View style={styles.notFoundWrap}>
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Game not found</Text>
            <Text style={styles.notFoundText}>
              The saved game for this trends page could not be found.
            </Text>

            <Pressable style={styles.topButton} onPress={() => router.replace('/history')}>
              <Text style={styles.topButtonText}>Back to History</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
            <Text style={styles.topButtonText}>Back</Text>
          </Pressable>

          <Pressable style={styles.topButton} onPress={() => router.replace('/')}>
            <Text style={styles.topButtonText}>Home</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Game Trends & Breakdown</Text>
          <Text style={styles.heroMeta}>
            {formatDate(game.createdAt)} · {rounds.length} rounds
          </Text>
          <Text style={styles.heroMeta}>
            Winner: {winner?.name ?? 'Unknown'}
          </Text>

          <View style={styles.summaryGrid}>
            <StatPill label="Players" value={players.length} />
            <StatPill label="Rounds" value={rounds.length} />
            <StatPill label="Winner" value={winner?.name ?? '—'} />
            <StatPill
              label="Top Prestige"
              value={
                Math.max(
                  0,
                  ...playerCardRows.map((row) => row.totalPrestige)
                )
              }
            />
          </View>
        </View>

        <View style={styles.navCard}>
          <Text style={styles.navTitle}>Open Trends</Text>
          <View style={styles.navGrid}>
            <NavButton
              label="Prestige Trends"
              onPress={() => scrollToSection('prestige')}
            />
            <NavButton
              label="Turn Order Effect"
              onPress={() => scrollToSection('turnOrder')}
            />
            <NavButton
              label="Contracts & Failures"
              onPress={() => scrollToSection('contracts')}
            />
            <NavButton
              label="Winner Prediction"
              onPress={() => scrollToSection('prediction')}
            />
            <NavButton
              label="Player Cards"
              onPress={() => scrollToSection('playerCards')}
            />
          </View>
        </View>

        <View
          onLayout={(e) => {
            sectionOffsets.current.prestige = e.nativeEvent.layout.y;
          }}
        >
          <SectionCard title="Prestige Trends">
            {prestigeTrendRows.length === 0 ? (
              <Text style={styles.emptyText}>No rounds recorded for this game.</Text>
            ) : (
              prestigeTrendRows.map((row) => (
                <View key={`prestige-${row.round}`} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>Round {row.round}</Text>
                  {orderedPlayers.map((player) => (
                    <View key={`${row.round}-${player.id}`} style={styles.metricRow}>
                      <View style={styles.metricLeft}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: getPlayerColor(player.color) },
                          ]}
                        />
                        <Text style={styles.metricLabel}>{player.name}</Text>
                      </View>
                      <Text style={styles.metricValue}>
                        {row.values[player.id] ?? 0}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.noteText}>
                    Leader after round {row.round}:{' '}
                    {players.find((p) => p.id === row.leaderId)?.name ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </SectionCard>
        </View>

        <View
          onLayout={(e) => {
            sectionOffsets.current.turnOrder = e.nativeEvent.layout.y;
          }}
        >
          <SectionCard title="Turn Order Effect">
            {turnOrderEffectRows.map((row) => (
              <View key={row.id} style={styles.rowCard}>
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getPlayerColor(row.color) },
                      ]}
                    />
                    <Text style={styles.rowTitle}>
                      Seat {row.seat} · {row.name}
                      {row.winner ? ' 👑' : ''}
                    </Text>
                  </View>
                  <Text style={styles.metricValue}>{row.totalPrestige}</Text>
                </View>

                <View style={styles.inlineStats}>
                  <MiniTag label={`Direct ${row.directPrestige}`} />
                  <MiniTag label={`Assist ${row.assistPrestige}`} />
                  <MiniTag label={`Score ${row.score}`} />
                </View>
              </View>
            ))}
          </SectionCard>
        </View>

        <View
          onLayout={(e) => {
            sectionOffsets.current.contracts = e.nativeEvent.layout.y;
          }}
        >
          <SectionCard title="Contracts & Failures">
            {contractFailureRows.map((row) => (
              <View key={row.id} style={styles.rowCard}>
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getPlayerColor(row.color) },
                      ]}
                    />
                    <Text style={styles.rowTitle}>{row.name}</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    {(row.successRate * 100).toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.inlineStats}>
                  <MiniTag label={`Contracts ${row.contracts}`} />
                  <MiniTag label={`Failures ${row.failures}`} />
                  <MiniTag label={`Attempts ${row.attempts}`} />
                </View>
              </View>
            ))}
          </SectionCard>
        </View>

        <View
          onLayout={(e) => {
            sectionOffsets.current.prediction = e.nativeEvent.layout.y;
          }}
        >
          <SectionCard title="Winner Prediction">
            {winnerPredictionRows.length === 0 ? (
              <Text style={styles.emptyText}>No rounds recorded for this game.</Text>
            ) : (
              winnerPredictionRows.map((row) => (
                <View key={`prediction-${row.round}`} style={styles.rowCard}>
                  <View style={styles.metricRow}>
                    <Text style={styles.rowTitle}>Round {row.round}</Text>
                    <Text
                      style={[
                        styles.predictionBadge,
                        row.correct ? styles.predictionBadgeCorrect : styles.predictionBadgeMiss,
                      ]}
                    >
                      {row.correct ? 'Matched final winner' : 'Projection changed'}
                    </Text>
                  </View>

                  <Text style={styles.noteText}>
                    Projected winner: {row.projectedWinnerName}
                  </Text>
                  <View style={styles.inlineStats}>
                    <MiniTag label={`Projected prestige ${row.projectedTotal}`} />
                    <MiniTag label={`Lead margin ${row.margin}`} />
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </View>

        <View
          onLayout={(e) => {
            sectionOffsets.current.playerCards = e.nativeEvent.layout.y;
          }}
        >
          <SectionCard title="Player Cards">
            {playerCardRows.map((row) => (
              <Pressable
                key={row.id}
                style={styles.playerCard}
                onPress={() =>
                  router.push({
                    pathname: '/player/[playerId]',
                    params: { playerId: row.id },
                  })
                }
              >
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getPlayerColor(row.color) },
                      ]}
                    />
                    <Text style={styles.rowTitle}>{row.name}</Text>
                  </View>
                  <Text style={styles.openText}>Open Card</Text>
                </View>

                <View style={styles.inlineStats}>
                  <MiniTag label={`Prestige ${row.totalPrestige}`} />
                  <MiniTag label={`Direct ${row.directPrestige}`} />
                  <MiniTag label={`Assist ${row.assistPrestige}`} />
                  <MiniTag label={`Score ${row.score}`} />
                  <MiniTag label={`Contracts ${row.contracts}`} />
                  <MiniTag label={`Failures ${row.failures}`} />
                </View>
              </Pressable>
            ))}
          </SectionCard>
        </View>
      </ScrollView>
    </View>
  );
}

function NavButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.navButton}>
      <Text style={styles.navButtonText}>{label}</Text>
    </Pressable>
  );
}

function MiniTag({ label }: { label: string }) {
  return (
    <View style={styles.miniTag}>
      <Text style={styles.miniTagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
  content: {
    padding: 12,
    paddingBottom: 28,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    gap: 8,
  },
  topButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#10243f',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  topButtonText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#253247',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroMeta: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  navCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#253247',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navButton: {
    minWidth: '48%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1b283d',
    borderWidth: 1,
    borderColor: '#2a3850',
  },
  navButtonText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#253247',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  rowCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#1b283d',
    borderWidth: 1,
    borderColor: '#2a3850',
    marginBottom: 8,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  metricLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  metricValue: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '900',
  },
  inlineStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  miniTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#2a3850',
  },
  miniTagText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  statPill: {
    minWidth: 92,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1b283d',
    borderWidth: 1,
    borderColor: '#2a3850',
  },
  statPillLabel: {
    fontSize: 10,
    color: '#8EA6C8',
    marginBottom: 2,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  noteText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  predictionBadge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  predictionBadgeCorrect: {
    color: '#DCFCE7',
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  predictionBadgeMiss: {
    color: '#FDE68A',
    backgroundColor: 'rgba(245,158,11,0.18)',
  },
  playerCard: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#1b283d',
    borderWidth: 1,
    borderColor: '#2a3850',
    marginBottom: 8,
  },
  openText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '800',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  notFoundWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  notFoundCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#253247',
    gap: 10,
  },
  notFoundTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  notFoundText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
});
