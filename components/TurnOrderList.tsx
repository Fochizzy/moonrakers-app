import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useGames, usePlayers } from '@/store/useStore';
import Text from '@/components/ui/Text';
import AnimatedCard from '@/components/ui/AnimatedCard';
import ChartShell from './ChartShell';
import { buildPlayerInsights } from '@/utils/playerInsights';

type Props = {
  playerId: string;
};

type Player = {
  id: string;
  name: string;
};

type StoredTotals = {
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type StoredGame = {
  id?: string;
  winnerId?: string;
  totals?: Record<string, StoredTotals>;
};

const EMPTY_GAMES: StoredGame[] = [];
const EMPTY_PLAYERS: Player[] = [];
const EMPTY_RELATIONSHIPS: Record<string, Record<string, number>> = {};

function InsightCard({
  index,
  text,
}: {
  index: number;
  text: string;
}) {
  return (
    <AnimatedCard style={styles.card}>
      <View style={styles.cardGlow} />

      <View style={styles.cardHeader}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>

        <Text style={styles.cardLabel}>TACTICAL INSIGHT</Text>
      </View>

      <Text style={styles.text}>{text}</Text>
    </AnimatedCard>
  );
}

function EmptyState() {
  return (
    <AnimatedCard style={[styles.card, styles.emptyCard]}>
      <View style={styles.cardGlow} />

      <View style={styles.emptyHeader}>
        <View style={styles.emptyDot} />
        <Text style={styles.emptyTitle}>SCAN INCOMPLETE</Text>
      </View>

      <Text style={styles.emptyText}>
        No insight patterns detected yet. Play more games to unlock behavioral and performance analysis.
      </Text>
    </AnimatedCard>
  );
}

export default function PlayerProfileInsights({ playerId }: Props) {
  const rawGames = useGames();
  const rawPlayers = usePlayers();

  const games = Array.isArray(rawGames)
    ? (rawGames as StoredGame[])
    : EMPTY_GAMES;

  const players = Array.isArray(rawPlayers)
    ? (rawPlayers as Player[])
    : EMPTY_PLAYERS;

  const insights = useMemo<string[]>(() => {
    if (!playerId) return [];

    return buildPlayerInsights(
      games,
      playerId,
      players,
      EMPTY_RELATIONSHIPS
    );
  }, [games, playerId, players]);

  return (
    <ChartShell
      title="Play Profile Insights"
      subtitle="Behavioral scan and performance signals derived from saved match history."
    >
      <View style={styles.container}>
        {insights.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.list}>
            {insights.map((insight, index) => (
              <InsightCard
                key={`${playerId}-${index}`}
                index={index}
                text={insight}
              />
            ))}
          </View>
        )}
      </View>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  list: {
    gap: 10,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.16)',
    backgroundColor: '#10182F',
    shadowColor: '#63E6FF',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  emptyCard: {
    minHeight: 110,
    justifyContent: 'center',
  },
  cardGlow: {
    position: 'absolute',
    top: -24,
    right: -10,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(99,230,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  indexBadge: {
    minWidth: 34,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,230,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99,230,255,0.28)',
    marginRight: 8,
  },
  indexText: {
    color: '#63E6FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cardLabel: {
    color: '#8FA1C7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  text: {
    color: '#EAF1FF',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#63E6FF',
    marginRight: 8,
  },
  emptyTitle: {
    color: '#DCE7FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  emptyText: {
    color: '#8FA1C7',
    fontSize: 12,
    lineHeight: 18,
  },
});


