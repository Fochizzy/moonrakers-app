import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { useStore } from '@/store/useStore';

type StoreState = ReturnType<typeof useStore.getState>;
export type Player = StoreState['players'][number];
export type Game = StoreState['games'][number];

export type PlayerLeaderboardEntry = Player & {
  gamesPlayed: number;
  wins: number;
  totalPrestige: number;
  prestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
};

export type LeaderboardData = {
  leaderboard: PlayerLeaderboardEntry[];
  topPlayer: PlayerLeaderboardEntry | null;
};

let lastPlayersRef: Player[] | null = null;
let lastGamesRef: Game[] | null = null;
let lastResult: LeaderboardData | null = null;

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(totals: any): number {
  if (typeof totals?.totalPrestige === 'number' && Number.isFinite(totals.totalPrestige)) {
    return totals.totalPrestige;
  }

  if (typeof totals?.prestige === 'number' && Number.isFinite(totals.prestige)) {
    return totals.prestige;
  }

  return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
}

function getResolvedWinnerId(game: any): string | undefined {
  const selectedWinnerId =
    typeof game?.selectedWinnerId === 'string' && game.selectedWinnerId
      ? game.selectedWinnerId
      : undefined;

  const manualWinnerId =
    typeof game?.manualWinnerId === 'string' && game.manualWinnerId
      ? game.manualWinnerId
      : undefined;

  const winnerId =
    typeof game?.winnerId === 'string' && game.winnerId ? game.winnerId : undefined;

  return selectedWinnerId ?? manualWinnerId ?? winnerId;
}

function buildLeaderboardData(players: Player[], games: Game[]): LeaderboardData {
  if (!Array.isArray(players) || players.length === 0) {
    return { leaderboard: [], topPlayer: null };
  }

  const aggregates = new Map<string, PlayerLeaderboardEntry>();

  players.forEach((player) => {
    aggregates.set(player.id, {
      ...player,
      gamesPlayed: 0,
      wins: 0,
      totalPrestige: 0,
      prestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      score: 0,
      assists: 0,
      failures: 0,
      contracts: 0,
    });
  });

  (Array.isArray(games) ? games : []).forEach((game) => {
    const winnerId = getResolvedWinnerId(game);
    const totals = game?.totals ?? {};
    const gamePlayers = Array.isArray(game?.players) ? game.players : [];

    gamePlayers.forEach((player: any) => {
      if (!player?.id) return;

      const entry =
        aggregates.get(player.id) ??
        ({
          id: player.id,
          name: player.name ?? 'Unknown',
          color: player.color,
          gamesPlayed: 0,
          wins: 0,
          totalPrestige: 0,
          prestige: 0,
          directPrestige: 0,
          assistPrestigeReceived: 0,
          score: 0,
          assists: 0,
          failures: 0,
          contracts: 0,
        } as PlayerLeaderboardEntry);

      const playerTotals = totals[player.id] ?? player;
      const totalPrestige = getTotalPrestige(playerTotals);

      entry.gamesPlayed += 1;
      entry.wins += winnerId === player.id ? 1 : 0;
      entry.totalPrestige += totalPrestige;
      entry.prestige += totalPrestige;
      entry.directPrestige += toNumber(playerTotals?.directPrestige);
      entry.assistPrestigeReceived += toNumber(playerTotals?.assistPrestigeReceived);
      entry.score += toNumber(playerTotals?.score);
      entry.assists += toNumber(playerTotals?.assists);
      entry.failures += toNumber(playerTotals?.failures);
      entry.contracts += toNumber(playerTotals?.contracts);

      aggregates.set(player.id, entry);
    });
  });

  const leaderboard = Array.from(aggregates.values()).sort((a, b) => {
    if (b.totalPrestige !== a.totalPrestige) {
      return b.totalPrestige - a.totalPrestige;
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    return a.name.localeCompare(b.name);
  });

  return {
    leaderboard,
    topPlayer: leaderboard[0] ?? null,
  };
}

function getLeaderboardData(players: Player[], games: Game[]): LeaderboardData {
  if (lastResult && players === lastPlayersRef && games === lastGamesRef) {
    return lastResult;
  }

  const result = buildLeaderboardData(players, games);
  lastPlayersRef = players;
  lastGamesRef = games;
  lastResult = result;

  return result;
}

export function usePlayers(): Player[] {
  return useStore((state) => state.players, shallow);
}

export function useGames(): Game[] {
  return useStore((state) => state.games, shallow);
}

export function useLeaderboardData(): LeaderboardData {
  return useStore((state) => getLeaderboardData(state.players, state.games), shallow);
}

export function useLeaderboard(): PlayerLeaderboardEntry[] {
  return useStore((state) => getLeaderboardData(state.players, state.games).leaderboard, shallow);
}

export function useTopPlayer(): PlayerLeaderboardEntry | null {
  return useStore((state) => getLeaderboardData(state.players, state.games).topPlayer);
}

export function useTopNPlayers(n: number): PlayerLeaderboardEntry[] {
  const leaderboard = useLeaderboard();
  return useMemo(() => leaderboard.slice(0, n), [leaderboard, n]);
}
