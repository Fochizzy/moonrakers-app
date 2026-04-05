import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import RankBadge from '@/components/RankBadge';
import { calculateElo } from '@/utils/elo';

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
  id: string;
  name: string;
  color?: string;
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
  stats?: PlayerStats;
};

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
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

type SortMetric =
  | 'totalPrestige'
  | 'elo'
  | 'winRate'
  | 'efficiency'
  | 'assistedEfficiency'
  | 'directEfficiency'
  | 'directPrestige'
  | 'assistPrestige'
  | 'failureRate'
  | 'riskFactor'
  | 'score';

type EnrichedPlayer = {
  player: Player;
  elo: number;
  winRate: number;
  efficiency: number;
  assistedEfficiency: number;
  directEfficiency: number;
  failureRate: number;
  riskFactor: number;
  gamesPlayed: number;
  wins: number;
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistShare: number;
  totalContracts: number;
  totalAssists: number;
  totalFailures: number;
  totalScore: number;
};

const SORT_OPTIONS: { key: SortMetric; label: string; shortLabel: string }[] = [
  { key: 'totalPrestige', label: 'Total Prestige', shortLabel: 'Prestige' },
  { key: 'score', label: 'Score', shortLabel: 'Score' },
  { key: 'elo', label: 'ELO', shortLabel: 'ELO' },
  { key: 'winRate', label: 'Win %', shortLabel: 'Win %' },
  { key: 'efficiency', label: 'All Contracts Efficiency', shortLabel: 'All Eff' },
  { key: 'assistedEfficiency', label: 'Assistance Efficiency', shortLabel: 'Ast Eff' },
  { key: 'directEfficiency', label: 'Direct Efficiency', shortLabel: 'Dir Eff' },
  { key: 'failureRate', label: 'Failure %', shortLabel: 'Fail %' },
  { key: 'riskFactor', label: 'Risk', shortLabel: 'Risk' },
  { key: 'directPrestige', label: 'Direct Prestige', shortLabel: 'Direct' },
  { key: 'assistPrestige', label: 'Assist Prestige', shortLabel: 'Assist' },
];

