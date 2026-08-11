import type {
  ConsistencyCheck,
  EloCalculator,
  EloSeriesBuilder,
  ExpectedOutcome,
  LeaderboardRow,
  PlayerLike,
  PredictionConfidence,
  RelationshipMap,
  SortMode,
  SortableLeaderboard,
  StabilitySummary,
  StoredGame,
  StoredGamePlayer,
  SystemHealth,
  TimeFilter,
  TurnOrderSummary,
} from './types';

export const DEFAULT_BASE_ELO = 1000;

export function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function average(values: readonly number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function gameIncludesPlayer(game: StoredGame, playerId: string): boolean {
  const players = Array.isArray(game?.players) ? game.players : [];
  return players.some((player) => player.id === playerId);
}

export function getWinnerId(game?: StoredGame): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

export function getRecordedSeat(player?: StoredGamePlayer): number | null {
  if (!player) return null;

  const raw =
    typeof player.startOrder === 'number' && Number.isFinite(player.startOrder)
      ? player.startOrder
      : typeof player.turnOrder === 'number' && Number.isFinite(player.turnOrder)
        ? player.turnOrder
        : typeof player.position === 'number' && Number.isFinite(player.position)
          ? player.position
          : null;

  return raw === null ? null : raw + 1;
}

export function getPearsonCorrelation(
  points: ReadonlyArray<{ x: number; y: number }>
): number {
  if (points.length < 2) return 0;

  const meanX = average(points.map((point) => point.x));
  const meanY = average(points.map((point) => point.y));

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (const point of points) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) return 0;
  return numerator / Math.sqrt(sumX * sumY);
}

export function filterGamesByTime(
  games: readonly StoredGame[],
  filter: TimeFilter,
  nowMs: number = Date.now()
): StoredGame[] {
  const safeGames = Array.isArray(games) ? games : [];

  if (filter === 'all') return [...safeGames];

  const ordered = [...safeGames].sort(
    (a, b) => toNumber(a.createdAt) - toNumber(b.createdAt)
  );

  if (filter === 'last5') return ordered.slice(-5);
  if (filter === 'last10') return ordered.slice(-10);

  const cutoff = nowMs - 30 * 24 * 60 * 60 * 1000;
  return ordered.filter((game) => toNumber(game.createdAt) >= cutoff);
}

export function filterRelationshipsForPlayer(
  relationships: RelationshipMap,
  playerId: string
): RelationshipMap {
  const next: RelationshipMap = {};

  for (const [fromId, targets] of Object.entries(relationships ?? {})) {
    if (fromId === playerId) {
      next[fromId] = { ...(targets ?? {}) };
      continue;
    }

    const filteredTargets = Object.fromEntries(
      Object.entries(targets ?? {}).filter(([toId]) => toId === playerId)
    );

    if (Object.keys(filteredTargets).length > 0) {
      next[fromId] = filteredTargets;
    }
  }

  return next;
}

export function derivePlayerPerformance(
  playerId: string,
  games: readonly StoredGame[]
): {
  wins: number;
  gamesPlayed: number;
  prestigeTotal: number;
  winRate: number;
  avgPrestige: number;
  recentForm: number;
} {
  let wins = 0;
  let gamesPlayed = 0;
  let prestigeTotal = 0;
  let recentPoints = 0;
  let recentCount = 0;

  const safeGames = Array.isArray(games) ? games : [];
  const relevantGames = safeGames.filter((game) => gameIncludesPlayer(game, playerId));

  for (const game of relevantGames) {
    const gamePlayers = Array.isArray(game.players) ? game.players : [];
    const result = gamePlayers.find((player) => player.id === playerId);
    if (!result) continue;

    gamesPlayed += 1;

    const prestige = toNumber(
      result.totalPrestige ?? result.prestige ?? result.score ?? result.finalPrestige
    );
    prestigeTotal += prestige;

    const placement = toNumber(result.placement ?? result.place ?? result.rank);
    const won =
      result.isWinner === true ||
      result.won === true ||
      placement === 1 ||
      getWinnerId(game) === playerId;

    if (won) wins += 1;

    if (recentCount < 5) {
      recentPoints += won ? 3 : prestige > 0 ? 1 : 0;
      recentCount += 1;
    }
  }

  return {
    wins,
    gamesPlayed,
    prestigeTotal,
    winRate: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
    avgPrestige: gamesPlayed > 0 ? prestigeTotal / gamesPlayed : 0,
    recentForm: recentCount > 0 ? recentPoints / recentCount : 0,
  };
}

