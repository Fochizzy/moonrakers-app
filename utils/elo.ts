import type { StoredGame } from '@/utils/advancedStats';

export const BASE_ELO = 1000;
export const DEFAULT_K = 32;
export const ELO_RESULT_WEIGHT = 0.8;
export const ELO_BONUS_SCORE_WEIGHT = 0.2;

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

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getRecordedWinnerId(game: StoredGame): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getOrderedPlayerIds(game: StoredGame): string[] {
  return Object.keys(game.totals ?? {});
}

function getPlayerTotals(game: StoredGame, playerId: string) {
  const totals =
    game?.totals && typeof game.totals === "object" ? game.totals : null;

  if (!totals || Array.isArray(totals)) {
    return null;
  }

  const playerTotals = (totals as Record<string, unknown>)[playerId];
  return playerTotals && typeof playerTotals === "object" && !Array.isArray(playerTotals)
    ? (playerTotals as Record<string, unknown>)
    : null;
}

function getBonusScoreContribution(game: StoredGame, playerId: string): number {
  const totals = getPlayerTotals(game, playerId);
  if (!totals) {
    return 0;
  }

  const score = toFiniteNumber(totals.score);
  const totalPrestige = toFiniteNumber(
    totals.totalPrestige ?? totals.prestige
  );

  if (score !== null && totalPrestige !== null) {
    return score - totalPrestige;
  }

  const contracts = toFiniteNumber(totals.contracts) ?? 0;
  const assists = toFiniteNumber(totals.assists) ?? 0;
  const failures = toFiniteNumber(totals.failures) ?? 0;
  const headToHeadScoreBonus =
    toFiniteNumber(totals.headToHeadScoreBonus) ?? 0;

  return contracts * 5 + assists * 3 - failures * 4 + headToHeadScoreBonus;
}

function clampActualScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function buildBonusScoreAdjustments(
  game: StoredGame,
  playerIds: string[]
): Record<string, number> {
  const contributions = playerIds.map((playerId) => ({
    playerId,
    bonusScore: getBonusScoreContribution(game, playerId),
  }));

  const values = contributions
    .map((entry) => entry.bonusScore)
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return Object.fromEntries(playerIds.map((playerId) => [playerId, 0.5]));
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (maxValue <= minValue) {
    return Object.fromEntries(playerIds.map((playerId) => [playerId, 0.5]));
  }

  return Object.fromEntries(
    contributions.map(({ playerId, bonusScore }) => {
      return [playerId, (bonusScore - minValue) / (maxValue - minValue)];
    })
  );
}

function getEffectiveActualScore(
  game: StoredGame,
  playerId: string,
  bonusScoreAdjustments: Record<string, number>
) {
  const winnerId = getRecordedWinnerId(game);
  const baseActualScore = winnerId ? (winnerId === playerId ? 1 : 0) : 0.5;
  const bonusScoreSignal = bonusScoreAdjustments[playerId] ?? 0.5;

  return clampActualScore(
    baseActualScore * ELO_RESULT_WEIGHT +
      bonusScoreSignal * ELO_BONUS_SCORE_WEIGHT
  );
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
    const bonusScoreAdjustments = buildBonusScoreAdjustments(game, playerIds);

    for (const playerId of playerIds) {
      const opponentRatings = playerIds
        .filter((id) => id !== playerId)
        .map((id) => ratings[id]);

      const actualScore = getEffectiveActualScore(
        game,
        playerId,
        bonusScoreAdjustments
      );

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
    const bonusScoreAdjustments = buildBonusScoreAdjustments(game, playerIds);

    for (const playerId of playerIds) {
      const opponentRatings = playerIds
        .filter((id) => id !== playerId)
        .map((id) => ratings[id]);

      const actualScore = getEffectiveActualScore(
        game,
        playerId,
        bonusScoreAdjustments
      );

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
