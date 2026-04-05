import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import PlayerInitialBadge from '@/components/player/PlayerInitialBadge';

type Player = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
};

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistCountBySource?: Record<string, number>;
  contracts?: number;
  assists?: number;
  failures?: number;
  score?: number;
};

type GamePlayer = {
  id: string;
  startOrder?: number;
  turnOrder?: number;
  position?: number;
};

type Game = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, Totals>;
  players?: GamePlayer[];
};

type PlayerStats = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assistCountBySource: number;
  score: number;
  assists: number;
  contracts: number;
  failures: number;
  games: number;
  wins: number;
  avgPrestigePerGame: number;
  avgScorePerGame: number;
  allContractsEfficiency: number;
  assistanceEfficiency: number;
  directEfficiency: number;
  contractFailureRatio: number;
  winRate: number;
  failureRate: number;
  assistShareOfPrestige: number;
  assistPrestigePerGame: number;
  assistPrestigePerAssist: number;
  closeGames: number;
  closeGameRate: number;
  bestPrestigeMargin: number;
  avgPrestigeMarginPerGame: number;
  avgStartSeat: number;
  turnOrderWinCorrelation: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function getTotalPrestige(stats?: Totals) {
  const explicit = stats?.totalPrestige ?? stats?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }
  return toNumber(stats?.directPrestige) + toNumber(stats?.assistPrestigeReceived);
}

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getRecordedSeat(player?: GamePlayer): number | null {
  if (!player) return null;

  const raw =
    typeof player.startOrder === 'number' && Number.isFinite(player.startOrder)
      ? player.startOrder
      : typeof player.turnOrder === 'number' && Number.isFinite(player.turnOrder)
        ? player.turnOrder
        : typeof player.position === 'number' && Number.isFinite(player.position)
          ? player.position
          : null;

  return raw === null ? null : raw + 1;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function getPearsonCorrelation(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return 0;

  const meanX = average(points.map((point) => point.x));
  const meanY = average(points.map((point) => point.y));

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (const point of points) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) return 0;
  return numerator / Math.sqrt(sumX * sumY);
}

function formatCorrelation(value: number) {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}

function getPlayerColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#22C55E';
    case 'purple':
      return '#A855F7';
    case 'blue':
      return '#3B82F6';
    case 'orange':
      return '#F97316';
    case 'yellow':
      return '#EAB308';
    case 'pink':
      return '#EC4899';
    case 'red':
      return '#EF4444';
    default:
      return color || '#94A3B8';
  }
}

