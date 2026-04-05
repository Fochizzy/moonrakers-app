// utils/buildTotals.ts

import { computeScore } from '@/utils/scoreHelpers';

// -----------------------------
// 🎯 Types
// -----------------------------
type Round = {
  playerId: string;
  stats: {
    prestige: number;
    contracts: number;
    assists: number;
    failures: number;
    assistWeights?: Record<string, number>;
  };
};

type Player = {
  id: string;
};

// -----------------------------
// 🧠 Build Totals
// -----------------------------
export function buildTotals(
  rounds: Round[],
  players: Player[]
) {
  const totals: Record<string, any> = {};

  // -----------------------------
  // 🔹 Initialize players
  // -----------------------------
  for (let i = 0; i < players.length; i++) {
    const p = players[i];

    totals[p.id] = {
      prestige: 0,
      contracts: 0,
      assists: 0,
      failures: 0,
      score: 0,
      performance: 0,
    };
  }

  // -----------------------------
  // 🔁 Process rounds
  // -----------------------------
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    const s = r.stats;

    const player = totals[r.playerId];

    // base stats
    player.contracts += s.contracts;
    player.failures += s.failures;

    const hasAssist =
      s.assistWeights &&
      Object.keys(s.assistWeights).length > 0;

    const isValidAssist = hasAssist && s.failures === 0;

    // -----------------------------
    // 🤝 SHARED PRESTIGE (WEIGHTED)
    // -----------------------------
    if (isValidAssist && s.prestige !== 0) {
      const weights = {
        [r.playerId]: 1,
        ...s.assistWeights,
      };

      let totalWeight = 0;
      for (const id in weights) {
        totalWeight += weights[id];
      }

      for (const id in weights) {
        const share =
          (s.prestige * weights[id]) / totalWeight;

        totals[id].prestige += share;
      }

      // assists only count if no failure
      for (const id in s.assistWeights) {
        totals[id].assists += s.assists ?? 0;
      }
    } else {
      // -----------------------------
      // 🎯 SOLO OR FAILURE
      // -----------------------------
      if (s.failures === 0) {
        player.prestige += s.prestige;
      }

      // assist only if valid
      if (isValidAssist) {
        for (const id in s.assistWeights) {
          totals[id].assists += s.assists ?? 0;
        }
      }
    }

    // -----------------------------
    // 🧮 SCORE (secondary stat)
    // -----------------------------
    const score = computeScore(s);

    player.score += score;
    player.performance += score;
  }

  // -----------------------------
  // 🧠 Normalize performance (0–1)
  // -----------------------------
  const values = Object.values(totals).map(
    (t: any) => t.performance
  );

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const ids = Object.keys(totals);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    totals[id].performance =
      (totals[id].performance - min) / range;
  }

  return totals;
}
