import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import StarryNight from '@/components/ui/StarryNight';
import { useGames, usePlayers } from '@/store/useStore';
import CorrelationStats from '@/components/CorrelationStats';
import InsightList from '@/components/InsightList';
import AssistNetworkOverview from '@/components/charts/AssistNetworkOverview';
import {
  buildRelationships,
  canonicalizeGames,
  collectUnifiedGames,
} from '@/utils/charts';

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
};

type StoredTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type StoredGame = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, StoredTotals>;
  players?: Array<{
    id: string;
    startOrder?: number;
  }>;
  createdAt?: number;
};

type Insight = {
  type: string;
  label: string;
  value: number;
  playerId?: string;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function avg(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}

function getWinnerId(game: StoredGame): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getTotalPrestige(totals?: StoredTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    toNumber(totals?.directPrestige) +
    toNumber(totals?.assistPrestigeReceived)
  );
}

function buildTopInsights(
  games: StoredGame[],
  players: PlayerLike[],
): Insight[] {
  const insights: Insight[] = [];

  for (const player of players) {
    let gamesPlayed = 0;
    let wins = 0;
    let totalPrestige = 0;
    let totalContracts = 0;
    let totalAssists = 0;
    let totalFailures = 0;

    for (const game of games) {
      const totals = game.totals?.[player.id];
      if (!totals) continue;

      gamesPlayed += 1;
      totalPrestige += getTotalPrestige(totals);
      totalContracts += toNumber(totals.contracts);
      totalAssists += toNumber(totals.assists);
      totalFailures += toNumber(totals.failures);

      if (getWinnerId(game) === player.id) {
        wins += 1;
      }
    }

    if (gamesPlayed === 0) continue;

    const winRate = wins / gamesPlayed;
    const efficiency =
      totalContracts > 0 ? totalPrestige / totalContracts : 0;
    const assistShare =
      totalContracts + totalAssists > 0
        ? totalAssists / (totalContracts + totalAssists)
        : 0;
    const failureRate =
      totalContracts + totalAssists > 0
        ? totalFailures / (totalContracts + totalAssists)
        : 0;

    insights.push({ type: 'winRate', label: 'Win Rate', value: winRate, playerId: player.id });
    insights.push({ type: 'efficiency', label: 'Efficiency', value: efficiency, playerId: player.id });
    insights.push({ type: 'assistShare', label: 'Assist Share', value: assistShare, playerId: player.id });
    insights.push({ type: 'failureRate', label: 'Failure Rate', value: failureRate, playerId: player.id });
  }

  return insights.sort((a, b) => b.value - a.value).slice(0, 16);
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {!!sublabel && <Text style={styles.metricSub}>{sublabel}</Text>}
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();

  const players = (usePlayers() ?? []) as PlayerLike[];
  const games = (useGames() ?? []) as StoredGame[];
  const unifiedGames = useMemo(
    () =>
      canonicalizeGames(
        collectUnifiedGames({ games } as any),
        players as any,
      ),
    [games, players],
  );

  const relationships = useMemo(
    () => buildRelationships(players as any, unifiedGames as any),
    [players, unifiedGames],
  );

  const globalStats = useMemo(() => {
    let totalPrestige = 0;
    let totalScore = 0;
    let totalContracts = 0;
    let totalAssists = 0;
    let totalFailures = 0;
    let playerRows = 0;

    for (const game of games) {
      for (const totals of Object.values(game.totals ?? {})) {
        totalPrestige += getTotalPrestige(totals);
        totalScore += toNumber(totals?.score);
        totalContracts += toNumber(totals?.contracts);
        totalAssists += toNumber(totals?.assists);
        totalFailures += toNumber(totals?.failures);
        playerRows += 1;
      }
    }

    return {
      games: games.length,
      playerRows,
      avgPrestige: avg(totalPrestige, playerRows),
      avgScore: avg(totalScore, playerRows),
      avgContracts: avg(totalContracts, playerRows),
      avgAssists: avg(totalAssists, playerRows),
      failureRate:
        totalContracts + totalAssists > 0
          ? totalFailures / (totalContracts + totalAssists)
          : 0,
    };
  }, [games]);

  const topInsights = useMemo(() => buildTopInsights(games, players), [games, players]);

  const totalRelationships = useMemo(() => {
    let total = 0;
    for (const nested of Object.values(relationships)) {
      if (!nested || typeof nested !== 'object') continue;
      for (const value of Object.values(nested as Record<string, number>)) {
        total += toNumber(value);
      }
    }
    return total;
  }, [relationships]);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Moonrakers</Text>
          <Text style={styles.title}>Insights Hub</Text>
          <Text style={styles.subtitle}>
            Global meta, ranked signals, and synergy clues.
          </Text>

          <View style={styles.linkRow}>
            <Pressable style={styles.linkButton} onPress={() => router.push('/charts/compare')}>
              <Text style={styles.linkButtonText}>Compare</Text>
            </Pressable>
            <Pressable style={styles.linkButton} onPress={() => router.push('/stats')}>
              <Text style={styles.linkButtonText}>Stats</Text>
            </Pressable>
            <Pressable
              style={styles.linkButton}
              onPress={() =>
                router.push({
                  pathname: '/charts/[chartKey]',
                  params: { chartKey: 'elo' },
                } as any)
              }
            >
              <Text style={styles.linkButtonText}>Elo</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Global Meta</Text>

          <View style={styles.metricGrid}>
            <MetricCard label="Games" value={globalStats.games} />
            <MetricCard label="Player Rows" value={globalStats.playerRows} />
            <MetricCard label="Avg Prestige" value={globalStats.avgPrestige.toFixed(2)} />
            <MetricCard label="Avg Score" value={globalStats.avgScore.toFixed(2)} />
            <MetricCard label="Avg Contracts" value={globalStats.avgContracts.toFixed(2)} />
            <MetricCard label="Avg Assists" value={globalStats.avgAssists.toFixed(2)} />
            <MetricCard label="Failure Rate" value={`${(globalStats.failureRate * 100).toFixed(1)}%`} />
            <MetricCard label="Relationship Weight" value={totalRelationships} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assist Network</Text>
          <AssistNetworkOverview players={players} games={unifiedGames as any} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Signals</Text>
          <InsightList insights={topInsights as Insight[]} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Correlations & Synergy</Text>
          <CorrelationStats
            games={unifiedGames}
            players={players}
            relationships={relationships}
          />
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  container: {
    padding: 14,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#162033',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#253247',
    gap: 10,
  },
  eyebrow: {
    color: '#67E8F9',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#cbd5e1',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  linkButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  linkButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#162033',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#253247',
    gap: 10,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#1b283d',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2a3850',
  },
  metricLabel: {
    fontSize: 10,
    color: '#8EA6C8',
    marginBottom: 3,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  metricSub: {
    marginTop: 3,
    fontSize: 11,
    color: '#94a3b8',
  },
});


