import type { StoredGame } from '@/utils/advancedStats';

export const BASE_ELO = 1000;
export const DEFAULT_K = 32;
export const ELO_RESULT_WEIGHT = 0.6;
export const ELO_PERFORMANCE_WEIGHT = 0.4;

/**
 * A game's rating swing scales with how decisively it was won. A photo finish
 * proves little and moves ratings by {@link ELO_MIN_SWING_MULTIPLIER}; a rout
 * moves them by {@link ELO_MAX_SWING_MULTIPLIER}.
 */
export const ELO_MIN_SWING_MULTIPLIER = 0.75;
export const ELO_MAX_SWING_MULTIPLIER = 1.25;

/**
 * The prestige spread, as a fraction of the table average, at which a game
 * counts as fully decisive.
 */
export const ELO_DECISIVE_SPREAD_RATIO = 0.5;

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
 * Replay a game turn by turn and record every player's running score after each
 * turn. Players who did not act on a turn carry their previous total forward, so
 * the result is a full grid: one standing for every player at every turn.
 *
 * Only the fields the server also persists on game_rounds are replayed, so this
 * stays in step with private.refresh_all_elo_snapshots. Anything the rounds
 * table cannot see (head-to-head mission bonuses, turn meta types) is absent
 * from both sides.
 */
function replayRounds(
  game: EloGameLike,
  playerIds: string[]
): { prestige: Record<string, number[]>; score: Record<string, number[]> } {
  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];
  const prestigeTotals: Record<string, number> = {};
  const bonusTotals: Record<string, number> = {};
  const prestige: Record<string, number[]> = {};
  const score: Record<string, number[]> = {};

  for (const playerId of playerIds) {
    prestigeTotals[playerId] = 0;
    bonusTotals[playerId] = 0;
    prestige[playerId] = [];
    score[playerId] = [];
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
      const runningPrestige = Math.max(0, prestigeTotals[playerId]);
      prestige[playerId].push(runningPrestige);
      score[playerId].push(runningPrestige + bonusTotals[playerId]);
    }
  }

  return { prestige, score };
}

export function buildRunningScores(
  game: EloGameLike,
  playerIds: string[]
): Record<string, number[]> {
  return replayRounds(game, playerIds).score;
}

/**
 * The running prestige trail - the win condition rather than the broader score,
 * so it answers "who was actually ahead" at each turn.
 */
export function buildRunningPrestige(
  game: EloGameLike,
  playerIds: string[]
): Record<string, number[]> {
  return replayRounds(game, playerIds).prestige;
}

/**
 * Whether a game's round rows actually reconstruct its stored totals.
 *
 * Games recorded before 2026-04-09 kept their turn rows but lost the prestige on
 * them, so replaying those produces a trajectory that is not merely imprecise
 * but wrong - in several the apparent leader is never the recorded winner. The
 * information was never captured and cannot be recovered from the totals, so the
 * only honest response is to detect those games and decline to read a trajectory
 * from them.
 *
 * Prestige is the right thing to reconcile against: it is fully reconstructible
 * in principle, whereas the score legitimately carries head-to-head mission
 * bonuses that the rounds table has no column for.
 */
export function roundsReconcile(
  game: EloGameLike,
  playerIds: string[]
): boolean {
  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];
  if (!rounds.length || !playerIds.length) {
    return false;
  }

  const trails = replayRounds(game, playerIds).prestige;

  const drift = playerIds.reduce((total, playerId) => {
    const trail = trails[playerId] ?? [];
    const replayed = trail.length ? trail[trail.length - 1] : 0;
    return total + Math.abs(replayed - getTotalPrestige(game, playerId));
  }, 0);

  return drift < 0.5;
}

/**
 * Score one value as a differential against the rest of the field rather than
 * against the field as a whole: 0.5 means level with the average opponent, above
 * 0.5 means ahead of them, and the gap scales with how far ahead. Margins stay
 * meaningful, so a two-point lead and a forty-point lead do not read the same.
 */
export function eloFieldStanding(
  value: number,
  fieldMean: number,
  fieldSize: number
): number {
  if (fieldSize < 2 || !Number.isFinite(fieldMean) || fieldMean <= 0) {
    return 0.5;
  }

  const safeValue = Number.isFinite(value) ? value : 0;
  // value - meanOfOpponents, expressed relative to the table average.
  const opponentGap =
    (fieldSize / (fieldSize - 1)) * (safeValue / fieldMean - 1);

  return Math.min(1, Math.max(0, 0.5 + 0.5 * opponentGap));
}

