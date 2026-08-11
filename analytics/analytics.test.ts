import {
  average,
  buildConsistencyChecks,
  buildExpectedOutcome,
  buildLeaderboard,
  buildSystemHealth,
  buildTurnOrderSummary,
  derivePlayerPerformance,
  filterGamesByTime,
  getCorrelationConfidence,
  getCorrelationInterpretation,
  getPearsonCorrelation,
  getStabilitySummary,
  sortLeaderboard,
} from '../index';
import type { LeaderboardRow, PlayerLike, StoredGame } from '../types';

const players: PlayerLike[] = [
  { id: 'p1', name: 'Nova' },
  { id: 'p2', name: 'Orion' },
  { id: 'p3', name: 'Lyra' },
];

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-04-02T12:00:00.000Z').getTime();

const games: StoredGame[] = [
  {
    id: 'g1',
    createdAt: now - 40 * DAY,
    winnerId: 'p1',
    players: [
      { id: 'p1', startOrder: 0, totalPrestige: 18, placement: 1 },
      { id: 'p2', startOrder: 1, totalPrestige: 12, placement: 2 },
      { id: 'p3', startOrder: 2, totalPrestige: 6, placement: 3 },
    ],
  },
  {
    id: 'g2',
    createdAt: now - 20 * DAY,
    winnerId: 'p2',
    players: [
      { id: 'p1', startOrder: 1, totalPrestige: 10, placement: 2 },
      { id: 'p2', startOrder: 0, totalPrestige: 19, placement: 1 },
      { id: 'p3', startOrder: 2, totalPrestige: 7, placement: 3 },
    ],
  },
  {
    id: 'g3',
    createdAt: now - 5 * DAY,
    winnerId: 'p1',
    players: [
      { id: 'p1', startOrder: 2, totalPrestige: 20, placement: 1 },
      { id: 'p2', startOrder: 1, totalPrestige: 8, placement: 3 },
      { id: 'p3', startOrder: 0, totalPrestige: 12, placement: 2 },
    ],
  },
];

const calculateElo = (_games: StoredGame[]) => ({
  p1: 1040,
  p2: 1010,
  p3: 970,
});

const buildPlayerEloSeries = (_games: StoredGame[], playerId: string) => {
  if (playerId === 'p1') {
    return [
      { x: 0, y: 1000 },
      { x: 1, y: 1012 },
      { x: 2, y: 1004 },
      { x: 3, y: 1040 },
    ];
  }
  if (playerId === 'p2') {
    return [
      { x: 0, y: 1000 },
      { x: 1, y: 992 },
      { x: 2, y: 1010 },
    ];
  }
  return [
    { x: 0, y: 1000 },
    { x: 1, y: 990 },
    { x: 2, y: 970 },
  ];
};

describe('analytics service', () => {
  it('computes averages safely', () => {
    expect(average([])).toBe(0);
    expect(average([2, 4, 6])).toBe(4);
  });

  it('computes a positive pearson correlation', () => {
    const value = getPearsonCorrelation([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);

    expect(value).toBeCloseTo(1, 5);
  });

  it('filters games by the last 30 days', () => {
    const filtered = filterGamesByTime(games, 'last30d', now);
    expect(filtered.map((game) => game.id)).toEqual(['g2', 'g3']);
  });

  it('derives player performance from recorded games', () => {
    const performance = derivePlayerPerformance('p1', games);

    expect(performance.gamesPlayed).toBe(3);
    expect(performance.wins).toBe(2);
    expect(performance.prestigeTotal).toBe(48);
    expect(performance.winRate).toBeCloseTo(66.666, 2);
    expect(performance.avgPrestige).toBeCloseTo(16, 5);
  });

  it('builds turn-order summary with sample size', () => {
    const turnOrder = buildTurnOrderSummary(games);

    expect(turnOrder.sampleSize).toBe(9);
    expect(turnOrder.seatWins).toHaveLength(3);
    expect(turnOrder.avgWinnerSeat).toBeGreaterThan(1);
  });

  it('builds leaderboard rows with injected elo functions', () => {
    const leaderboard = buildLeaderboard({
      players,
      games,
      calculateElo,
      buildPlayerEloSeries,
    });

    const nova = leaderboard.find((entry) => entry.id === 'p1');
    expect(nova).toBeDefined();
    expect(nova?.rating).toBe(1040);
    expect(nova?.delta).toBe(40);
    expect(nova?.series).toHaveLength(4);
  });

  it('sorts leaderboard by requested sort mode', () => {
    const leaderboard = buildLeaderboard({
      players,
      games,
      calculateElo,
      buildPlayerEloSeries,
    });

    const sorted = sortLeaderboard(leaderboard, 'elo');
    expect(sorted[0]?.id).toBe('p1');
  });

  it('builds calibrated expected outcome ranges', () => {
    const leaderboard = buildLeaderboard({
      players,
      games,
      calculateElo,
      buildPlayerEloSeries,
    });
    const player = leaderboard.find((entry) => entry.id === 'p1') as LeaderboardRow;

    const expected = buildExpectedOutcome({
      player,
      leaderboard,
    });

    expect(expected.expectedWinRateLow).toBeLessThan(expected.expectedWinRateHigh);
    expect(expected.expectedPlacementLow).toBeLessThanOrEqual(expected.expectedPlacementHigh);
    expect(expected.reasons.length).toBeGreaterThan(0);
  });

  it('classifies stability from a rating series', () => {
    const summary = getStabilitySummary([
      { x: 0, y: 1000 },
      { x: 1, y: 1005 },
      { x: 2, y: 1008 },
      { x: 3, y: 1010 },
    ]);

    expect(summary.label).toBe('Stable');
  });

  it('builds consistency checks for contradictory profiles', () => {
    const checks = buildConsistencyChecks({
      id: 'p1',
      name: 'Nova',
      rating: 1020,
      gamesPlayed: 4,
      delta: 10,
      wins: 1,
      prestigeTotal: 70,
      winRate: 25,
      avgPrestige: 17.5,
      recentForm: 1.2,
      series: [],
    });

    expect(checks.some((check) => check.title === 'High scoring, weak conversion')).toBe(true);
    expect(checks.some((check) => check.title === 'Small sample')).toBe(true);
  });

  it('builds system health', () => {
    const leaderboard = buildLeaderboard({
      players,
      games,
      calculateElo,
      buildPlayerEloSeries,
    });

    const health = buildSystemHealth(leaderboard);
    expect(health.activePlayers).toBe(3);
    expect(health.ratingSpread).toBe(70);
  });

  it('returns trust copy for correlations', () => {
    expect(getCorrelationConfidence(3)).toBe('very early sample');
    expect(getCorrelationInterpretation(0.4)).toContain('Moderate relationship');
  });
});
