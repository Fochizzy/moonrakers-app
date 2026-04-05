import type { StoredGame } from '@/utils/advancedStats';

export const BASE_ELO = 1000;
export const DEFAULT_K = 32;

export type EloMap = Record<string, number>;

export type EloHistoryPoint = {
  gameId: string;
  rating: number;
  createdAt?: number;
};

export type EloHistoryMap = Record<string, EloHistoryPoint[]>;

function safeRating(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : BASE_ELO;
}

function getRecordedWinnerId(game: StoredGame): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getOrderedPlayerIds(game: StoredGame): string[] {
  return Object.keys(game.totals ?? {});
}

/**
 * Expected score against one opponent
 */
export function expectedScore(
  playerElo: number,
  opponentElo: number
): number {
  const player = safeRating(playerElo);
  const opponent = safeRating(opponentElo);

  return 1 / (1 + Math.pow(10, (opponent - player) / 400));
}

/**
 * Expected score against multiple opponents
 * Uses the average of pairwise expected scores.
 */
export function expectedScoreMulti(
  playerElo: number,
  opponents: number[]
): number {
  const validOpponents = (opponents ?? []).filter(
    (rating) => typeof rating === 'number' && Number.isFinite(rating)
  );

  if (validOpponents.length === 0) {
    return 0.5;
  }

  const totalExpected = validOpponents.reduce((sum, opponentElo) => {
    return sum + expectedScore(playerElo, opponentElo);
  }, 0);

  return totalExpected / validOpponents.length;
}

/**
 * Update a single player's Elo after one multiplayer game.
 */
export function updateElo(
  playerElo: number,
  opponents: number[],
  actualScore: number,
  k = DEFAULT_K
): number {
  const current = safeRating(playerElo);
  const expected = expectedScoreMulti(current, opponents);

  return Math.round(current + k * (actualScore - expected));
}

/**
 * Calculate current Elo ratings for all players across all games.
 * A manually selected winner in a total-prestige tie receives the win.
 */
export function calculateElo(
  games: StoredGame[] = [],
  k = DEFAULT_K
): EloMap {
  const ratings: EloMap = {};

  const orderedGames = [...games].sort(
    (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
  );

  for (const game of orderedGames) {
    const playerIds = getOrderedPlayerIds(game);
    if (!playerIds.length) continue;

    for (const playerId of playerIds) {
      if (ratings[playerId] === undefined) {
        ratings[playerId] = BASE_ELO;
      }
    }

    const nextRatings: EloMap = { ...ratings };
    const winnerId = getRecordedWinnerId(game);

    for (const playerId of playerIds) {
      const opponentRatings = playerIds
        .filter((id) => id !== playerId)
        .map((id) => ratings[id]);

      const actualScore = winnerId ? (winnerId === playerId ? 1 : 0) : 0.5;

      nextRatings[playerId] = updateElo(
        ratings[playerId],
        opponentRatings,
        actualScore,
        k
      );
    }

    Object.assign(ratings, nextRatings);
  }

  return ratings;
}

/**
 * Build Elo rating history for every player after each game.
 */
export function buildRatingHistory(
  games: StoredGame[] = [],
  k = DEFAULT_K
): EloHistoryMap {
  const ratings: EloMap = {};
  const history: EloHistoryMap = {};

  const orderedGames = [...games].sort(
    (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
  );

  for (const game of orderedGames) {
    const playerIds = getOrderedPlayerIds(game);
    if (!playerIds.length) continue;

    for (const playerId of playerIds) {
      if (ratings[playerId] === undefined) {
        ratings[playerId] = BASE_ELO;
      }

      if (!history[playerId]) {
        history[playerId] = [];
      }
    }

    const nextRatings: EloMap = { ...ratings };
    const winnerId = getRecordedWinnerId(game);

    for (const playerId of playerIds) {
      const opponentRatings = playerIds
        .filter((id) => id !== playerId)
        .map((id) => ratings[id]);

      const actualScore = winnerId ? (winnerId === playerId ? 1 : 0) : 0.5;

      nextRatings[playerId] = updateElo(
        ratings[playerId],
        opponentRatings,
        actualScore,
        k
      );
    }

    Object.assign(ratings, nextRatings);

    for (const playerId of playerIds) {
      history[playerId].push({
        gameId: game.id ?? `${game.createdAt ?? 0}-${playerId}`,
        rating: ratings[playerId],
        createdAt: game.createdAt,
      });
    }
  }

  return history;
}

/**
 * Convenience helper for charting one player's Elo over time.
 */
export function buildPlayerEloSeries(
  games: StoredGame[] = [],
  playerId: string,
  k = DEFAULT_K
) {
  const history = buildRatingHistory(games, k);
  const points = history[playerId] ?? [];

  return points.map((point, index) => ({
    x: index + 1,
    y: point.rating,
    gameId: point.gameId,
    createdAt: point.createdAt,
  }));
}