function mean(values: number[]): number {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (!safeValues.length) return 0;

  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

/**
 * How the game actually flowed: each player's standing against the field is
 * measured after every turn, then averaged with later turns weighted more
 * heavily than early ones. Leading wire to wire beats stealing it on the last
 * turn, but an early lead that evaporates still counts for something.
 *
 * Games with no round rows, or whose rounds fail {@link roundsReconcile}, have
 * no trustworthy trajectory to read, so they fall back to the standing implied
 * by the final scores.
 */
export function buildFlowScores(
  game: EloGameLike,
  playerIds: string[]
): Record<string, number> {
  const fieldSize = playerIds.length;
  const trails = buildRunningScores(game, playerIds);
  const turnCount = playerIds.length ? (trails[playerIds[0]]?.length ?? 0) : 0;

  if (!turnCount || !roundsReconcile(game, playerIds)) {
    const endScores = playerIds.map((playerId) => getEndScore(game, playerId));
    const endMean = mean(endScores);

    return Object.fromEntries(
      playerIds.map((playerId, index) => [
        playerId,
        eloFieldStanding(endScores[index], endMean, fieldSize),
      ])
    );
  }

  const weightedTotals: Record<string, number> = Object.fromEntries(
    playerIds.map((playerId) => [playerId, 0])
  );
  let weightTotal = 0;

  for (let turn = 0; turn < turnCount; turn += 1) {
    // Turn 1 carries weight 1, turn 2 carries weight 2, and so on, so the
    // endgame counts for more than the opening.
    const weight = turn + 1;
    weightTotal += weight;

    const turnScores = playerIds.map(
      (playerId) => trails[playerId][turn] ?? 0
    );
    const turnMean = mean(turnScores);

    playerIds.forEach((playerId, index) => {
      weightedTotals[playerId] +=
        weight * eloFieldStanding(turnScores[index], turnMean, fieldSize);
    });
  }

  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      weightTotal > 0 ? weightedTotals[playerId] / weightTotal : 0.5,
    ])
  );
}

/**
 * How far the field spread out by the end: the mean absolute deviation of final
 * prestige, relative to the table average. Reads every finisher rather than the
 * top two.
 */
export function buildFieldSpreadDecisiveness(
  game: EloGameLike,
  playerIds: string[]
): number {
  if (playerIds.length < 2) {
    return 0;
  }

  const prestiges = playerIds.map((playerId) =>
    getTotalPrestige(game, playerId)
  );

  const prestigeMean = mean(prestiges);
  if (!(prestigeMean > 0)) {
    return 0;
  }

  const spread = mean(
    prestiges.map((prestige) => Math.abs(prestige - prestigeMean))
  );

  return Math.min(
    1,
    Math.max(0, spread / prestigeMean / ELO_DECISIVE_SPREAD_RATIO)
  );
}

/**
 * How far through the game the lead changed hands for the last time, as a 0..1
 * fraction. Zero means the eventual leader was never headed; near one means it
 * was still being decided on the closing turns.
 *
 * Only strict leads count - turns where the top is shared are skipped, so the
 * opening turns where nobody has scored cannot manufacture lead changes.
 * Leadership is read from running prestige, the actual win condition, rather
 * than the broader score.
 *
 * Returns null when there is no trustworthy trajectory to read.
 */
export function buildSettledAt(
  game: EloGameLike,
  playerIds: string[]
): number | null {
  if (playerIds.length < 2 || !roundsReconcile(game, playerIds)) {
    return null;
  }

  const trails = buildRunningPrestige(game, playerIds);
  const turnCount = trails[playerIds[0]]?.length ?? 0;
  if (!turnCount) {
    return null;
  }

  const strictLeaderAt = (turn: number): string | null => {
    let best = Number.NEGATIVE_INFINITY;
    let leader: string | null = null;
    let shared = false;

    for (const playerId of playerIds) {
      const value = trails[playerId][turn] ?? 0;
      if (value > best) {
        best = value;
        leader = playerId;
        shared = false;
      } else if (value === best) {
        shared = true;
      }
    }

    return shared ? null : leader;
  };

  let finalLeader: string | null = null;
  for (let turn = turnCount - 1; turn >= 0 && !finalLeader; turn -= 1) {
    finalLeader = strictLeaderAt(turn);
  }
  if (!finalLeader) {
    return null;
  }

  let settledAt = 0;
  for (let turn = 0; turn < turnCount; turn += 1) {
    const leader = strictLeaderAt(turn);
    if (leader && leader !== finalLeader) {
      settledAt = (turn + 1) / turnCount;
    }
  }

  return settledAt;
}

/**
 * How decisive the game was, blending where the field finished with how long the
 * result was in doubt. A game is decisive when it both strung out and settled
 * early; it is close when the table bunched up, or when the lead was still
 * changing hands at the end.
 *
 * The swing multiplier has to be a single number per game - giving players
 * different multipliers would stop their deltas cancelling and reintroduce the
 * rating leak that {@link buildResultScores} exists to prevent - so the
 * statistic driving it describes the whole field rather than one pair.
 *
 * Games without a trustworthy trajectory fall back to the spread alone.
 */
