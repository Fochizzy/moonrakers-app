import type { StoredGame } from '@/utils/advancedStats';

export const BASE_ELO = 1000;
export const DEFAULT_K = 32;
export const ELO_RESULT_WEIGHT = 0.6;
export const ELO_PERFORMANCE_WEIGHT = 0.4;

export type EloMap = Record<string, number>;

export type EloHistoryPoint = {
  gameId: string;
  rating: number;
  createdAt?: number;
};

export type EloHistoryMap = Record<string, EloHistoryPoint[]>;

export type EloGameLike = {
  totals?: Record<string, unknown> | null;
  rounds?: unknown[] | null;
  winnerId?: string | null;
  selectedWinnerId?: string | null;
  manualWinnerId?: string | null;
};

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

function num(value: unknown): number {
  return toFiniteNumber(value) ?? 0;
}

function getRecordedWinnerId(game: EloGameLike): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId ?? undefined;
}

function getOrderedPlayerIds(game: EloGameLike): string[] {
  return Object.keys(game.totals ?? {});
}

function getPlayerTotals(game: EloGameLike, playerId: string) {
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

function getTotalPrestige(game: EloGameLike, playerId: string): number {
  const totals = getPlayerTotals(game, playerId);
  if (!totals) return 0;

  const explicit = toFiniteNumber(totals.totalPrestige ?? totals.prestige);
  if (explicit !== null) {
    return explicit;
  }

  return Math.max(
    0,
    num(totals.directPrestige) +
      num(totals.objectivePrestige) +
      num(totals.assistPrestigeReceived)
  );
}

function getEndScore(game: EloGameLike, playerId: string): number {
  const totals = getPlayerTotals(game, playerId);
  if (!totals) return 0;

  const explicit = toFiniteNumber(totals.score);
  if (explicit !== null) {
    return explicit;
  }

  return (
    getTotalPrestige(game, playerId) +
    num(totals.contracts) * 5 +
    num(totals.assists) * 3 -
    num(totals.failures) * 4 +
    num(totals.headToHeadScoreBonus)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Replay a game turn by turn and record the highest running score each player
 * ever reached. A player who leads for most of the game and then gives ground
 * to late failures peaked higher than their final score suggests.
 *
 * Only the fields the server also persists on game_rounds are replayed, so this
 * stays byte-for-byte in step with private.refresh_all_elo_snapshots. Anything
 * the rounds table cannot see (head-to-head mission bonuses, turn meta types) is
 * still captured, because the peak is floored at the authoritative end score.
 */
export function buildPeakScores(
  game: EloGameLike,
  playerIds: string[]
): Record<string, number> {
  const endScores = Object.fromEntries(
    playerIds.map((playerId) => [playerId, getEndScore(game, playerId)])
  );

  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];
  if (!rounds.length) {
    return endScores;
  }

  const prestigeTotals: Record<string, number> = {};
  const bonusTotals: Record<string, number> = {};
  const peaks: Record<string, number> = {};

  for (const playerId of playerIds) {
    prestigeTotals[playerId] = 0;
    bonusTotals[playerId] = 0;
    peaks[playerId] = Number.NEGATIVE_INFINITY;
  }

  for (const rawRound of rounds) {
    const round = asRecord(rawRound);
    const actorId = String(round.playerId ?? "");

    if (actorId && actorId in prestigeTotals) {
      const assistsGiven = Object.values(
        asRecord(round.assistRecipients)
      ).filter((value) => num(value) > 0).length;

      prestigeTotals[actorId] +=
        num(round.prestige) +
        num(round.objectivePrestige ?? round.objectiveCount);
      bonusTotals[actorId] +=
        num(round.contracts) * 5 - num(round.failures) * 4 + assistsGiven * 3;
    }

    for (const [recipientId, amount] of Object.entries(
      asRecord(round.assistPrestigeRecipients)
    )) {
      if (recipientId in prestigeTotals) {
        prestigeTotals[recipientId] += num(amount);
      }
    }

    for (const playerId of playerIds) {
      const running =
        Math.max(0, prestigeTotals[playerId]) + bonusTotals[playerId];

      if (running > peaks[playerId]) {
        peaks[playerId] = running;
      }
    }
  }

  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      Math.max(
        Number.isFinite(peaks[playerId]) ? peaks[playerId] : endScores[playerId],
        endScores[playerId]
      ),
    ])
  );
}

