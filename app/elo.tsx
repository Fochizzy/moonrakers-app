import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useStore } from '@/store/useStore';
import { calculateElo } from '@/utils/elo';
import { buildPlayerAggregateMetrics } from '@/utils/chartAnalytics';

type Player = {
  id: string;
  name?: string;
  color?: string;
};

type LeaderboardRow = {
  id: string;
  name: string;
  color?: string;
  rating: number;
  rank: number;
  gamesPlayed: number;
  winRate: number;
  efficiency: number;
  earlyLeadRate: number;
  avgObjectivePrestigePerGame: number;
  avgAssistsGivenPerGame: number;
  failureRate: number;
};

type CorrelationRow = {
  label: string;
  shortLabel: string;
  value: number;
};

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
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.16)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.16)',
  border: 'rgba(255,255,255,0.08)',
  whiteSoft: 'rgba(255,255,255,0.06)',
};

function safeNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function percent(value: number): string {
  return `${(safeNum(value) * 100).toFixed(1)}%`;
}

function decimal(value: number, digits = 2): string {
  return safeNum(value).toFixed(digits);
}

function correlation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;

  let numerator = 0;
  let spreadX = 0;
  let spreadY = 0;

  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    spreadX += dx * dx;
    spreadY += dy * dy;
  }

  const denominator = Math.sqrt(spreadX * spreadY);
  if (!denominator) return 0;

  return numerator / denominator;
}

function correlationStrength(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.8) return 'Very Strong';
  if (abs >= 0.6) return 'Strong';
  if (abs >= 0.4) return 'Moderate';
  if (abs >= 0.2) return 'Weak';
  return 'Very Weak';
}

function getCorrelationTone(value: number) {
  if (value >= 0.2) {
    return {
      color: COLORS.green,
      bg: COLORS.greenSoft,
      arrow: '▲',
    };
  }

  if (value <= -0.2) {
    return {
      color: COLORS.red,
      bg: COLORS.redSoft,
      arrow: '▼',
    };
  }

  return {
    color: COLORS.sub,
    bg: COLORS.whiteSoft,
    arrow: '•',
  };
}

function getPlaystyleLabel(row: LeaderboardRow | undefined): string {
  if (!row) return 'Balanced';
  if (row.avgAssistsGivenPerGame >= 1.5 && row.winRate >= 0.35) return 'Support Engine';
  if (row.efficiency >= 2 && row.failureRate <= 0.25) return 'Closer';
  if (row.earlyLeadRate >= 0.45) return 'Aggressor';
  if (row.avgObjectivePrestigePerGame >= 1.5) return 'Objective Hunter';
  return 'Balanced';
}

function getTopInsight(correlations: CorrelationRow[]): string {
  if (!correlations.length) return 'No correlation data available yet.';

  const strongest = [...correlations].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value)
  )[0];

  const direction =
    strongest.value > 0.15
      ? 'positively'
      : strongest.value < -0.15
        ? 'negatively'
        : 'weakly';

  return `${strongest.label} is currently the strongest signal in your meta and ${direction} tracks with winning.`;
}

function getSelectedPlayerInsight(player: LeaderboardRow | undefined): string {
  if (!player) return 'Select a player to view a premium breakdown.';
  if (player.winRate >= 0.6 && player.efficiency >= 2) {
    return `${player.name} is converting strong output into wins at an elite rate.`;
  }
  if (player.earlyLeadRate >= 0.45) {
    return `${player.name} starts fast and often controls the pace early.`;
  }
  if (player.avgAssistsGivenPerGame >= 1.5) {
    return `${player.name} creates value through support and table-wide impact.`;
  }
  if (player.failureRate <= 0.2 && player.gamesPlayed >= 5) {
    return `${player.name} plays a low-error style with strong stability.`;
  }
  return `${player.name} profiles as a balanced player with room to separate through efficiency or conversion.`;
}