export function buildTurnOrderSummary(
  games: readonly StoredGame[],
  playerId?: string | null
): TurnOrderSummary {
  const points: Array<{ x: number; y: number }> = [];
  const winnerSeats: number[] = [];
  const seatWins = new Map<number, { wins: number; games: number }>();
  const safeGames = Array.isArray(games) ? games : [];

  for (const game of safeGames) {
    const winnerId = getWinnerId(game);
    const gamePlayers = Array.isArray(game.players) ? game.players : [];

    for (const gamePlayer of gamePlayers) {
      if (playerId && gamePlayer.id !== playerId) continue;

      const seat = getRecordedSeat(gamePlayer);
      if (seat === null) continue;

      const won = winnerId === gamePlayer.id;
      points.push({ x: seat, y: won ? 1 : 0 });

      const current = seatWins.get(seat) ?? { wins: 0, games: 0 };
      current.games += 1;
      if (won) current.wins += 1;
      seatWins.set(seat, current);

      if (won) winnerSeats.push(seat);
    }
  }

  return {
    avgWinnerSeat: average(winnerSeats),
    avgSeat: average(points.map((point) => point.x)),
    correlation: getPearsonCorrelation(points),
    sampleSize: points.length,
    seatWins: Array.from(seatWins.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([seat, value]) => ({
        seat,
        wins: value.wins,
        games: value.games,
        winRate: value.games > 0 ? value.wins / value.games : 0,
      })),
  };
}

export function getCorrelationConfidence(sampleSize: number): string {
  if (sampleSize >= 20) return 'higher confidence';
  if (sampleSize >= 10) return 'moderate confidence';
  if (sampleSize >= 5) return 'early confidence';
  return 'very early sample';
}

export function getCorrelationInterpretation(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.15) return 'Little evidence of a meaningful relationship in the current sample.';
  if (abs < 0.35) return 'Small relationship. Worth watching, but not strong yet.';
  if (abs < 0.6) return 'Moderate relationship. This is a real signal in the current sample.';
  return 'Strong relationship in the current sample.';
}

export function getStabilitySummary(
  series: ReadonlyArray<{ x: number; y: number }>
): StabilitySummary {
  if (series.length < 3) {
    return {
      label: 'Early sample',
      detail: 'Need more games before stability is meaningful.',
      value: 0,
      color: '#64748B',
    };
  }

  const deltas: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    const current = series[index]?.y ?? 0;
    const previous = series[index - 1]?.y ?? 0;
    deltas.push(Math.abs(current - previous));
  }

  const avgDelta = average(deltas);
  if (avgDelta <= 10) {
    return {
      label: 'Stable',
      detail: 'Rating changes stay relatively tight from game to game.',
      value: 0.85,
      color: '#22C55E',
    };
  }
  if (avgDelta <= 18) {
    return {
      label: 'Moderate variance',
      detail: 'Performance moves around, but not wildly.',
      value: 0.55,
      color: '#22D3EE',
    };
  }
  return {
    label: 'High variance',
    detail: 'Results swing sharply from game to game.',
    value: 0.25,
    color: '#3B82F6',
  };
}

export function getPredictionConfidence(gamesPlayed: number): PredictionConfidence {
  if (gamesPlayed >= 15) return 'high';
  if (gamesPlayed >= 5) return 'moderate';
  return 'low';
}

