import { mean, safeDivide, slope, sum } from "./eloMath";
import { EloGameRecord } from "./eloTransforms";

export type EloMetricTab =
  | "Leaderboard"
  | "Momentum"
  | "Skills"
  | "Context"
  | "Projection";

export type EloMetricFormat =
  | "number"
  | "percent"
  | "elo"
  | "rank"
  | "decimal";

export type MetricKey =
  | "elo_current"
  | "elo_peak"
  | "elo_confidence"
  | "elo_change_last_5"
  | "elo_change_last_10"
  | "elo_rolling_win_rate_10"
  | "elo_momentum"
  | "elo_expected_vs_actual"
  | "elo_clutch"
  | "elo_upset_rate"
  | "elo_h2h_trend"
  | "elo_h2h_last_5"
  | "elo_h2h_recent_win_rate"
  | "elo_expected_win_prob"
  | "elo_projection_5"
  | "elo_projection_10"
  | "strengthOfSchedule"
  | "tierStabilityScore"
  | "consistencyScore"
  | "upsetRate"
  | "recoveryRate"
  | "conversionScore"
  | "clutchScore"
  | "vsHigherRatedWinRate"
  | "contextConfidence"
  | "promotionOdds"
  | "trajectoryGrade"
  | "futurePeakEstimate"
  | "antiStyleMatchupScore"
  | "tempoControl"
  | "defenseDenialScore"
  | "pressureReliability";

export type MetricContext = {
  selectedSeat?: number;
  selectedOpponentId?: string | null;
};

export type MetricDef = {
  key: MetricKey;
  label: string;
  tab: EloMetricTab;
  format: EloMetricFormat;
  requiredFields: string[];
  description?: string;
  compute: (
    rows: EloGameRecord[],
    allRows?: EloGameRecord[],
    context?: MetricContext
  ) => number;
};

export type WinningSignalCard = {
  key: MetricKey;
  label: string;
  value: number;
  weightedScore: number;
  reason: string;
};

function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function currentElo(rows: EloGameRecord[]): number {
  if (!rows.length) return 1200;
  return rows[rows.length - 1]?.postGameElo ?? 1200;
}

function peakElo(rows: EloGameRecord[]): number {
  return rows.length ? Math.max(...rows.map((r) => r.postGameElo || 0), 1200) : 1200;
}

function expectedWinProbFromRow(row: EloGameRecord): number {
  const diff = (row.preGameElo || 0) - (row.opponentAvgElo || 0);
  return 1 / (1 + Math.pow(10, -diff / 400));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function getWins(rows: EloGameRecord[]): number {
  return rows.filter((r) => r.win === 1).length;
}

function getHigherRatedRows(rows: EloGameRecord[]): EloGameRecord[] {
  return rows.filter((r) => (r.preGameElo || 0) < (r.opponentAvgElo || 0));
}

function getRecoveryWindows(rows: EloGameRecord[]): EloGameRecord[] {
  const windows: EloGameRecord[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row !== undefined && (rows[i - 1]?.win ?? 0) === 0) {
      windows.push(row);
    }
  }
  return windows;
}

function getLeadRows(rows: EloGameRecord[]): EloGameRecord[] {
  return rows.filter((r) => expectedWinProbFromRow(r) >= 0.55);
}

function getClutchRows(rows: EloGameRecord[]): EloGameRecord[] {
  return rows.filter((r) => {
    const expected = expectedWinProbFromRow(r);
    return expected >= 0.4 && expected <= 0.6;
  });
}

function getPressureRows(rows: EloGameRecord[]): EloGameRecord[] {
  return rows.filter((r) => Math.abs((r.preGameElo || 0) - (r.opponentAvgElo || 0)) <= 75);
}

