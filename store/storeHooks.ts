// storeHooks.ts
import { useMemo } from 'react';
import { useStore } from './useStore';

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(totals: {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
} | undefined) {
  if (!totals) return 0;

  if (typeof totals.totalPrestige === 'number' && Number.isFinite(totals.totalPrestige)) {
    return totals.totalPrestige;
  }

  if (typeof totals.prestige === 'number' && Number.isFinite(totals.prestige)) {
    return totals.prestige;
  }

  return toNumber(totals.directPrestige) + toNumber(totals.assistPrestigeReceived);
}

export function usePlayers() {
  return useStore((s) => s.players);
}

export function usePlayer(playerId: string) {
  const players = useStore((s) => s.players);

  return useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );
}

export function useGames() {
  return useStore((s) => s.games);
}

export function useGroups() {
  return useStore((s) => s.groups);
}

export function usePlayerTotals(playerId: string) {
  const games = useStore((s) => s.games);

  return useMemo(() => {
    let totalPrestige = 0;
    let score = 0;
    let directPrestige = 0;
    let assistPrestigeReceived = 0;
    let assists = 0;
    let failures = 0;
    let contracts = 0;

    for (const game of games) {
      const t = game.totals?.[playerId];
      if (!t) continue;

      totalPrestige += getTotalPrestige(t);
      score += toNumber(t.score);
      directPrestige += toNumber(t.directPrestige);
      assistPrestigeReceived += toNumber(t.assistPrestigeReceived);
      assists += toNumber(t.assists);
      failures += toNumber(t.failures);
      contracts += toNumber(t.contracts);
    }

    return {
      totalPrestige,
      prestige: totalPrestige,
      score,
      directPrestige,
      assistPrestigeReceived,
      assists,
      failures,
      contracts,
    };
  }, [games, playerId]);
}

export function useWinCount(playerId: string) {
  const games = useStore((s) => s.games);

  return useMemo(
    () => games.filter((g) => g.winnerId === playerId).length,
    [games, playerId]
  );
}

export function useManualWinCount(playerId: string) {
  const games = useStore((s) => s.games);

  return useMemo(
    () =>
      games.filter(
        (g) =>
          g.winnerId === playerId &&
          (g.selectedWinnerId === playerId || g.manualWinnerId === playerId)
      ).length,
    [games, playerId]
  );
}

export function useGameCount(playerId: string) {
  const games = useStore((s) => s.games);

  return useMemo(
    () => games.filter((g) => g.totals?.[playerId]).length,
    [games, playerId]
  );
}

export function useLeaderboard() {
  const players = useStore((s) => s.players);
  const games = useStore((s) => s.games);

  return useMemo(() => {
    return players
      .map((player) => {
        let totalPrestige = 0;
        let score = 0;
        let wins = 0;
        let gamesPlayed = 0;

        for (const game of games) {
          const totals = game.totals?.[player.id];
          if (!totals) continue;

          gamesPlayed += 1;
          totalPrestige += getTotalPrestige(totals);
          score += toNumber(totals.score);

          if (game.winnerId === player.id) {
            wins += 1;
          }
        }

        return {
          ...player,
          totalPrestige,
          prestige: totalPrestige,
          score,
          wins,
          gamesPlayed,
        };
      })
      .sort((a, b) => {
        if (b.totalPrestige !== a.totalPrestige) {
          return b.totalPrestige - a.totalPrestige;
        }

        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.name.localeCompare(b.name);
      });
  }, [players, games]);
}

export function useTopPlayer() {
  const leaderboard = useLeaderboard();
  return leaderboard[0] ?? null;
}