export function buildExpectedOutcome(params: {
  player: LeaderboardRow;
  leaderboard: SortableLeaderboard;
}): ExpectedOutcome {
  const { player, leaderboard } = params;
  const ratings = leaderboard.map((entry) => entry.rating);
  const avgRating = average(ratings);
  const ratingSpread = Math.max(1, Math.max(...ratings, player.rating) - Math.min(...ratings, player.rating));
  const relativeRatingStrength = clamp((player.rating - avgRating) / ratingSpread, -1, 1);
  const recentFormStrength = clamp((player.recentForm - 1.5) / 1.5, -1, 1);
  const prestigeStrength = clamp((player.avgPrestige - average(leaderboard.map((entry) => entry.avgPrestige))) / 15, -1, 1);

  const baselineWinRate = clamp(player.winRate / 100, 0.1, 0.9);
  const blendedCenter = clamp(
    baselineWinRate * 0.55 +
      (0.5 + relativeRatingStrength * 0.18) * 0.25 +
      (0.5 + recentFormStrength * 0.12) * 0.1 +
      (0.5 + prestigeStrength * 0.08) * 0.1,
    0.18,
    0.82
  );

  const confidence = getPredictionConfidence(player.gamesPlayed);
  const uncertainty = confidence === 'high' ? 0.06 : confidence === 'moderate' ? 0.1 : 0.16;

  const centerPlacement = clamp(
    2.5 - relativeRatingStrength * 0.8 - recentFormStrength * 0.35,
    1,
    Math.max(2, leaderboard.length)
  );

  const placementRange = confidence === 'high' ? 0.7 : confidence === 'moderate' ? 1.1 : 1.5;
  const expectedEloCenter = Math.round((blendedCenter - 0.5) * 28);
  const eloRange = confidence === 'high' ? 6 : confidence === 'moderate' ? 10 : 14;

  const reasons: string[] = [];
  if (player.winRate >= 60) reasons.push('Long-run win rate is materially above break-even.');
  if (player.recentForm >= 2) reasons.push('Recent performance is strong in the current time window.');
  if (player.avgPrestige >= average(leaderboard.map((entry) => entry.avgPrestige))) {
    reasons.push('Average prestige output is above the current field baseline.');
  }
  if (player.rating >= avgRating + ratingSpread * 0.15) {
    reasons.push('Current rating sits above the field average.');
  }
  if (reasons.length === 0) {
    reasons.push('Prediction leans mostly on current rating and recorded win/loss profile.');
  }

  return {
    expectedWinRateLow: Math.round(clamp((blendedCenter - uncertainty) * 100, 5, 95)),
    expectedWinRateHigh: Math.round(clamp((blendedCenter + uncertainty) * 100, 5, 95)),
    expectedPlacementLow: Number(clamp(centerPlacement - placementRange, 1, Math.max(2, leaderboard.length)).toFixed(1)),
    expectedPlacementHigh: Number(clamp(centerPlacement + placementRange, 1, Math.max(2, leaderboard.length)).toFixed(1)),
    expectedEloDeltaLow: expectedEloCenter - eloRange,
    expectedEloDeltaHigh: expectedEloCenter + eloRange,
    confidence,
    reasons,
  };
}

export function buildConsistencyChecks(player: LeaderboardRow): ConsistencyCheck[] {
  const checks: ConsistencyCheck[] = [];

  if (player.avgPrestige >= 15 && player.winRate < 45) {
    checks.push({
      title: 'High scoring, weak conversion',
      detail: 'This player scores well but converts those games into wins less often than expected.',
      severity: 'warning',
    });
  }

  if (player.winRate >= 60 && player.avgPrestige < 8) {
    checks.push({
      title: 'Efficient closer',
      detail: 'Win conversion is strong even without standout average prestige output.',
      severity: 'info',
    });
  }

  if (player.gamesPlayed < 5) {
    checks.push({
      title: 'Small sample',
      detail: 'Interpret this player carefully until more games are recorded.',
      severity: 'warning',
    });
  }

  return checks;
}