export function buildGameDecisiveness(
  game: EloGameLike,
  playerIds: string[]
): number {
  const spreadDecisiveness = buildFieldSpreadDecisiveness(game, playerIds);
  const settledAt = buildSettledAt(game, playerIds);

  if (settledAt === null) {
    return spreadDecisiveness;
  }

  const timingDecisiveness = 1 - settledAt;
  return Math.min(
    1,
    Math.max(0, (spreadDecisiveness + timingDecisiveness) / 2)
  );
}

/**
 * The K multiplier a game earns from how decisively it was won.
 */
export function buildSwingMultiplier(
  game: EloGameLike,
  playerIds: string[]
): number {
  return (
    ELO_MIN_SWING_MULTIPLIER +
    (ELO_MAX_SWING_MULTIPLIER - ELO_MIN_SWING_MULTIPLIER) *
      buildGameDecisiveness(game, playerIds)
  );
}

/**
 * Blend a game's three performance signals - how it flowed, total prestige, and
 * end score - into a single 0..1 reading of how the player played.
 */
export function buildPerformanceSignals(
  game: EloGameLike,
  playerIds: string[]
): Record<string, number> {
  if (!playerIds.length) {
    return {};
  }

  const fieldSize = playerIds.length;
  const flowScores = buildFlowScores(game, playerIds);
  const totalPrestiges = playerIds.map((playerId) =>
    getTotalPrestige(game, playerId)
  );
  const endScores = playerIds.map((playerId) => getEndScore(game, playerId));

  const prestigeMean = mean(totalPrestiges);
  const endMean = mean(endScores);

  return Object.fromEntries(
    playerIds.map((playerId, index) => [
      playerId,
      (flowScores[playerId] +
        eloFieldStanding(totalPrestiges[index], prestigeMean, fieldSize) +
        eloFieldStanding(endScores[index], endMean, fieldSize)) /
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
 * The result half of the actual score, as finishing position rather than a
 * binary win: first place scores 1, last scores 0, and the places between share
 * the gap evenly. Players level on prestige and end score share the average of
 * the positions they span.
 *
 * Position rather than win/loss is what keeps the system zero-sum. These bases
 * sum to n/2 across the field, which is exactly what the expected scores sum
 * to; a binary 1-and-the-rest-zero only sums to 1, so every multiplayer game
 * used to destroy rating that no one ever won back.
 *
 * The recorded winner always takes first place, so a manually resolved prestige
 * tie still awards the win outright.
 */
export function buildResultScores(
  game: EloGameLike,
  playerIds: string[],
  winnerId?: string | null
): Record<string, number> {
  const fieldSize = playerIds.length;
  if (fieldSize < 2) {
    return Object.fromEntries(playerIds.map((playerId) => [playerId, 0.5]));
  }

  const resolvedWinnerId = winnerId ?? getRecordedWinnerId(game);

  const ranked = playerIds
    .map((playerId) => ({
      playerId,
      isWinner: Boolean(resolvedWinnerId) && playerId === resolvedWinnerId,
      prestige: getTotalPrestige(game, playerId),
      score: getEndScore(game, playerId),
    }))
    .sort(
      (a, b) =>
        Number(b.isWinner) - Number(a.isWinner) ||
        b.prestige - a.prestige ||
        b.score - a.score ||
        a.playerId.localeCompare(b.playerId)
    );

  const positions: Record<string, number> = {};

  let index = 0;
  while (index < ranked.length) {
    let last = index;
    while (
      last + 1 < ranked.length &&
      ranked[last + 1].isWinner === ranked[index].isWinner &&
      ranked[last + 1].prestige === ranked[index].prestige &&
      ranked[last + 1].score === ranked[index].score
    ) {
      last += 1;
    }

    // Positions are 1-indexed; a tied block shares the average of its span.
    const sharedPosition = (index + 1 + (last + 1)) / 2;
    for (let tied = index; tied <= last; tied += 1) {
      positions[ranked[tied].playerId] = sharedPosition;
    }

    index = last + 1;
  }

  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      (fieldSize - positions[playerId]) / (fieldSize - 1),
    ])
  );
}

/**
 * Resolve the Elo "actual score" for every player in one game: finishing
 * position carries {@link ELO_RESULT_WEIGHT}, performance carries the rest.
 */
export function buildActualScores(
  game: EloGameLike,
  playerIds: string[],
  winnerId?: string | null
): Record<string, number> {
  const resultScores = buildResultScores(game, playerIds, winnerId);
  const performanceSignals = buildPerformanceSignals(game, playerIds);

  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      clampActualScore(
        (resultScores[playerId] ?? 0.5) * ELO_RESULT_WEIGHT +
          (performanceSignals[playerId] ?? 0.5) * ELO_PERFORMANCE_WEIGHT
      ),
    ])
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
  const effectiveK = k * buildSwingMultiplier(game, playerIds);

  for (const playerId of playerIds) {
    const opponentRatings = playerIds
      .filter((id) => id !== playerId)
      .map((id) => ratings[id]);

    nextRatings[playerId] = updateElo(
      ratings[playerId],
      opponentRatings,
      actualScores[playerId] ?? 0.5,
      effectiveK
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
