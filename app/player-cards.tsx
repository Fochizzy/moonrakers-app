import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import { PlayerCard as ColorPlayerCard } from '@/components/ColorPlayerCard';
import { calculateElo } from '@/utils/elo';

type PlayerLike = {
  id: string;
  name: string;
  displayName?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
  elo?: number;
  rating?: number;
  wins?: number;
  gamesPlayed?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contractsSucceeded?: number;
  contractsFailed?: number;
  objectivesCompleted?: number;
  assists?: number;
  failures?: number;
  score?: number;
  rank?: number;
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
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return {
    wins: totalWins,
    gamesPlayed: totalGames,
    totalPrestige,
    score: totalScore,
    title: totalWins > 0 ? `${totalWins} wins | ${winRate}% win rate` : 'Rising fleet commander',
    subtitle: totalGames > 0 ? `${totalGames} games logged across saved and new results` : 'No logged games yet',
  };
}

function normalizeRoutePlayerId(value: string | string[] | undefined) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0];
  }

  return null;
}

export default function PlayerCardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();
  const [playerQuery, setPlayerQuery] = useState('');

  const players = useStore((s: any) => (Array.isArray(s.players) ? s.players : [])) as PlayerLike[];
  const games = useStore((s: any) => (Array.isArray(s.games) ? s.games : [])) as any[];
  const authSession = useStore((s: any) => s.authSession);
  const authProfile = useStore((s: any) => s.authProfile);
  const selectedPlayerIdFromStore = useStore((s: any) => s?.selectedPlayerId);
  const setSelectedPlayerId = useStore((s: any) => s?.setSelectedPlayerId);

  const routePlayerId = normalizeRoutePlayerId(params.playerId);

  const eloMap = useMemo(() => {
    try {
      return calculateElo(games as any) ?? {};
    } catch {
      return {};
    }
  }, [games]);

  const rankedPlayers = useMemo(() => {
    return players
      .map((player) => ({
        ...player,
        ...derivePlayerCardStats(player, games),
        elo: Math.round(toNumber((eloMap as Record<string, number>)[String(player.id)] ?? player.elo ?? player.rating) || 1000),
      }))
      .sort((a, b) => {
        if ((b.elo ?? 0) !== (a.elo ?? 0)) return (b.elo ?? 0) - (a.elo ?? 0);
        if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
        if ((b.totalPrestige ?? 0) !== (a.totalPrestige ?? 0)) return (b.totalPrestige ?? 0) - (a.totalPrestige ?? 0);
        return a.name.localeCompare(b.name);
      })
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  }, [players, games, eloMap]);

  const activePlayerId = authProfile?.id ?? authSession?.user?.id ?? null;

  const effectivePlayerId =
    routePlayerId ||
    (activePlayerId && rankedPlayers.some((player) => String(player.id) === String(activePlayerId))
      ? activePlayerId
      : null) ||
    (typeof selectedPlayerIdFromStore === 'string' && selectedPlayerIdFromStore.trim()
      ? selectedPlayerIdFromStore
      : null) ||
    (rankedPlayers[0]?.id ? String(rankedPlayers[0].id) : null);

  const focusedPlayer = useMemo(
    () =>
      rankedPlayers.find((player) => String(player.id) === String(effectivePlayerId)) ??
      rankedPlayers[0] ??
      null,
    [rankedPlayers, effectivePlayerId],
  );

  const normalizedQuery = playerQuery.trim().toLowerCase();
  const filteredPlayers = useMemo(() => {
    if (!normalizedQuery) return [];

    return rankedPlayers.filter((player) => {
      const searchTargets = [
        player.name,
        player.displayName,
        player.initials,
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.toLowerCase());

      return searchTargets.some((value) => value.includes(normalizedQuery));
    });
  }, [rankedPlayers, normalizedQuery]);

  const isViewingLoggedInPlayer = Boolean(
    activePlayerId && focusedPlayer && String(focusedPlayer.id) === String(activePlayerId),
  );

  const handleSelectPlayer = (playerId: string) => {
    if (typeof setSelectedPlayerId === 'function') {
      setSelectedPlayerId(playerId);
    }

    setPlayerQuery('');
    router.replace({
      pathname: '/player-cards',
      params: { playerId: String(playerId) },
    });
  };

  const openFocusedProfile = () => {
    if (!focusedPlayer?.id) return;

    router.push({
      pathname: '/player-profile/[playerId]' as const,
      params: { playerId: String(focusedPlayer.id) },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
        <View style={styles.topGlow} />
        <View style={styles.sideGlow} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16 + insets.top,
            paddingBottom: 28 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>FLEET ROSTER</Text>
          <Text style={styles.title}>Player&apos;s Cards</Text>
          <Text style={styles.subtitle}>
            Start on your commander card, then search to switch who you are viewing.
          </Text>
        </View>

        {rankedPlayers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No player cards yet</Text>
            <Text style={styles.emptyText}>Add players and games to generate the roster.</Text>
          </View>
        ) : (
          <>
            <View style={styles.selectorShell}>
              <Text style={styles.selectorLabel}>Search players</Text>
              <TextInput
                value={playerQuery}
                onChangeText={setPlayerQuery}
                placeholder="Search players"
                placeholderTextColor="#7D96B9"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.searchInput}
              />

              {focusedPlayer ? (
                <View style={styles.currentPlayerCard}>
                  <View style={styles.currentPlayerCopy}>
                    <Text style={styles.currentPlayerEyebrow}>
                      {isViewingLoggedInPlayer ? 'Logged-in commander' : 'Currently viewing'}
                    </Text>
                    <Text style={styles.currentPlayerName}>{focusedPlayer.name}</Text>
                  </View>

                  <View style={styles.currentPlayerBadge}>
                    <Text style={styles.currentPlayerBadgeText}>
                      #{focusedPlayer.rank ?? 0}
                    </Text>
                  </View>
                </View>
              ) : null}

              {normalizedQuery ? (
                <ScrollView
                  style={styles.searchResults}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.searchResultsContent}>
                    {filteredPlayers.map((player) => {
                      const active = String(player.id) === String(focusedPlayer?.id);

                      return (
                        <Pressable
                          key={player.id}
                          onPress={() => handleSelectPlayer(String(player.id))}
                          style={({ pressed }) => [
                            styles.searchResultCard,
                            active && styles.searchResultCardActive,
                            pressed && styles.searchResultCardPressed,
                          ]}
                        >
                          <View style={styles.searchResultCopy}>
                            <Text style={[styles.searchResultName, active && styles.searchResultNameActive]}>
                              {player.name}
                            </Text>
                            <Text style={styles.searchResultMeta}>
                              {active ? 'Current card' : 'Tap to view this card'}
                            </Text>
                          </View>
                          <Text style={[styles.searchResultAction, active && styles.searchResultActionActive]}>
                            {active ? 'Viewing' : 'View'}
                          </Text>
                        </Pressable>
                      );
                    })}

                    {filteredPlayers.length === 0 ? (
                      <View style={styles.searchEmpty}>
                        <Text style={styles.searchEmptyText}>No players match this search.</Text>
                      </View>
                    ) : null}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.searchHint}>
                  Search to switch which player card is on screen.
                </Text>
              )}
            </View>

            {focusedPlayer ? (
              <ColorPlayerCard
                player={focusedPlayer}
                games={games}
                isSelected
                onPress={openFocusedProfile}
              />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No player selected</Text>
                <Text style={styles.emptyText}>Search for a player to load their card.</Text>
              </View>
            )}
          </>
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
  selectorShell: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(10,18,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.16)',
  },
  selectorLabel: {
    color: '#C8D5F0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.22)',
    backgroundColor: 'rgba(7,13,26,0.92)',
    paddingHorizontal: 14,
    color: '#F8FBFF',
    fontSize: 15,
    fontWeight: '700',
  },
  currentPlayerCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
    backgroundColor: 'rgba(17,94,89,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  currentPlayerCopy: {
    flex: 1,
  },
  currentPlayerEyebrow: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentPlayerName: {
    color: '#F8FBFF',
    fontSize: 20,
    fontWeight: '900',
  },
  currentPlayerBadge: {
    minWidth: 52,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.26)',
    backgroundColor: 'rgba(6,78,59,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  currentPlayerBadgeText: {
    color: '#86EFAC',
    fontSize: 15,
    fontWeight: '900',
  },
  searchHint: {
    marginTop: 12,
    color: '#8FA1C7',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  searchResults: {
    marginTop: 12,
    maxHeight: 244,
  },
  searchResultsContent: {
    gap: 8,
  },
  searchResultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchResultCardActive: {
    borderColor: 'rgba(34,197,94,0.32)',
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  searchResultCardPressed: {
    opacity: 0.86,
  },
  searchResultCopy: {
    flex: 1,
    minWidth: 0,
  },
  searchResultName: {
    color: '#F8FBFF',
    fontSize: 15,
    fontWeight: '800',
  },
  searchResultNameActive: {
    color: '#DCFCE7',
  },
  searchResultMeta: {
    marginTop: 4,
    color: '#8FA1C7',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultAction: {
    color: '#67E8F9',
    fontSize: 13,
    fontWeight: '900',
  },
  searchResultActionActive: {
    color: '#86EFAC',
  },
  searchEmpty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
  },
  searchEmptyText: {
    color: '#A4B5D8',
    fontSize: 13,
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