function getEloStdDev(rows: EloGameRecord[]): number {
  if (rows.length < 2) return 0;
  const values = rows.map((r) => r.postGameElo || 0);
  const avg = mean(values);
  const variance =
    values.reduce((acc, value) => acc + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function getTierThreshold(elo: number): number {
  if (elo < 1100) return 1100;
  if (elo < 1200) return 1200;
  if (elo < 1300) return 1300;
  if (elo < 1400) return 1400;
  if (elo < 1500) return 1500;
  return Math.ceil(elo / 100) * 100;
}

function getRecentEloSlope(rows: EloGameRecord[], n = 10): number {
  const recent = lastN(rows, n);
  if (recent.length < 2) return 0;
  return slope(
    recent.map((_, i) => i + 1),
    recent.map((r) => r.postGameElo || 0)
  );
}

function normalizeSlope(value: number): number {
  return clamp01((value + 20) / 40);
}

export const metricRegistry: Record<MetricKey, MetricDef> = {
  elo_current: {
    key: "elo_current",
    label: "Current ELO",
    tab: "Leaderboard",
    format: "elo",
    requiredFields: ["postGameElo"],
    compute: (rows) => currentElo(rows),
  },
  elo_peak: {
    key: "elo_peak",
    label: "Peak ELO",
    tab: "Leaderboard",
    format: "elo",
    requiredFields: ["postGameElo"],
    compute: (rows) => peakElo(rows),
  },
  elo_confidence: {
    key: "elo_confidence",
    label: "Confidence",
    tab: "Leaderboard",
    format: "percent",
    requiredFields: ["gameId"],
    compute: (rows) => Math.min(1, rows.length / 30),
  },
  elo_change_last_5: {
    key: "elo_change_last_5",
    label: "Last 5",
    tab: "Momentum",
    format: "elo",
    requiredFields: ["eloDelta"],
    compute: (rows) => sum(lastN(rows, 5).map((r) => r.eloDelta || 0)),
  },
  elo_change_last_10: {
    key: "elo_change_last_10",
    label: "Last 10",
    tab: "Momentum",
    format: "elo",
    requiredFields: ["eloDelta"],
    compute: (rows) => sum(lastN(rows, 10).map((r) => r.eloDelta || 0)),
  },
  elo_rolling_win_rate_10: {
    key: "elo_rolling_win_rate_10",
    label: "Win Rate (10)",
    tab: "Momentum",
    format: "percent",
    requiredFields: ["win"],
    compute: (rows) => {
      const recent = lastN(rows, 10);
      return safeDivide(recent.filter((r) => r.win === 1).length, recent.length);
    },
  },
  elo_momentum: {
    key: "elo_momentum",
    label: "Momentum",
    tab: "Momentum",
    format: "number",
    requiredFields: ["postGameElo"],
    compute: (rows) => {
      if (rows.length < 2) return 0;
      return slope(
        rows.map((_, i) => i + 1),
        rows.map((r) => r.postGameElo || 0)
      );
    },
  },
  elo_expected_vs_actual: {
    key: "elo_expected_vs_actual",
    label: "Expected vs Actual",
    tab: "Skills",
    format: "decimal",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) =>
      mean(rows.map((r) => (r.win ? 1 : 0) - expectedWinProbFromRow(r))),
  },
  elo_clutch: {
    key: "elo_clutch",
    label: "Clutch",
    tab: "Skills",
    format: "elo",
    requiredFields: ["win", "eloDelta"],
    compute: (rows) =>
      sum(rows.filter((r) => r.win === 1).map((r) => r.eloDelta || 0)),
  },
  elo_upset_rate: {
    key: "elo_upset_rate",
    label: "Upset Rate",
    tab: "Skills",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) => {
      const underdogGames = getHigherRatedRows(rows);
      if (!underdogGames.length) return 0;
      return safeDivide(
        underdogGames.filter((r) => r.win === 1).length,
        underdogGames.length
      );
    },
  },
  elo_h2h_trend: {
    key: "elo_h2h_trend",
    label: "H2H Trend",
    tab: "Context",
    format: "number",
    requiredFields: ["playerId", "opponentIds", "postGameElo"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      const playerId = rows[0]?.playerId;
      if (!opponentId || !playerId || !allRows?.length) return 0;

      const h2h = allRows.filter(
        (r) =>
          r.playerId === playerId &&
          Array.isArray(r.opponentIds) &&
          r.opponentIds.includes(opponentId)
      );
      if (h2h.length < 2) return 0;

      return slope(
        h2h.map((_, i) => i + 1),
        h2h.map((r) => r.postGameElo || 0)
      );
    },
  },
  elo_h2h_last_5: {
    key: "elo_h2h_last_5",
    label: "H2H Last 5",
    tab: "Context",
    format: "elo",
    requiredFields: ["playerId", "opponentIds", "eloDelta"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      const playerId = rows[0]?.playerId;
      if (!opponentId || !playerId || !allRows?.length) return 0;

      const h2h = allRows.filter(
        (r) =>
          r.playerId === playerId &&
          Array.isArray(r.opponentIds) &&
          r.opponentIds.includes(opponentId)
      );

      return sum(lastN(h2h, 5).map((r) => r.eloDelta || 0));
    },
  },
  elo_h2h_recent_win_rate: {
    key: "elo_h2h_recent_win_rate",
    label: "H2H Win Rate",
    tab: "Context",
    format: "percent",
    requiredFields: ["playerId", "opponentIds", "win"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      const playerId = rows[0]?.playerId;
      if (!opponentId || !playerId || !allRows?.length) return 0;

      const h2h = lastN(
        allRows.filter(
          (r) =>
            r.playerId === playerId &&
            Array.isArray(r.opponentIds) &&
            r.opponentIds.includes(opponentId)
        ),
        5
      );

      return safeDivide(h2h.filter((r) => r.win === 1).length, h2h.length);
    },
  },
  elo_expected_win_prob: {
    key: "elo_expected_win_prob",
    label: "Expected Win %",
    tab: "Projection",
    format: "percent",
    requiredFields: ["preGameElo", "opponentAvgElo"],
    compute: (rows) => mean(rows.map(expectedWinProbFromRow)),
  },
  elo_projection_5: {
    key: "elo_projection_5",
    label: "Projection (5)",
    tab: "Projection",
    format: "elo",
    requiredFields: ["postGameElo", "eloDelta"],
    compute: (rows) =>
      currentElo(rows) + ((rows[rows.length - 1]?.eloDelta ?? 0) * 5),
  },
  elo_projection_10: {
    key: "elo_projection_10",
    label: "Projection (10)",
    tab: "Projection",
    format: "elo",
    requiredFields: ["postGameElo", "eloDelta"],
    compute: (rows) =>
      currentElo(rows) + ((rows[rows.length - 1]?.eloDelta ?? 0) * 10),
  },

  strengthOfSchedule: {
    key: "strengthOfSchedule",
    label: "Strength of Schedule",
    tab: "Context",
    format: "elo",
    requiredFields: ["opponentAvgElo"],
    compute: (rows) => {
      if (!rows.length) return 1200;
      return mean(rows.map((r) => r.opponentAvgElo || 1200));
    },
  },
  tierStabilityScore: {
    key: "tierStabilityScore",
    label: "Tier Stability",
    tab: "Skills",
    format: "percent",
    requiredFields: ["postGameElo"],
    compute: (rows) => {
      const avgElo = mean(rows.map((r) => r.postGameElo || 0));
      const eloStdDev = getEloStdDev(rows);
      if (avgElo <= 0) return 0;
      return clamp01(1 - safeDivide(eloStdDev, Math.max(avgElo, 1)));
    },
  },
  consistencyScore: {
    key: "consistencyScore",
    label: "Consistency",
    tab: "Skills",
    format: "percent",
    requiredFields: ["win", "postGameElo"],
    compute: (rows) => {
      const winRate = safeDivide(getWins(rows), rows.length);
      const avgElo = mean(rows.map((r) => r.postGameElo || 0));
      const eloStdDev = getEloStdDev(rows);
      const variancePenalty = clamp01(safeDivide(eloStdDev, Math.max(avgElo * 0.12, 1)));
      return clamp01(winRate * (1 - variancePenalty));
    },
  },
  upsetRate: {
    key: "upsetRate",
    label: "Upset Rate",
    tab: "Momentum",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) => {
      const underdogGames = getHigherRatedRows(rows);
      if (!underdogGames.length) return 0;
      const upsetWins = underdogGames.filter((r) => r.win === 1).length;
      return safeDivide(upsetWins, underdogGames.length);
    },
  },
  recoveryRate: {
    key: "recoveryRate",
    label: "Recovery Rate",
    tab: "Momentum",
    format: "percent",
    requiredFields: ["win"],
    compute: (rows) => {
      const recoveryWindows = getRecoveryWindows(rows);
      if (!recoveryWindows.length) return 0;
      return safeDivide(
        recoveryWindows.filter((r) => r.win === 1).length,
        recoveryWindows.length
      );
    },
  },
  conversionScore: {
    key: "conversionScore",
    label: "Lead Conversion",
    tab: "Skills",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) => {
      const leadRows = getLeadRows(rows);
      if (!leadRows.length) return 0;
      return safeDivide(
        leadRows.filter((r) => r.win === 1).length,
        leadRows.length
      );
    },
  },
  clutchScore: {
    key: "clutchScore",
    label: "Clutch Score",
    tab: "Skills",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) => {
      const clutchRows = getClutchRows(rows);
      if (!clutchRows.length) return 0;
      return safeDivide(
        clutchRows.filter((r) => r.win === 1).length,
        clutchRows.length
      );
    },
  },
  vsHigherRatedWinRate: {
    key: "vsHigherRatedWinRate",
    label: "Vs Higher Rated",
    tab: "Context",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) => {
      const higherRated = getHigherRatedRows(rows);
      if (!higherRated.length) return 0;
      return safeDivide(
        higherRated.filter((r) => r.win === 1).length,
        higherRated.length
      );
    },
  },
  contextConfidence: {
    key: "contextConfidence",
    label: "Context Confidence",
    tab: "Context",
    format: "percent",
    requiredFields: ["gameId"],
    compute: (rows, allRows, context) => {
      const opponentId = context?.selectedOpponentId;
      if (!opponentId) return clamp01(Math.log(rows.length + 1) / 5);

      const playerId = rows[0]?.playerId;
      if (!playerId || !allRows?.length) return 0;

      const h2h = allRows.filter(
        (r) =>
          r.playerId === playerId &&
          Array.isArray(r.opponentIds) &&
          r.opponentIds.includes(opponentId)
      );

      return clamp01(Math.log(h2h.length + 1) / 5);
    },
  },
  promotionOdds: {
    key: "promotionOdds",
    label: "Promotion Odds",
    tab: "Projection",
    format: "percent",
    requiredFields: ["postGameElo"],
    compute: (rows) => {
      const current = currentElo(rows);
      const threshold = getTierThreshold(current);
      return clamp01(sigmoid((current - threshold) / 50));
    },
  },

  trajectoryGrade: {
    key: "trajectoryGrade",
    label: "Trajectory Grade",
    tab: "Projection",
    format: "percent",
    requiredFields: ["postGameElo"],
    compute: (rows) => {
      const trend = getRecentEloSlope(rows, 10);
      return clamp01(normalizeSlope(trend));
    },
  },
  futurePeakEstimate: {
    key: "futurePeakEstimate",
    label: "Future Peak",
    tab: "Projection",
    format: "elo",
    requiredFields: ["postGameElo", "eloDelta"],
    compute: (rows) => {
      const current = currentElo(rows);
      const trend = Math.max(0, getRecentEloSlope(rows, 10));
      const bonus = Math.min(120, trend * 8);
      return current + bonus;
    },
  },
  antiStyleMatchupScore: {
    key: "antiStyleMatchupScore",
    label: "Anti-Style",
    tab: "Context",
    format: "percent",
    requiredFields: ["preGameElo", "opponentAvgElo", "win"],
    compute: (rows) => {
      const toughRows = rows.filter((r) => Math.abs((r.preGameElo || 0) - (r.opponentAvgElo || 0)) >= 75);
      if (!toughRows.length) return 0;
      return safeDivide(toughRows.filter((r) => r.win === 1).length, toughRows.length);
    },
  },
  tempoControl: {
    key: "tempoControl",
    label: "Tempo Control",
    tab: "Context",
    format: "percent",
    requiredFields: ["postGameElo", "eloDelta"],
    compute: (rows) => {
      if (!rows.length) return 0;
      const positive = rows.filter((r) => (r.eloDelta || 0) > 0).length;
      return safeDivide(positive, rows.length);
    },
  },
  defenseDenialScore: {
    key: "defenseDenialScore",
    label: "Defense Denial",
    tab: "Context",
    format: "percent",
    requiredFields: ["preGameElo", "opponentAvgElo", "win"],
    compute: (rows) => {
      const favoredOpponentRows = rows.filter((r) => (r.preGameElo || 0) < (r.opponentAvgElo || 0));
      if (!favoredOpponentRows.length) return 0;
      return safeDivide(favoredOpponentRows.filter((r) => r.win === 1).length, favoredOpponentRows.length);
    },
  },
  pressureReliability: {
    key: "pressureReliability",
    label: "Pressure Reliability",
    tab: "Skills",
    format: "percent",
    requiredFields: ["win", "preGameElo", "opponentAvgElo"],
    compute: (rows) => {
      const pressureRows = getPressureRows(rows);
      if (!pressureRows.length) return 0;
      return safeDivide(pressureRows.filter((r) => r.win === 1).length, pressureRows.length);
    },
  },
};