export default function EloScreen() {
  const games = useStore((s: any) => s.games || []);
  const players = useStore((s: any) => s.players || []);

  const metrics = useMemo(() => buildPlayerAggregateMetrics(games, players), [games, players]);

  const leaderboard = useMemo<LeaderboardRow[]>(() => {
    const ratings = calculateElo(games);

    return metrics
      .map((metric: any) => ({
        id: metric.playerId,
        name: metric.name || 'Unknown',
        color: metric.color,
        rating: Math.round(ratings[metric.playerId] || 1000),
        rank: 0,
        gamesPlayed: safeNum(metric.gamesPlayed),
        winRate: safeNum(metric.winRate),
        efficiency: safeNum(metric.efficiency),
        earlyLeadRate: safeNum(metric.earlyLeadRate),
        avgObjectivePrestigePerGame: safeNum(metric.avgObjectivePrestigePerGame),
        avgAssistsGivenPerGame: safeNum(metric.avgAssistsGivenPerGame),
        failureRate: safeNum(metric.failureRate),
      }))
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.gamesPlayed - a.gamesPlayed;
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));
  }, [games, metrics]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    leaderboard[0]?.id ?? null
  );

  const selectedPlayer =
    leaderboard.find((row) => row.id === selectedPlayerId) ?? leaderboard[0];

  const globalCorrelations = useMemo<CorrelationRow[]>(() => {
    const rows = leaderboard.filter((row) => row.gamesPlayed > 0);
    const winRates = rows.map((row) => row.winRate);

    return [
      {
        label: 'Turn Order vs Wins',
        shortLabel: 'Turn Order',
        value: correlation(
          rows.map((row: any) => safeNum(metrics.find((m: any) => m.playerId === row.id)?.avgSeat)),
          winRates
        ),
      },
      {
        label: 'Assists vs Wins',
        shortLabel: 'Assists',
        value: correlation(rows.map((row) => row.avgAssistsGivenPerGame), winRates),
      },
      {
        label: 'Objectives vs Wins',
        shortLabel: 'Objectives',
        value: correlation(rows.map((row) => row.avgObjectivePrestigePerGame), winRates),
      },
      {
        label: 'Efficiency vs Wins',
        shortLabel: 'Efficiency',
        value: correlation(rows.map((row) => row.efficiency), winRates),
      },
      {
        label: 'Failure Rate vs Wins',
        shortLabel: 'Failures',
        value: correlation(rows.map((row) => row.failureRate), winRates),
      },
      {
        label: 'Early Lead vs Wins',
        shortLabel: 'Early Lead',
        value: correlation(rows.map((row) => row.earlyLeadRate), winRates),
      },
    ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [leaderboard, metrics]);

  const heroStats = useMemo(() => {
    const activePlayers = leaderboard.length;
    const totalGames = Array.isArray(games) ? games.length : 0;
    const topPlayer = leaderboard[0];
    const avgElo =
      leaderboard.length > 0
        ? Math.round(
            leaderboard.reduce((sum, row) => sum + row.rating, 0) / leaderboard.length
          )
        : 1000;

    return {
      totalGames,
      activePlayers,
      topPlayerName: topPlayer?.name ?? '—',
      topPlayerElo: topPlayer?.rating ?? 1000,
      avgElo,
    };
  }, [games, leaderboard]);

  const featuredCards = useMemo(() => {
    if (!selectedPlayer) return [];

    return [
      {
        label: 'Current ELO',
        value: String(selectedPlayer.rating),
        tone: 'accent',
      },
      {
        label: 'Win Rate',
        value: percent(selectedPlayer.winRate),
        tone: 'blue',
      },
      {
        label: 'All Eff',
        value: decimal(selectedPlayer.efficiency),
        tone: 'green',
      },
      {
        label: 'Playstyle',
        value: getPlaystyleLabel(selectedPlayer),
        tone: 'amber',
      },
    ];
  }, [selectedPlayer]);

  const topInsight = getTopInsight(globalCorrelations);
  const playerInsight = getSelectedPlayerInsight(selectedPlayer);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Moonrakers</Text>
      <Text style={styles.subtitle}>ELO</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroLabel}>Premium Analytics</Text>
            <Text style={styles.heroTitle}>Competitive Meta Dashboard</Text>
            <Text style={styles.heroBody}>
              Track the live ELO ladder, identify win signals, and inspect how each pilot performs across efficiency, objectives, support, and early tempo.
            </Text>
          </View>

          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>LIVE META</Text>
          </View>
        </View>

        <View style={styles.heroStatsGrid}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Games</Text>
            <Text style={styles.heroStatValue}>{heroStats.totalGames}</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Players</Text>
            <Text style={styles.heroStatValue}>{heroStats.activePlayers}</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Top ELO</Text>
            <Text style={styles.heroStatValue}>{heroStats.topPlayerElo}</Text>
            <Text style={styles.heroStatSub}>{heroStats.topPlayerName}</Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Avg ELO</Text>
            <Text style={styles.heroStatValue}>{heroStats.avgElo}</Text>
          </View>
        </View>
      </View>

      <View style={styles.insightStrip}>
        <View style={styles.insightHeaderRow}>
          <Text style={styles.sectionTitle}>Meta Insight</Text>
          <Text style={styles.insightChip}>AUTO</Text>
        </View>
        <Text style={styles.insightText}>{topInsight}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <Text style={styles.sectionSub}>Current ELO ladder</Text>
        </View>

        {leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>No player or game data available yet.</Text>
        ) : (
          leaderboard.map((row) => {
            const isSelected = selectedPlayer?.id === row.id;
            return (
              <TouchableOpacity
                key={row.id}
                style={[styles.leaderboardRow, isSelected && styles.leaderboardRowSelected]}
                onPress={() => setSelectedPlayerId(row.id)}
                activeOpacity={0.85}
              >
                <View style={styles.leaderboardLeft}>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>#{row.rank}</Text>
                  </View>

                  <View>
                    <Text style={styles.playerName}>{row.name}</Text>
                    <Text style={styles.playerSub}>
                      {row.gamesPlayed} games • {percent(row.winRate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.leaderboardRight}>
                  <Text style={styles.eloValue}>{row.rating}</Text>
                  <Text style={styles.eloSub}>ELO</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Global Correlations</Text>
          <Text style={styles.sectionSub}>What most tracks with wins</Text>
        </View>

        <View style={styles.correlationGrid}>
          {globalCorrelations.map((item) => {
            const tone = getCorrelationTone(item.value);

            return (
              <View key={item.label} style={styles.correlationCard}>
                <Text style={styles.correlationLabel}>{item.shortLabel}</Text>
                <View style={[styles.correlationPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.correlationPillText, { color: tone.color }]}>
                    {tone.arrow} {item.value.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.correlationStrength}>
                  {correlationStrength(item.value)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Player Focus</Text>
          <Text style={styles.sectionSub}>Premium breakdown</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playerChipRow}
        >
          {leaderboard.map((row) => {
            const active = selectedPlayer?.id === row.id;
            return (
              <TouchableOpacity
                key={row.id}
                style={[styles.playerChip, active && styles.playerChipActive]}
                onPress={() => setSelectedPlayerId(row.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.playerChipText, active && styles.playerChipTextActive]}>
                  {row.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedPlayer ? (
          <>
            <View style={styles.featuredPlayerCard}>
              <View style={styles.featuredPlayerHeader}>
                <View>
                  <Text style={styles.featuredEyebrow}>Featured Player</Text>
                  <Text style={styles.featuredName}>{selectedPlayer.name}</Text>
                  <Text style={styles.featuredDescriptor}>
                    {getPlaystyleLabel(selectedPlayer)}
                  </Text>
                </View>

                <View style={styles.featuredEloBadge}>
                  <Text style={styles.featuredEloValue}>{selectedPlayer.rating}</Text>
                  <Text style={styles.featuredEloLabel}>ELO</Text>
                </View>
              </View>

              <Text style={styles.featuredNarrative}>{playerInsight}</Text>

              <View style={styles.featuredStatsGrid}>
                {featuredCards.map((card) => {
                  const toneStyles =
                    card.tone === 'accent'
                      ? styles.tileAccent
                      : card.tone === 'blue'
                        ? styles.tileBlue
                        : card.tone === 'green'
                          ? styles.tileGreen
                          : styles.tileAmber;

                  return (
                    <View key={card.label} style={[styles.featureTile, toneStyles]}>
                      <Text style={styles.featureTileLabel}>{card.label}</Text>
                      <Text style={styles.featureTileValue}>{card.value}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>Objective Pressure</Text>
                <Text style={styles.analyticsValue}>
                  {decimal(selectedPlayer.avgObjectivePrestigePerGame)}
                </Text>
                <Text style={styles.analyticsSub}>Avg objective prestige/game</Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>Support Output</Text>
                <Text style={styles.analyticsValue}>
                  {decimal(selectedPlayer.avgAssistsGivenPerGame)}
                </Text>
                <Text style={styles.analyticsSub}>Avg assists/game</Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>Early Tempo</Text>
                <Text style={styles.analyticsValue}>
                  {percent(selectedPlayer.earlyLeadRate)}
                </Text>
                <Text style={styles.analyticsSub}>Early lead rate</Text>
              </View>

              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsLabel}>Error Rate</Text>
                <Text style={styles.analyticsValue}>
                  {percent(selectedPlayer.failureRate)}
                </Text>
                <Text style={styles.analyticsSub}>Failure rate</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Select a player to view analytics.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.blue,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 14,
  },

  heroCard: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroLabel: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroBody: {
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  heroBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  heroStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  heroStatCard: {
    width: '47%',
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 14,
    padding: 12,
  },
  heroStatLabel: {
    color: COLORS.sub,
    fontSize: 12,
    marginBottom: 6,
  },
  heroStatValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  heroStatSub: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 4,
  },

  insightStrip: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightChip: {
    color: COLORS.amber,
    backgroundColor: COLORS.amberSoft,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
  },
  insightText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 13,
  },

  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leaderboardRowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(168,85,247,0.10)',
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leaderboardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rankPill: {
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
  },
  rankPillText: {
    color: COLORS.blue,
    fontWeight: '800',
    fontSize: 12,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  playerSub: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 2,
  },
  eloValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  eloSub: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 2,
  },

  correlationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  correlationCard: {
    width: '48.4%',
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 14,
    padding: 12,
  },
  correlationLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  correlationPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  correlationPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  correlationStrength: {
    color: COLORS.sub,
    fontSize: 12,
  },

  playerChipRow: {
    paddingBottom: 2,
    gap: 8,
  },
  playerChip: {
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerChipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  playerChipText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: '700',
  },
  playerChipTextActive: {
    color: COLORS.accent,
  },

  featuredPlayerCard: {
    marginTop: 14,
    backgroundColor: COLORS.cardAlt,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featuredPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  featuredEyebrow: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  featuredName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  featuredDescriptor: {
    color: COLORS.sub,
    fontSize: 13,
    marginTop: 4,
  },
  featuredEloBadge: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 84,
  },
  featuredEloValue: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  featuredEloLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  featuredNarrative: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  featuredStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  featureTile: {
    width: '47.5%',
    borderRadius: 14,
    padding: 12,
  },
  tileAccent: {
    backgroundColor: COLORS.accentSoft,
  },
  tileBlue: {
    backgroundColor: COLORS.blueSoft,
  },
  tileGreen: {
    backgroundColor: COLORS.greenSoft,
  },
  tileAmber: {
    backgroundColor: COLORS.amberSoft,
  },
  featureTileLabel: {
    color: COLORS.sub,
    fontSize: 12,
    marginBottom: 8,
  },
  featureTileValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },

  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  analyticsCard: {
    width: '48.4%',
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 14,
    padding: 12,
  },
  analyticsLabel: {
    color: COLORS.sub,
    fontSize: 12,
    marginBottom: 8,
  },
  analyticsValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  analyticsSub: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
});