export function buildSystemHealth(leaderboard: SortableLeaderboard): SystemHealth {
  if (leaderboard.length < 2) {
    return {
      activePlayers: leaderboard.length,
      ratingSpread: 0,
      averageRating: average(leaderboard.map((entry) => entry.rating)),
      volatility: 0,
      totalGames: average(leaderboard.map((entry) => entry.gamesPlayed)),
      healthLabel: 'Early sample',
      explanation: 'More players and games are needed before system health is meaningful.',
    };
  }

  const ratings = leaderboard.map((entry) => entry.rating);
  const deltas = leaderboard.map((entry) => Math.abs(entry.delta));
  const ratingSpread = Math.max(...ratings) - Math.min(...ratings);
  const volatility = average(deltas);
  const totalGames = leaderboard.reduce((sum, entry) => sum + entry.gamesPlayed, 0);

  let healthLabel: SystemHealth['healthLabel'] = 'Healthy';
  let explanation = 'Rating spread and player movement look balanced across the current field.';

  if (volatility >= 22) {
    healthLabel = 'Volatile';
    explanation = 'Recent movement is unusually sharp across the field.';
  } else if (ratingSpread >= 220) {
    healthLabel = 'Skewed';
    explanation = 'The field is separating into stronger and weaker bands.';
  }

  return {
    activePlayers: leaderboard.length,
    ratingSpread,
    averageRating: average(ratings),
    volatility,
    totalGames,
    healthLabel,
    explanation,
  };
}

export function getDataFreshness(games: readonly StoredGame[]): {
  lastGameAt: number | null;
  totalGames: number;
} {
  const safeGames = Array.isArray(games) ? games : [];
  const timestamps = safeGames
    .map((game) => toNumber(game.createdAt))
    .filter((value) => value > 0);

  return {
    lastGameAt: timestamps.length ? Math.max(...timestamps) : null,
    totalGames: safeGames.length,
  };
}

export function sortLeaderboard(
  leaderboard: SortableLeaderboard,
  sortMode: SortMode
): LeaderboardRow[] {
  const sorted = [...leaderboard];
  sorted.sort((a, b) => {
    switch (sortMode) {
      case 'winRate':
        return b.winRate - a.winRate || b.rating - a.rating;
      case 'prestige':
        return b.prestigeTotal - a.prestigeTotal || b.rating - a.rating;
      case 'recentForm':
        return b.recentForm - a.recentForm || b.rating - a.rating;
      case 'elo':
      default:
        return b.rating - a.rating;
    }
  });
  return sorted;
}

export function buildLeaderboard(params: {
  players: readonly PlayerLike[] | undefined | null;
  games: readonly StoredGame[] | undefined | null;
  calculateElo: EloCalculator;
  buildPlayerEloSeries: EloSeriesBuilder;
  baseElo?: number;
}): LeaderboardRow[] {
  const {
    players,
    games,
    calculateElo,
    buildPlayerEloSeries,
    baseElo = DEFAULT_BASE_ELO,
  } = params;

  const safePlayers = Array.isArray(players) ? players : [];
  const safeGames = Array.isArray(games) ? games : [];

  const ratings = calculateElo([...safeGames]);

  return safePlayers.map((player) => {
    const rating = ratings[player.id] ?? baseElo;
    const series = buildPlayerEloSeries([...safeGames], player.id);
    const first = series[0]?.y ?? baseElo;
    const last = series[series.length - 1]?.y ?? rating;
    const performance = derivePlayerPerformance(player.id, safeGames);

    return {
      ...player,
      rating: Math.round(rating),
      gamesPlayed: Math.max(series.length, performance.gamesPlayed),
      delta: Math.round(last - first),
      wins: performance.wins,
      prestigeTotal: performance.prestigeTotal,
      winRate: performance.winRate,
      avgPrestige: performance.avgPrestige,
      recentForm: performance.recentForm,
      series,
    } satisfies LeaderboardRow;
  });
}

export function buildSynergySummary(
  relationships: RelationshipMap | undefined | null
): Array<{
  pair: [string, string];
  score: number;
}> {
  const seen = new Set<string>();
  const result: Array<{ pair: [string, string]; score: number }> = [];

  for (const [fromId, targets] of Object.entries(relationships ?? {})) {
    for (const [toId, score] of Object.entries(targets ?? {})) {
      const key = [fromId, toId].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ pair: [fromId, toId], score });
    }
  }

  result.sort((a, b) => b.score - a.score);
  return result;
}
