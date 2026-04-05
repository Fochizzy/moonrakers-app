/**
 * 🎯 Per-round stats for a player
 */
export type RoundStats = {
  prestige?: number;
  contracts?: number;
  assists?: number;
  failures?: number;

  // Derived (optional, can be computed)
  score?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

/**
 * 📊 Totals (aggregated across rounds or games)
 */
export type PlayerTotals = {
  score: number;
  prestige: number;
  efficiency: number;
  assistedEfficiency: number;
};

/**
 * 📈 Advanced analytics snapshot
 */
export type AdvancedStats = {
  winRate: number;
  avgScore: number;
  bestGame: number;
  worstGame: number;
  consistency: number;
  trend: number;
};