const sciFi = {
  bg: '#060816',
  panel: '#0D1428',
  panel2: '#111B36',
  panel3: '#162447',
  border: 'rgba(120,160,255,0.14)',
  borderStrong: 'rgba(99,230,255,0.34)',
  text: '#F4F7FF',
  textSoft: '#C7D2EA',
  textDim: '#8C9ABB',
  cyan: '#63E6FF',
  blue: '#78A8FF',
  violet: '#B57CFF',
  gold: '#FFD76A',
  green: '#4CE0B3',
  red: '#FF7183',
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function formatMetric(metric: SortMetric, value: number) {
  switch (metric) {
    case 'elo':
      return Math.round(value).toString();
    case 'winRate':
    case 'failureRate':
      return `${(value * 100).toFixed(1)}%`;
    case 'efficiency':
    case 'assistedEfficiency':
    case 'directEfficiency':
    case 'riskFactor':
      return value.toFixed(2);
    case 'score':
      return value.toFixed(0);
    case 'totalPrestige':
    case 'directPrestige':
    case 'assistPrestige':
    default:
      return value.toFixed(0);
  }
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function getSortValue(entry: EnrichedPlayer, sortBy: SortMetric): number {
  switch (sortBy) {
    case 'elo':
      return entry.elo;
    case 'winRate':
      return entry.winRate;
    case 'efficiency':
      return entry.efficiency;
    case 'assistedEfficiency':
      return entry.assistedEfficiency;
    case 'directEfficiency':
      return entry.directEfficiency;
    case 'directPrestige':
      return entry.directPrestige;
    case 'assistPrestige':
      return entry.assistPrestigeReceived;
    case 'failureRate':
      return entry.failureRate;
    case 'riskFactor':
      return entry.riskFactor;
    case 'score':
      return entry.totalScore;
    case 'totalPrestige':
    default:
      return entry.totalPrestige;
  }
}

function getTotalPrestige(totals?: Totals) {
  const direct = toNumber(totals?.directPrestige);
  const assist = toNumber(totals?.assistPrestigeReceived);
  const explicit = totals?.totalPrestige ?? totals?.prestige;

  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return direct + assist;
}

function getPlayerStat(player: Player, key: keyof PlayerStats) {
  const nested = player.stats?.[key];
  const direct = player[key];
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

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getRankAccent(index: number) {
  if (index === 0) return sciFi.gold;
  if (index === 1) return '#D9E4F7';
  if (index === 2) return '#D6A06A';
  return sciFi.cyan;
}

function MetricChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View
      style={[
        styles.metricChip,
        accent ? { borderColor: `${accent}44` } : null,
      ]}
    >
      <Text style={styles.metricChipLabel}>{label}</Text>
      <Text
        style={[
          styles.metricChipValue,
          accent ? { color: accent } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function LeaderHero({
  top,
  sortBy,
}: {
  top?: EnrichedPlayer;
  sortBy: SortMetric;
}) {
  if (!top) return null;

  const currentSort = SORT_OPTIONS.find((item) => item.key === sortBy);

  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroEyebrow}>FLAGSHIP LEADER</Text>

      <View style={styles.heroHeaderRow}>
        <View style={styles.heroIdentity}>
          <View style={styles.heroRankBadge}>
            <Text style={styles.heroRankBadgeText}>#01</Text>
          </View>

          <View style={styles.heroNameBlock}>
            <Text style={styles.heroName}>{top.player.name}</Text>
            <Text style={styles.heroMeta}>
              {top.gamesPlayed} games • {top.wins} wins • {Math.round(top.elo)} ELO
            </Text>
          </View>
        </View>

        <RankBadge rating={top.elo} size="sm" uppercase />
      </View>

      <View style={styles.heroPrimaryRow}>
        <View style={styles.heroPrimaryMetric}>
          <Text style={styles.heroPrimaryLabel}>TOTAL PRESTIGE</Text>
          <Text style={styles.heroPrimaryValue}>
            {top.totalPrestige.toFixed(0)}
          </Text>
        </View>

        <View style={styles.heroSecondaryMetric}>
          <Text style={styles.heroSecondaryLabel}>ACTIVE SORT</Text>
          <Text style={styles.heroSecondaryValue}>
            {currentSort?.label}: {formatMetric(sortBy, getSortValue(top, sortBy))}
          </Text>
        </View>
      </View>

      <View style={styles.heroChips}>
        <MetricChip label="Win %" value={formatPercent(top.winRate)} accent={sciFi.cyan} />
        <MetricChip label="Score" value={top.totalScore.toFixed(0)} accent={sciFi.blue} />
        <MetricChip label="All Eff" value={top.efficiency.toFixed(2)} accent={sciFi.green} />
        <MetricChip label="Assist Share" value={formatPercent(top.assistShare)} accent={sciFi.violet} />
      </View>
    </View>
  );
}

export function LeaderboardContent({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const [sortBy, setSortBy] = useState<SortMetric>('totalPrestige');

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as Player[];

  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as Game[];

  const eloMap = useMemo(() => {
    try {
      return calculateElo(games as any) ?? {};
    } catch {
      return {};
    }
  }, [games]);

  const enriched = useMemo<EnrichedPlayer[]>(() => {
    return players.map((player) => {
      let gameGamesPlayed = 0;
      let gameWins = 0;
      let gameTotalPrestige = 0;
      let gameDirectPrestige = 0;
      let gameAssistPrestigeReceived = 0;
      let gameTotalContracts = 0;
      let gameTotalAssists = 0;
      let gameTotalFailures = 0;
      let gameTotalScore = 0;

      for (const game of games) {
        const totals = game.totals?.[player.id];
        if (!totals) continue;

        gameGamesPlayed += 1;

        const prestige = getTotalPrestige(totals);
        const direct = toNumber(totals.directPrestige);
        const assistReceived =
          typeof totals.assistPrestigeReceived === 'number' &&
          Number.isFinite(totals.assistPrestigeReceived)
            ? toNumber(totals.assistPrestigeReceived)
            : Math.max(0, prestige - direct);

        const contracts = toNumber(totals.contracts);
        const assists = toNumber(totals.assists);
        const failures = toNumber(totals.failures);
        const score = toNumber(totals.score);

        gameTotalPrestige += prestige;
        gameDirectPrestige += direct;
        gameAssistPrestigeReceived += assistReceived;
        gameTotalContracts += contracts;
        gameTotalAssists += assists;
        gameTotalFailures += failures;
        gameTotalScore += score;

        if (getWinnerId(game) === player.id) {
          gameWins += 1;
        }
      }

      const savedGamesPlayed = getPlayerStat(player, 'gamesPlayed');
      const savedWins = getPlayerStat(player, 'wins');
      const savedTotalPrestige = getPlayerTotalPrestige(player);
      const savedDirectPrestige = getPlayerStat(player, 'directPrestige');
      const savedAssistPrestigeReceived = getPlayerStat(player, 'assistPrestigeReceived');
      const savedContracts = getPlayerStat(player, 'contracts');
      const savedAssists = getPlayerStat(player, 'assists');
      const savedFailures = getPlayerStat(player, 'failures');
      const savedScore = getPlayerStat(player, 'score');

      const totalPrestige =
        gameTotalPrestige > 0 ? gameTotalPrestige : savedTotalPrestige;

      const directPrestige =
        gameDirectPrestige > 0 ? gameDirectPrestige : savedDirectPrestige;

      const assistPrestigeReceived =
        gameAssistPrestigeReceived > 0
          ? gameAssistPrestigeReceived
          : savedAssistPrestigeReceived > 0
            ? savedAssistPrestigeReceived
            : Math.max(0, totalPrestige - directPrestige);

      const totalContracts =
        gameTotalContracts > 0 ? gameTotalContracts : savedContracts;

      const totalAssists =
        gameTotalAssists > 0 ? gameTotalAssists : savedAssists;

      const totalFailures =
        gameTotalFailures > 0 ? gameTotalFailures : savedFailures;

      const totalScore =
        gameTotalScore > 0 ? gameTotalScore : savedScore;

      const wins =
        gameWins > 0 || gameGamesPlayed > 0 ? gameWins : savedWins;

      const gamesPlayed =
        gameGamesPlayed > 0 ? gameGamesPlayed : savedGamesPlayed;

      const attempts = totalContracts + totalFailures;
      const winRate = safeDivide(wins, gamesPlayed);
      const allContractsEfficiency = safeDivide(
        directPrestige + assistPrestigeReceived,
        totalContracts + totalAssists
      );
      const assistanceEfficiency = safeDivide(
        assistPrestigeReceived,
        totalAssists
      );
      const directEfficiency = safeDivide(
        directPrestige,
        totalContracts
      );
      const assistShare = safeDivide(assistPrestigeReceived, totalPrestige);
      const failureRate = safeDivide(totalFailures, attempts);
      const riskFactor = safeDivide(totalFailures, Math.max(1, totalContracts));

      return {
        player,
        elo: eloMap[player.id] ?? 1000,
        winRate,
        efficiency: allContractsEfficiency,
        assistedEfficiency: assistanceEfficiency,
        directEfficiency,
        failureRate,
        riskFactor,
        gamesPlayed,
        wins,
        totalPrestige,
        directPrestige,
        assistPrestigeReceived,
        assistShare,
        totalContracts,
        totalAssists,
        totalFailures,
        totalScore,
      };
    });
  }, [players, games, eloMap]);

  const ranked = useMemo(() => {
    return [...enriched]
      .filter(
        (entry) =>
          entry.gamesPlayed > 0 ||
          entry.totalPrestige > 0 ||
          entry.totalScore > 0 ||
          entry.wins > 0
      )
      .sort((a, b) => {
        const primaryDiff = getSortValue(b, sortBy) - getSortValue(a, sortBy);
        if (primaryDiff !== 0) return primaryDiff;
        if (b.totalPrestige !== a.totalPrestige) return b.totalPrestige - a.totalPrestige;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.elo !== a.elo) return b.elo - a.elo;
        return a.player.name.localeCompare(b.player.name);
      });
  }, [enriched, sortBy]);

  const topPlayer = ranked[0];

  if (embedded) {
    const embeddedRows = ranked.slice(0, 3);

    return (
      <View style={styles.embeddedRoot}>
        <View style={styles.embeddedCompactWrap}>
          <View style={styles.embeddedSortOnly}>
            <View style={styles.toggleWrap}>
              {SORT_OPTIONS.map((option) => {
                const active = sortBy === option.key;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setSortBy(option.key)}
                    style={[
                      styles.toggleButton,
                      styles.embeddedToggleButton,
                      active && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        styles.embeddedToggleText,
                        active && styles.toggleTextActive,
                      ]}
                    >
                      {option.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {embeddedRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEyebrow}>NO SIGNAL</Text>
              <Text style={styles.emptyText}>No leaderboard data yet.</Text>
            </View>
          ) : (
            <View style={styles.embeddedMiniList}>
              {embeddedRows.map((entry, index) => {
                const accent = getRankAccent(index);
                const currentSort = SORT_OPTIONS.find((item) => item.key === sortBy);

                return (
                  <View
                    key={entry.player.id}
                    style={[
                      styles.embeddedMiniRow,
                      { borderColor: `${accent}44` },
                    ]}
                  >
                    <View
                      style={[
                        styles.embeddedMiniRail,
                        { backgroundColor: accent },
                      ]}
                    />

                    <View
                      style={[
                        styles.embeddedMiniRank,
                        {
                          borderColor: `${accent}44`,
                          backgroundColor: `${accent}12`,
                        },
                      ]}
                    >
                      <Text style={[styles.embeddedMiniRankText, { color: accent }]}>
                        #{index + 1}
                      </Text>
                    </View>

                    <View style={styles.embeddedMiniMain}>
                      <Text style={styles.embeddedMiniName} numberOfLines={1}>
                        {entry.player.name}
                      </Text>
                      <Text style={styles.embeddedMiniMeta} numberOfLines={1}>
                        {entry.gamesPlayed}g • {entry.wins}w • {Math.round(entry.elo)} ELO
                      </Text>
                    </View>

                    <View style={styles.embeddedMiniValueWrap}>
                      <Text style={styles.embeddedMiniValueLabel}>
                        {currentSort?.shortLabel ?? 'Stat'}
                      </Text>
                      <Text style={[styles.embeddedMiniValue, { color: accent }]}>
                        {formatMetric(sortBy, getSortValue(entry, sortBy))}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>COMMAND RANKINGS</Text>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>
            Full leaderboard analysis across prestige, score, ELO, win rate,
            and the new efficiency model.
          </Text>
        </View>

        <LeaderHero top={topPlayer} sortBy={sortBy} />

        <View style={styles.sortSection}>
          <Text style={styles.sortSectionTitle}>SORT METRIC</Text>

          <View style={styles.toggleWrap}>
            {SORT_OPTIONS.map((option) => {
              const active = sortBy === option.key;

              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSortBy(option.key)}
                  style={[
                    styles.toggleButton,
                    active && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      active && styles.toggleTextActive,
                    ]}
                  >
                    {option.shortLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {ranked.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEyebrow}>NO SIGNAL</Text>
            <Text style={styles.emptyText}>No leaderboard data yet.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {ranked.map((entry, index) => {
              const accent = getRankAccent(index);
              const currentSort = SORT_OPTIONS.find((item) => item.key === sortBy);

              return (
                <View
                  key={entry.player.id}
                  style={[
                    styles.card,
                    index < 3 && { borderColor: `${accent}55` },
                  ]}
                >
                  <View
                    style={[
                      styles.cardAccentRail,
                      { backgroundColor: accent },
                    ]}
                  />

                  <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                      <View
                        style={[
                          styles.rankCapsule,
                          { borderColor: `${accent}55` },
                        ]}
                      >
                        <Text style={[styles.rankNumber, { color: accent }]}>
                          #{index + 1}
                        </Text>
                      </View>

                      <View style={styles.nameBlock}>
                        <View style={styles.nameRow}>
                          <Text style={styles.rank}>{entry.player.name}</Text>
                          <RankBadge rating={entry.elo} size="sm" uppercase />
                        </View>

                        <Text style={styles.gamesText}>
                          {entry.gamesPlayed} game{entry.gamesPlayed === 1 ? '' : 's'} •{' '}
                          {entry.wins} win{entry.wins === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.primaryRow}>
                    <View style={styles.primaryStatCard}>
                      <Text style={styles.primaryStatLabel}>TOTAL PRESTIGE</Text>
                      <Text style={styles.primaryStatValue}>
                        {entry.totalPrestige.toFixed(0)}
                      </Text>
                    </View>

                    <View style={styles.sortStatCard}>
                      <Text style={styles.sortStatLabel}>ACTIVE SORT</Text>
                      <Text style={styles.sortStatValue}>
                        {currentSort?.shortLabel}
                      </Text>
                      <Text style={styles.sortStatSubvalue}>
                        {formatMetric(sortBy, getSortValue(entry, sortBy))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricGrid}>
                    <MetricChip label="Direct Prestige" value={entry.directPrestige.toFixed(0)} />
                    <MetricChip label="Assist Prestige" value={entry.assistPrestigeReceived.toFixed(0)} accent={sciFi.violet} />
                    <MetricChip label="Score" value={entry.totalScore.toFixed(0)} accent={sciFi.blue} />
                    <MetricChip label="Wins" value={entry.wins.toString()} />
                    <MetricChip label="Win %" value={formatPercent(entry.winRate)} accent={sciFi.cyan} />
                    <MetricChip label="All Eff" value={entry.efficiency.toFixed(2)} accent={sciFi.green} />
                    <MetricChip label="Assist Eff" value={entry.assistedEfficiency.toFixed(2)} />
                    <MetricChip label="Direct Eff" value={entry.directEfficiency.toFixed(2)} />
                    <MetricChip label="Fail %" value={formatPercent(entry.failureRate)} accent={sciFi.red} />
                    <MetricChip label="Risk" value={entry.riskFactor.toFixed(2)} accent={sciFi.gold} />
                    <MetricChip label="Contracts" value={entry.totalContracts.toFixed(0)} />
                    <MetricChip label="Assists" value={entry.totalAssists.toFixed(0)} />
                    <MetricChip label="Failures" value={entry.totalFailures.toFixed(0)} />
                    <MetricChip label="Assist Share" value={formatPercent(entry.assistShare)} accent={sciFi.violet} />
                    <MetricChip label="ELO" value={Math.round(entry.elo).toString()} accent={sciFi.cyan} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function LeaderboardScreen() {
  return <LeaderboardContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sciFi.bg,
  },
  embeddedRoot: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: sciFi.panel,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,6,14,0.26)',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  pageHeader: {
    marginBottom: 4,
  },
  eyebrow: {
    color: sciFi.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    color: sciFi.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: sciFi.textSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  heroCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: sciFi.panel2,
    borderWidth: 1,
    borderColor: 'rgba(255,215,106,0.30)',
    shadowColor: sciFi.gold,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  heroEyebrow: {
    color: sciFi.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  heroRankBadge: {
    minWidth: 58,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,215,106,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,106,0.30)',
    marginRight: 12,
  },
  heroRankBadgeText: {
    color: sciFi.gold,
    fontSize: 16,
    fontWeight: '900',
  },
  heroNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    color: sciFi.text,
    fontSize: 22,
    fontWeight: '900',
  },
  heroMeta: {
    marginTop: 4,
    color: sciFi.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  heroPrimaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  heroPrimaryMetric: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: sciFi.panel3,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  heroSecondaryMetric: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: sciFi.panel3,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  heroPrimaryLabel: {
    color: sciFi.textDim,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroPrimaryValue: {
    marginTop: 6,
    color: sciFi.text,
    fontSize: 28,
    fontWeight: '900',
  },
  heroSecondaryLabel: {
    color: sciFi.textDim,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroSecondaryValue: {
    marginTop: 8,
    color: sciFi.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  sortSection: {
    marginTop: 2,
    marginBottom: 2,
  },
  sortSectionTitle: {
    color: sciFi.textSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  toggleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: sciFi.border,
    backgroundColor: sciFi.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    borderColor: sciFi.borderStrong,
    backgroundColor: 'rgba(99,230,255,0.10)',
  },
  toggleText: {
    color: sciFi.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: sciFi.cyan,
  },
  list: {
    gap: 12,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 14,
    backgroundColor: sciFi.panel2,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  cardAccentRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rankCapsule: {
    minWidth: 56,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rank: {
    color: sciFi.text,
    fontSize: 18,
    fontWeight: '900',
    flexShrink: 1,
  },
  gamesText: {
    marginTop: 4,
    color: sciFi.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryStatCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: sciFi.panel3,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  sortStatCard: {
    width: 120,
    borderRadius: 18,
    padding: 14,
    backgroundColor: sciFi.panel3,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  primaryStatLabel: {
    color: sciFi.textDim,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  primaryStatValue: {
    marginTop: 6,
    color: sciFi.text,
    fontSize: 26,
    fontWeight: '900',
  },
  sortStatLabel: {
    color: sciFi.textDim,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sortStatValue: {
    marginTop: 6,
    color: sciFi.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  sortStatSubvalue: {
    marginTop: 4,
    color: sciFi.cyan,
    fontSize: 18,
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  metricChip: {
    minWidth: 92,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  metricChipLabel: {
    color: sciFi.textDim,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricChipValue: {
    marginTop: 5,
    color: sciFi.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: sciFi.panel2,
    borderWidth: 1,
    borderColor: sciFi.border,
  },
  emptyEyebrow: {
    color: sciFi.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  emptyText: {
    color: sciFi.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },

  embeddedCompactWrap: {
    padding: 12,
    gap: 10,
  },
  embeddedSortOnly: {
    marginBottom: 2,
  },
  embeddedToggleButton: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  embeddedToggleText: {
    fontSize: 11,
  },
  embeddedMiniList: {
    gap: 8,
  },
  embeddedMiniRow: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: sciFi.panel2,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  embeddedMiniRail: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 999,
  },
  embeddedMiniRank: {
    minWidth: 44,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  embeddedMiniRankText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  embeddedMiniMain: {
    flex: 1,
    minWidth: 0,
  },
  embeddedMiniName: {
    color: sciFi.text,
    fontSize: 15,
    fontWeight: '900',
  },
  embeddedMiniMeta: {
    marginTop: 3,
    color: sciFi.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  embeddedMiniValueWrap: {
    alignItems: 'flex-end',
    minWidth: 68,
  },
  embeddedMiniValueLabel: {
    color: sciFi.textDim,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  embeddedMiniValue: {
    fontSize: 15,
    fontWeight: '900',
  },
});