function getGlowColor(color?: string) {
  const resolved = getPlayerColor(color);
  return `${resolved}22`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function StatPill({
  label,
  value,
  accent,
  strong = false,
}: {
  label: string;
  value: string | number;
  accent?: string;
  strong?: boolean;
}) {
  return (
    <View
      style={[
        styles.statPill,
        strong && styles.statPillStrong,
        accent ? { borderColor: accent, backgroundColor: `${accent}12` } : null,
      ]}
    >
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={[styles.statPillValue, strong && styles.statPillValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as Player[];
  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as Game[];

  const leaderboard = useMemo<PlayerStats[]>(() => {
    if (!players.length) return [];

    const totals: Record<string, PlayerStats> = {};
    const prestigeMarginsByPlayer: Record<string, number[]> = {};
    const seatsByPlayer: Record<string, number[]> = {};
    const seatWinPointsByPlayer: Record<string, Array<{ x: number; y: number }>> = {};

    players.forEach((player) => {
      totals[player.id] = {
        id: player.id,
        name: player.name,
        initials: player.initials,
        color: player.color,
        totalPrestige: 0,
        directPrestige: 0,
        assistPrestigeReceived: 0,
        assistPrestigeSent: 0,
        assistCountBySource: 0,
        score: 0,
        assists: 0,
        contracts: 0,
        failures: 0,
        games: 0,
        wins: 0,
        avgPrestigePerGame: 0,
        avgScorePerGame: 0,
        allContractsEfficiency: 0,
        assistanceEfficiency: 0,
        directEfficiency: 0,
        contractFailureRatio: 0,
        winRate: 0,
        failureRate: 0,
        assistShareOfPrestige: 0,
        assistPrestigePerGame: 0,
        assistPrestigePerAssist: 0,
        closeGames: 0,
        closeGameRate: 0,
        bestPrestigeMargin: 0,
        avgPrestigeMarginPerGame: 0,
        avgStartSeat: 0,
        turnOrderWinCorrelation: 0,
      };
      prestigeMarginsByPlayer[player.id] = [];
      seatsByPlayer[player.id] = [];
      seatWinPointsByPlayer[player.id] = [];
    });

    games.forEach((game) => {
      const gameTotals = game.totals;
      if (!gameTotals) return;

      const gamePrestigeRows = Object.entries(gameTotals).map(([playerId, stats]) => ({
        playerId,
        totalPrestige: getTotalPrestige(stats ?? {}),
      }));
      gamePrestigeRows.sort((a, b) => b.totalPrestige - a.totalPrestige);
      const leaderPrestige = gamePrestigeRows[0]?.totalPrestige ?? 0;
      const runnerUpPrestige = gamePrestigeRows[1]?.totalPrestige ?? leaderPrestige;
      const isCloseGame = Math.abs(leaderPrestige - runnerUpPrestige) <= 3;

      Object.entries(gameTotals).forEach(([playerId, rawStats]) => {
        const player = totals[playerId];
        if (!player) return;

        const stats = rawStats ?? {};
        const totalPrestige = getTotalPrestige(stats);
        const directPrestige = toNumber(stats.directPrestige);
        const assistPrestigeReceived =
          typeof stats.assistPrestigeReceived === 'number'
            ? toNumber(stats.assistPrestigeReceived)
            : Math.max(0, totalPrestige - directPrestige);

        player.games += 1;
        player.totalPrestige += totalPrestige;
        player.directPrestige += directPrestige;
        player.assistPrestigeReceived += assistPrestigeReceived;
        player.score += toNumber(stats.score);
        player.assists += toNumber(stats.assists);
        player.contracts += toNumber(stats.contracts);
        player.failures += toNumber(stats.failures);

        const assistCountBySource = stats.assistCountBySource ?? {};
        player.assistCountBySource += Object.values(assistCountBySource).reduce(
          (sum, value) => sum + toNumber(value),
          0
        );

        const gamePlayer = (game.players ?? []).find((entry) => entry.id === playerId);
        const seat = getRecordedSeat(gamePlayer);
        const won = getWinnerId(game) === playerId;

        if (won) {
          player.wins += 1;
        }

        if (seat !== null) {
          seatsByPlayer[playerId].push(seat);
          seatWinPointsByPlayer[playerId].push({ x: seat, y: won ? 1 : 0 });
        }

        if (isCloseGame) {
          player.closeGames += 1;
        }

        prestigeMarginsByPlayer[playerId].push(totalPrestige - runnerUpPrestige);
      });

      Object.entries(gameTotals).forEach(([receiverId, receiverStats]) => {
        const bySource = receiverStats?.assistPrestigeBySource ?? {};
        Object.entries(bySource).forEach(([sourceId, value]) => {
          if (!totals[sourceId]) return;
          totals[sourceId].assistPrestigeSent += toNumber(value);
        });
      });
    });

    Object.values(totals).forEach((player) => {
      const attempts = player.contracts + player.failures;
      const prestigeMargins = prestigeMarginsByPlayer[player.id];

      player.avgPrestigePerGame = safeDivide(player.totalPrestige, player.games);
      player.avgScorePerGame = safeDivide(player.score, player.games);
      player.allContractsEfficiency = safeDivide(
        player.directPrestige + player.assistPrestigeReceived,
        player.contracts + player.assists
      );
      player.assistanceEfficiency = safeDivide(
        player.assistPrestigeReceived,
        player.assists
      );
      player.directEfficiency = safeDivide(
        player.directPrestige,
        player.contracts
      );
      player.contractFailureRatio = safeDivide(player.contracts, Math.max(1, player.failures));
      player.winRate = safeDivide(player.wins, player.games);
      player.failureRate = safeDivide(player.failures, attempts);
      player.assistShareOfPrestige = safeDivide(player.assistPrestigeReceived, player.totalPrestige);
      player.assistPrestigePerGame = safeDivide(player.assistPrestigeReceived, player.games);
      player.assistPrestigePerAssist = safeDivide(player.assistPrestigeReceived, Math.max(1, player.assists));
      player.closeGameRate = safeDivide(player.closeGames, player.games);
      player.bestPrestigeMargin = prestigeMargins.length ? Math.max(...prestigeMargins) : 0;
      player.avgPrestigeMarginPerGame = prestigeMargins.length
        ? prestigeMargins.reduce((sum, value) => sum + value, 0) / prestigeMargins.length
        : 0;
      player.avgStartSeat = average(seatsByPlayer[player.id]);
      player.turnOrderWinCorrelation = getPearsonCorrelation(
        seatWinPointsByPlayer[player.id]
      );
    });

    return Object.values(totals).sort((a, b) => {
      if (b.totalPrestige !== a.totalPrestige) return b.totalPrestige - a.totalPrestige;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
  }, [players, games]);

  const summary = useMemo(() => {
    const totalPrestige = leaderboard.reduce((sum, player) => sum + player.totalPrestige, 0);
    const totalScore = leaderboard.reduce((sum, player) => sum + player.score, 0);
    const totalAssistSent = leaderboard.reduce((sum, player) => sum + player.assistPrestigeSent, 0);
    const totalAssistReceived = leaderboard.reduce((sum, player) => sum + player.assistPrestigeReceived, 0);

    const globalSeatPoints: Array<{ x: number; y: number }> = [];
    const winnerSeats: number[] = [];

    for (const game of games) {
      const winnerId = getWinnerId(game);

      for (const gamePlayer of game.players ?? []) {
        const seat = getRecordedSeat(gamePlayer);
        if (seat === null) continue;

        const won = winnerId === gamePlayer.id;
        globalSeatPoints.push({ x: seat, y: won ? 1 : 0 });

        if (won) {
          winnerSeats.push(seat);
        }
      }
    }

    return {
      totalPrestige,
      totalScore,
      totalAssistSent,
      totalAssistReceived,
      avgWinnerSeat: average(winnerSeats),
      turnOrderWinCorrelation: getPearsonCorrelation(globalSeatPoints),
    };
  }, [leaderboard, games]);

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundNebulaPurple} />
        <View style={styles.backgroundNebulaBlue} />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowLeft} />
          <View style={styles.heroGlowRight} />

          <Text style={styles.brandTitle}>Moonrakers</Text>
          <Text style={styles.heroTitle}>Statistics</Text>
          <Text style={styles.heroSubtitle}>
            Unified league analytics, mission efficiency, assist economy, and turn-order insight in a premium space dashboard.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Overview</Text>
          <Text style={styles.title}>League Snapshot</Text>
          <Text style={styles.subtitle}>
            Total prestige leads the ranking, with assist flow, execution quality, and seat-order influence surfaced as secondary signals.
          </Text>

          <View style={styles.primarySummaryGrid}>
            <StatPill label="Players" value={leaderboard.length} strong />
            <StatPill label="Games" value={games.length} strong />
            <StatPill label="Total Prestige" value={summary.totalPrestige} accent="#60A5FA" strong />
            <StatPill label="Total Score" value={summary.totalScore} accent="#A855F7" strong />
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.secondarySummaryGrid}>
            <StatPill label="Assist Sent" value={summary.totalAssistSent.toFixed(1)} accent="#22D3EE" />
            <StatPill label="Assist Received" value={summary.totalAssistReceived.toFixed(1)} accent="#0EA5E9" />
            <StatPill
              label="Avg Winner Seat"
              value={summary.avgWinnerSeat > 0 ? summary.avgWinnerSeat.toFixed(2) : '—'}
              accent="#F59E0B"
            />
            <StatPill
              label="Seat ↔ Win Corr"
              value={formatCorrelation(summary.turnOrderWinCorrelation)}
              accent="#22C55E"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.compareButton,
              pressed && styles.compareButtonPressed,
            ]}
            onPress={() => router.push('/charts/compare')}
          >
            <View style={styles.compareButtonGlow} />
            <Text style={styles.compareButtonText}>Compare Players →</Text>
          </Pressable>
        </View>

        {leaderboard.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No stats yet</Text>
            <Text style={styles.emptyText}>
              Finish a few games to build the statistics screen.
            </Text>
          </View>
        ) : (
          leaderboard.map((player, index) => {
            const accent = getPlayerColor(player.color);
            return (
              <View
                key={player.id}
                style={[
                  styles.playerCard,
                  { borderColor: `${accent}2A` },
                ]}
              >
                <View style={[styles.playerCardAccent, { backgroundColor: accent }]} />
                <View style={[styles.playerGlow, { backgroundColor: getGlowColor(player.color) }]} />

                <View style={styles.playerHeader}>
                  <View style={styles.playerHeaderLeft}>
                    <PlayerInitialBadge
                      initials={player.initials}
                      color={player.color}
                      size={42}
                      fontSize={15}
                    />
                    <View style={styles.playerTextWrap}>
                      <Text style={[styles.rankText, { color: accent }]}>#{index + 1}</Text>
                      <Text style={styles.name}>{player.name}</Text>
                      <Text style={styles.playerMeta}>
                        {formatPercent(player.winRate)} win · {player.games} games · {player.avgPrestigePerGame.toFixed(1)} prestige/game
                      </Text>
                    </View>
                  </View>

                  <View style={styles.primaryValueWrap}>
                    <Text style={styles.primaryValue}>{player.totalPrestige}</Text>
                    <Text style={styles.primaryValueLabel}>total prestige</Text>
                  </View>
                </View>

                <View style={styles.playerHeroMetricsRow}>
                  <StatPill label="Wins" value={player.wins} accent="#22C55E" strong />
                  <StatPill label="Direct" value={player.directPrestige} accent="#60A5FA" strong />
                  <StatPill label="Assist In" value={player.assistPrestigeReceived.toFixed(1)} accent="#22D3EE" strong />
                  <StatPill label="Assist Out" value={player.assistPrestigeSent.toFixed(1)} accent="#A855F7" strong />
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Prestige Output</Text>
                  <View style={styles.statsGrid}>
                    <StatPill label="Total Prestige" value={player.totalPrestige} accent="#60A5FA" />
                    <StatPill label="Score" value={player.score} />
                    <StatPill label="Score / Game" value={player.avgScorePerGame.toFixed(1)} />
                    <StatPill label="Prestige / Game" value={player.avgPrestigePerGame.toFixed(1)} accent="#60A5FA" />
                    <StatPill label="Assist Share" value={formatPercent(player.assistShareOfPrestige)} accent="#22D3EE" />
                    <StatPill label="Assist In / Game" value={player.assistPrestigePerGame.toFixed(2)} />
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Mission Execution</Text>
                  <View style={styles.statsGrid}>
                    <StatPill label="Contracts" value={player.contracts} />
                    <StatPill label="Assists" value={player.assists} />
                    <StatPill label="Failures" value={player.failures} accent="#EF4444" />
                    <StatPill label="All Eff" value={player.allContractsEfficiency.toFixed(2)} accent="#22C55E" />
                    <StatPill label="Assist Eff" value={player.assistanceEfficiency.toFixed(2)} accent="#A855F7" />
                    <StatPill label="Direct Eff" value={player.directEfficiency.toFixed(2)} accent="#60A5FA" />
                    <StatPill label="C/F Ratio" value={player.contractFailureRatio.toFixed(2)} />
                    <StatPill label="Fail %" value={formatPercent(player.failureRate)} accent="#EF4444" />
                    <StatPill label="Assist / Assist" value={player.assistPrestigePerAssist.toFixed(2)} />
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Outcome Patterns</Text>
                  <View style={styles.statsGrid}>
                    <StatPill label="Win %" value={formatPercent(player.winRate)} accent="#22C55E" />
                    <StatPill
                      label="Avg Start Seat"
                      value={player.avgStartSeat > 0 ? player.avgStartSeat.toFixed(2) : '—'}
                      accent="#F59E0B"
                    />
                    <StatPill
                      label="Seat ↔ Win Corr"
                      value={formatCorrelation(player.turnOrderWinCorrelation)}
                      accent="#22C55E"
                    />
                    <StatPill label="Close Games" value={player.closeGames} />
                    <StatPill label="Close Rate" value={formatPercent(player.closeGameRate)} />
                    <StatPill label="Avg Margin" value={formatSigned(player.avgPrestigeMarginPerGame)} accent="#60A5FA" />
                    <StatPill label="Best Margin" value={formatSigned(player.bestPrestigeMargin)} accent="#60A5FA" />
                    <StatPill label="Assist Count In" value={player.assistCountBySource} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050814',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundNebulaPurple: {
    position: 'absolute',
    top: -80,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.14)',
  },
  backgroundNebulaBlue: {
    position: 'absolute',
    bottom: -120,
    right: -20,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.10)',
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  content: {
    padding: 14,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(12, 20, 36, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.22)',
    gap: 6,
  },
  heroGlowLeft: {
    position: 'absolute',
    left: -30,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.14)',
  },
  heroGlowRight: {
    position: 'absolute',
    right: -30,
    bottom: -50,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  brandTitle: {
    color: '#A855F7',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(168,85,247,0.40)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 360,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(16, 26, 43, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    gap: 10,
  },
  eyebrow: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  primarySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondarySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.10)',
    marginVertical: 2,
  },
  statPill: {
    minWidth: 98,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(22, 35, 56, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  statPillStrong: {
    backgroundColor: 'rgba(20, 34, 54, 1)',
  },
  statPillLabel: {
    fontSize: 10,
    color: '#8EA6C8',
    marginBottom: 2,
    fontWeight: '700',
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statPillValueStrong: {
    fontSize: 13,
    fontWeight: '900',
  },
  compareButton: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.45)',
    shadowColor: '#A855F7',
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  compareButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  compareButtonGlow: {
    position: 'absolute',
    left: -24,
    top: -18,
    width: 120,
    height: 70,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  compareButtonText: {
    color: '#E9D5FF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(16, 26, 43, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  playerCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(16, 26, 43, 0.96)',
    borderWidth: 1,
    gap: 12,
  },
  playerCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  playerGlow: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 120,
    height: 120,
    borderRadius: 999,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  playerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  playerTextWrap: {
    flex: 1,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  playerMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
  },
  primaryValueWrap: {
    alignItems: 'flex-end',
  },
  primaryValue: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  primaryValueLabel: {
    color: '#8EA6C8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  playerHeroMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
