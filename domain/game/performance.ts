// src/domain/game/performance.ts

export interface PerformanceInput {
  wins: number;
  losses: number;
  draws?: number;

  kills?: number;
  assists?: number;
  mistakes?: number;

  scoreHistory?: number[];
}

export interface PerformanceMetrics {
  winRate: number;
  kda: number;
  consistency: number;
  improvement: number;
  overall: number;
}

// ---------- Core Calculations ---------- //

export function calculateWinRate(
  wins: number,
  losses: number,
  draws: number = 0
): number {
  const total = wins + losses + draws;
  if (total === 0) return 0;
  return wins / total;
}

export function calculateKDA(
  kills: number = 0,
  assists: number = 0,
  mistakes: number = 0
): number {
  const deaths = Math.max(mistakes, 1); // avoid divide by 0
  return (kills + assists) / deaths;
}

export function calculateConsistency(scores: number[] = []): number {
  if (scores.length < 2) return 1;

  const avg =
    scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) /
    scores.length;

  const stdDev = Math.sqrt(variance);

  // Normalize: lower std dev = higher consistency
  return 1 / (1 + stdDev);
}

export function calculateImprovement(scores: number[] = []): number {
  if (scores.length < 2) return 0;

  const first = scores[0];
  const last = scores[scores.length - 1];

  if (first === 0) return 0;

  return (last - first) / Math.abs(first);
}

// ---------- Aggregate ---------- //

export function calculatePerformance(
  input: PerformanceInput
): PerformanceMetrics {
  const {
    wins,
    losses,
    draws = 0,
    kills = 0,
    assists = 0,
    mistakes = 0,
    scoreHistory = [],
  } = input;

  const winRate = calculateWinRate(wins, losses, draws);
  const kda = calculateKDA(kills, assists, mistakes);
  const consistency = calculateConsistency(scoreHistory);
  const improvement = calculateImprovement(scoreHistory);

  // Weighted overall score
  const overall =
    winRate * 0.4 +
    Math.min(kda / 10, 1) * 0.2 +
    consistency * 0.2 +
    improvement * 0.2;

  return {
    winRate,
    kda,
    consistency,
    improvement,
    overall,
  };
}
