import { BASE_ELO, K_FACTOR } from './constants';
import { computePerformance } from './performance';

export function expectedScore(a: number, b: number) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number
) {
  const expectedA = expectedScore(ratingA, ratingB);
  return ratingA + K_FACTOR * (scoreA - expectedA);
}

function getMatchScore(perfA: number, perfB: number) {
  // 🧠 Continuous scoring (BEST VERSION)
  const total = Math.abs(perfA) + Math.abs(perfB) || 1;

  return (perfA + total) / (2 * total);
}

export function calculateElo(games: any[]) {
  const ratings: Record<string, number> = {};

  for (const game of games) {
    const players = Object.keys(game.totals || {});

    // initialize players
    players.forEach((p) => {
      if (!(p in ratings)) ratings[p] = BASE_ELO;
    });

    // 🧠 pairwise comparisons
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i];
        const b = players[j];

        const perfA = computePerformance(game.totals[a]);
        const perfB = computePerformance(game.totals[b]);

        const scoreA = getMatchScore(perfA, perfB);
        const scoreB = 1 - scoreA;

        const newA = updateElo(ratings[a], ratings[b], scoreA);
        const newB = updateElo(ratings[b], ratings[a], scoreB);

        ratings[a] = newA;
        ratings[b] = newB;
      }
    }
  }

  return ratings;
}
