import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import ColorPlayerCard from '@/app/ColorPlayerCard';

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
  elo?: number;
  rating?: number;
  wins?: number;
  gamesPlayed?: number;
  prestige?: number;
  totalPrestige?: number;
  score?: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getWinnerId(game: any) {
  return game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId;
}

function getGameEntryForPlayer(game: any, playerId: string) {
  const gamePlayers = Array.isArray(game?.players) ? game.players : [];
  return gamePlayers.find((p: any) => p?.id === playerId || p?.playerId === playerId);
}

function getGameTotalsForPlayer(game: any, playerId: string) {
  return game?.totals?.[playerId];
}

function getPrestigeFromGame(game: any, playerId: string) {
  const totals = getGameTotalsForPlayer(game, playerId);
  if (totals) {
    const explicit = totals?.totalPrestige ?? totals?.prestige;
    if (typeof explicit === 'number' && Number.isFinite(explicit)) {
      return explicit;
    }
    return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
  }

  const entry = getGameEntryForPlayer(game, playerId);
  return toNumber(entry?.totalPrestige ?? entry?.prestige ?? entry?.finalPrestige ?? entry?.score);
}

function getScoreFromGame(game: any, playerId: string) {
  const totals = getGameTotalsForPlayer(game, playerId);
  if (totals) {
    return toNumber(totals?.score);
  }
  const entry = getGameEntryForPlayer(game, playerId);
  return toNumber(entry?.score);
}

function derivePlayerCardStats(player: PlayerLike, games: any[]) {
  const savedWins = toNumber(player.wins);
  const savedGames = toNumber(player.gamesPlayed);
  const savedPrestige = toNumber(player.totalPrestige ?? player.prestige);
  const savedScore = toNumber(player.score);

  let winsFromGames = 0;
  let gamesFromGames = 0;
  let prestigeFromGames = 0;
  let scoreFromGames = 0;

  for (const game of Array.isArray(games) ? games : []) {
    const entry = getGameEntryForPlayer(game, player.id);
    const totals = getGameTotalsForPlayer(game, player.id);
    if (!entry && !totals) continue;

    gamesFromGames += 1;
    prestigeFromGames += getPrestigeFromGame(game, player.id);
    scoreFromGames += getScoreFromGame(game, player.id);

    const placement = toNumber(entry?.placement ?? entry?.place ?? entry?.rank);
    const isWinner =
      getWinnerId(game) === player.id ||
      entry?.isWinner === true ||
      entry?.won === true ||
      placement === 1;

    if (isWinner) winsFromGames += 1;
  }

  const totalGames = savedGames + gamesFromGames;
  const totalWins = savedWins + winsFromGames;
  const totalPrestige = savedPrestige + prestigeFromGames;
  const totalScore = savedScore + scoreFromGames;
  const elo = toNumber(player.elo ?? player.rating);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return {
    elo,
    wins: totalWins,
    gamesPlayed: totalGames,
    totalPrestige,
    score: totalScore,
    title: totalWins > 0 ? `${totalWins} wins • ${winRate}% win rate` : 'Rising fleet commander',
    subtitle: totalGames > 0 ? `${totalGames} games logged across saved and new results` : 'No logged games yet',
  };
}

export default function PlayerCardsScreen() {
  const router = useRouter();

  const players = useStore((s: any) => (Array.isArray(s.players) ? s.players : [])) as PlayerLike[];
  const games = useStore((s: any) => (Array.isArray(s.games) ? s.games : [])) as any[];

  const cards = useMemo(() => {
    return players
      .map((player) => ({
        ...player,
        ...derivePlayerCardStats(player, games),
      }))
      .sort((a, b) => {
        if (b.totalPrestige !== a.totalPrestige) return b.totalPrestige - a.totalPrestige;
        if (b.elo !== a.elo) return b.elo - a.elo;
        return a.name.localeCompare(b.name);
      });
  }, [players, games]);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
        <View style={styles.topGlow} />
        <View style={styles.sideGlow} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>FLEET ROSTER</Text>
          <Text style={styles.title}>Player&apos;s Cards</Text>
          <Text style={styles.subtitle}>
            A high-level playing-card view for each commander, built from ColorPlayerCard and fed by combined saved stats plus logged games.
          </Text>
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No player cards yet</Text>
            <Text style={styles.emptyText}>Add players and games to generate the roster.</Text>
          </View>
        ) : (
          cards.map((player) => (
            <ColorPlayerCard
              key={player.id}
              player={player}
              onPress={() =>
                router.push({
                  pathname: '/player-profile/[playerId]' as const,
                  params: { playerId: player.id },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050916',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,8,18,0.38)',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -40,
    right: -40,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(99,230,255,0.08)',
  },
  sideGlow: {
    position: 'absolute',
    right: -70,
    top: '22%',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(181,124,255,0.08)',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    backgroundColor: 'rgba(10,18,32,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
  },
  eyebrow: {
    color: '#67E8F9',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  title: {
    color: '#F8FBFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#A4B5D8',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(10,18,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  emptyTitle: {
    color: '#F8FBFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptyText: {
    color: '#8FA1C7',
    fontSize: 13,
    fontWeight: '700',
  },
});
