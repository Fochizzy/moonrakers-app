import { useMemo } from 'react';
import { useStore } from './useStore';

import { filterGames } from '../utils/filterGames';
import { getAdvancedStats } from '../analytics/advancedStats';
import { buildStatHistory } from '../analytics/statHistory';
import { rankPlayers } from '../analytics/ranking';

////////////////////////////////////////////////////////////////////////////////
// 👤 PLAYER HOOK
////////////////////////////////////////////////////////////////////////////////
export function usePlayer(playerId: string) {
  return useStore((s) =>
    s.players.find((p) => p.id === playerId)
  );
}

////////////////////////////////////////////////////////////////////////////////
// 👥 SELECTED PLAYERS
////////////////////////////////////////////////////////////////////////////////
export function useSelectedPlayers() {
  const players = useStore((s) => s.players);
  const selected = useStore((s) => s.selectedPlayers);

  return useMemo(
    () => players.filter((p) => selected.includes(p.id)),
    [players, selected]
  );
}

////////////////////////////////////////////////////////////////////////////////
// 📊 PLAYER STATS
////////////////////////////////////////////////////////////////////////////////
export function usePlayerStats(playerId: string) {
  const games = useStore((s) => s.games);

  return useMemo(
    () => getAdvancedStats(games, playerId),
    [games, playerId]
  );
}

////////////////////////////////////////////////////////////////////////////////
// 📈 PLAYER HISTORY
////////////////////////////////////////////////////////////////////////////////
export function usePlayerHistory(playerId: string) {
  const games = useStore((s) => s.games);

  return useMemo(
    () => buildStatHistory(games, playerId),
    [games, playerId]
  );
}

////////////////////////////////////////////////////////////////////////////////
// 🏆 RANKINGS
////////////////////////////////////////////////////////////////////////////////
export function useRankings() {
  const players = useStore((s) => s.players);

  return useMemo(
    () => rankPlayers(players),
    [players]
  );
}

////////////////////////////////////////////////////////////////////////////////
// 📊 FILTERED GAMES
////////////////////////////////////////////////////////////////////////////////
export function useFilteredGames(filters: any) {
  const games = useStore((s) => s.games);

  return useMemo(
    () => filterGames(games, filters),
    [games, filters]
  );
}