export const METRIC_REGISTRY = metricRegistry;

export const metricOrderByTab: Record<EloMetricTab, MetricKey[]> = {
  Leaderboard: ["elo_current", "elo_peak", "elo_confidence"],
  Momentum: [
    "elo_change_last_5",
    "elo_change_last_10",
    "elo_rolling_win_rate_10",
    "elo_momentum",
    "upsetRate",
    "recoveryRate",
  ],
  Skills: [
    "elo_expected_vs_actual",
    "elo_clutch",
    "elo_upset_rate",
    "tierStabilityScore",
    "consistencyScore",
    "conversionScore",
    "clutchScore",
    "pressureReliability",
    "elo_expected_win_prob",
    "elo_projection_5",
    "elo_projection_10",
    "promotionOdds",
    "trajectoryGrade",
    "futurePeakEstimate",
  ],
  Context: [
    "elo_h2h_trend",
    "elo_h2h_last_5",
    "elo_h2h_recent_win_rate",
    "strengthOfSchedule",
    "vsHigherRatedWinRate",
    "contextConfidence",
    "antiStyleMatchupScore",
    "tempoControl",
    "defenseDenialScore",
  ],
  Projection: [
    "elo_expected_win_prob",
    "elo_projection_5",
    "elo_projection_10",
    "promotionOdds",
    "trajectoryGrade",
    "futurePeakEstimate",
  ],
};

