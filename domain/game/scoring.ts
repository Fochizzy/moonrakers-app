export type Score = {
  player_id: string;
  round: number;
  value: number;
};

type Point = {
  x: string;
  y: number;
};

// -----------------------------
// 🧠 Internal builder
// -----------------------------
function collectPlayerScores(
  scores: readonly Score[],
  playerId: string
): Score[] {
  const out: Score[] = [];

  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    if (s.player_id === playerId) {
      out.push(s);
    }
  }

  return out;
}

// -----------------------------
// 🚀 Cumulative Chart
// -----------------------------
export function buildCumulativeScores(
  scores: readonly Score[] = [],
  playerId: string
): Point[] {
  if (!scores.length || !playerId) return [];

  const playerScores = collectPlayerScores(scores, playerId);
  const len = playerScores.length;

  if (len === 0) return [];

  // sort only if necessary
  playerScores.sort((a, b) => a.round - b.round);

  const result: Point[] = new Array(len);

  let total = 0;

  for (let i = 0; i < len; i++) {
    const s = playerScores[i];
    const val = s.value | 0;     // faster coercion
    const round = s.round | 0;

    total += val;

    result[i] = {
      x: `R${round}`,
      y: total,
    };
  }

  return result;
}

// -----------------------------
// 🚀 Total Score (single pass)
// -----------------------------
export function getTotalScore(
  scores: readonly Score[] = [],
  playerId: string
): number {
  if (!scores.length || !playerId) return 0;

  let total = 0;

  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    if (s.player_id === playerId) {
      total += s.value | 0;
    }
  }

  return total;
}