/**
 * Score one value against the field it was played against, as a share of that
 * game's mean: matching the table average scores 0.5, doubling it scores 1, and
 * scoring nothing scores 0. Unlike min/max normalisation this keeps margins
 * meaningful - a two-point win and a forty-point rout do not read the same.
 */
export function eloFieldShare(value: number, fieldMean: number): number {
  if (!Number.isFinite(fieldMean) || fieldMean <= 0) {
    return 0.5;
  }

  const share = (0.5 * (Number.isFinite(value) ? value : 0)) / fieldMean;
  return Math.min(1, Math.max(0, share));
}

function mean(values: number[]): number {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (!safeValues.length) return 0;

  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

/**
 * Blend a game's three performance signals - peak score, total prestige, and
 * end score - into a single 0..1 reading of how the player played.
 */
export function buildPerformanceSignals(
  game: EloGameLike,
  playerIds: string[]
): Record<string, number> {
  if (!playerIds.length) {
    return {};
  }

  const peakScores = buildPeakScores(game, playerIds);
  const totalPrestiges = Object.fromEntries(
    playerIds.map((playerId) => [playerId, getTotalPrestige(game, playerId)])
  );
  const endScores = Object.fromEntries(
    playerIds.map((playerId) => [playerId, getEndScore(game, playerId)])
  );

  const peakMean = mean(playerIds.map((playerId) => peakScores[playerId]));
  const prestigeMean = mean(
    playerIds.map((playerId) => totalPrestiges[playerId])
  );
  const endMean = mean(playerIds.map((playerId) => endScores[playerId]));

  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      (eloFieldShare(peakScores[playerId], peakMean) +
        eloFieldShare(totalPrestiges[playerId], prestigeMean) +
        eloFieldShare(endScores[playerId], endMean)) /
        3,
    ])
  );
}

function clampActualScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

/**
 * Resolve the Elo "actual score" for every player in one game: the win/loss
 * result carries {@link ELO_RESULT_WEIGHT}, performance carries the rest.
 */
export function buildActualScores(
  game: EloGameLike,
  playerIds: string[],
  winnerId?: string | null
): Record<string, number> {
  const resolvedWinnerId = winnerId ?? getRecordedWinnerId(game);
  const performanceSignals = buildPerformanceSignals(game, playerIds);

  return Object.fromEntries(
    playerIds.map((playerId) => {
      const baseActualScore = resolvedWinnerId
        ? resolvedWinnerId === playerId
          ? 1
          : 0
        : 0.5;

      return [
        playerId,
        clampActualScore(
          baseActualScore * ELO_RESULT_WEIGHT +
            (performanceSignals[playerId] ?? 0.5) * ELO_PERFORMANCE_WEIGHT
        ),
      ];
    })
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

function applyGameToRatings(
  game: StoredGame,
  playerIds: string[],
  ratings: EloMap,
  k: number
) {
  const nextRatings: EloMap = { ...ratings };
  const actualScores = buildActualScores(game, playerIds);

  for (const playerId of playerIds) {
    const opponentRatings = playerIds
      .filter((id) => id !== playerId)
      .map((id) => ratings[id]);

    nextRatings[playerId] = updateElo(
      ratings[playerId],
      opponentRatings,
      actualScores[playerId] ?? 0.5,
      k
    );
  }

  Object.assign(ratings, nextRatings);
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

    applyGameToRatings(game, playerIds, ratings, k);
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

    applyGameToRatings(game, playerIds, ratings, k);

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