export function getMetricsForTab(tab: EloMetricTab): MetricDef[] {
  return metricOrderByTab[tab].map((key) => metricRegistry[key]);
}

export function computeMetric(
  key: MetricKey,
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): number {
  return metricRegistry[key]?.compute(rows, allRows, context) ?? 0;
}

const winningSignalWeights: Partial<Record<MetricKey, number>> = {
  clutchScore: 1.5,
  conversionScore: 1.3,
  consistencyScore: 1.2,
  upsetRate: 1.1,
  recoveryRate: 1.05,
  vsHigherRatedWinRate: 1.15,
  strengthOfSchedule: 0.95,
  tierStabilityScore: 1.0,
  contextConfidence: 0.85,
  promotionOdds: 0.9,
  pressureReliability: 1.15,
  trajectoryGrade: 1.05,
};

const winningSignalReasons: Partial<Record<MetricKey, string>> = {
  clutchScore: "Wins tight games at a high rate.",
  conversionScore: "Converts favorable setups into wins.",
  consistencyScore: "Produces stable results across recent games.",
  upsetRate: "Beats stronger tables more often than expected.",
  recoveryRate: "Bounces back well after losses.",
  vsHigherRatedWinRate: "Performs well against stronger-rated opponents.",
  strengthOfSchedule: "Maintains results against tougher average opponents.",
  tierStabilityScore: "Maintains rating with low volatility.",
  contextConfidence: "Signal is supported by a meaningful sample.",
  promotionOdds: "Current trajectory points toward the next tier.",
  pressureReliability: "Holds up in tighter pressure environments.",
  trajectoryGrade: "Recent ELO path is pointing upward.",
};

export function getTop3WinningSignalsEngineV2(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
): WinningSignalCard[] {
  const candidateKeys: MetricKey[] = [
    "clutchScore",
    "conversionScore",
    "consistencyScore",
    "upsetRate",
    "recoveryRate",
    "vsHigherRatedWinRate",
    "strengthOfSchedule",
    "tierStabilityScore",
    "contextConfidence",
    "promotionOdds",
    "pressureReliability",
    "trajectoryGrade",
  ];

  return candidateKeys
    .map((key) => {
      const value = computeMetric(key, rows, allRows, context);
      const weight = winningSignalWeights[key] ?? 1;
      return {
        key,
        label: metricRegistry[key].label,
        value,
        weightedScore: value * weight,
        reason: winningSignalReasons[key] ?? "Strong contributor to winning.",
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3);
}
