import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  View,
  Image,
} from "react-native";
import { uiPolish } from "@/utils/uiPolish";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store/useStore";

import {
  getDefaultMetricTab,
  useMetricScreenData,
} from "@/utils/elo/metricHooks";
import {
  computeMetric,
  type EloMetricTab,
  type MetricContext,
} from "@/utils/elo/metricRegistry";
import MoonrakersIntelSection from "@/components/player/MoonrakersIntelSection";
import { buildPlaystyleSamples } from "@/utils/playstyleEngine";
import { buildMoonrakersIntelProfile } from "@/utils/playerProfileMoonrakers";
import { resolveAssignedCardArtIndexForProfile } from "@/utils/profileAppearance";
import { isValidPlayerCardArtIndex } from "@/utils/playerCards";
import {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildPlayerProfileRoute,
} from "@/utils/appRoutes";
import { buildCommonOpponentOptions } from "@/utils/charts";

const SHEET = require("@/assets/images/player-card-sheet.png");

const COLORS = {
  bg: "#081120",
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.16)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

type ProfileGameRow = {
  gameId: string;
  playerId: string;
  opponentIds: string[];
  preGameElo: number;
  postGameElo: number;
  opponentAvgElo: number;
  eloDelta: number;
  win: number;
  gameIndex: number;
};

type StatCardTone = "default" | "accent" | "blue" | "green" | "blue" | "red";

type CustomCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: StatCardTone;
};

const PROFILE_TABS: EloMetricTab[] = [
  "Leaderboard",
  "Momentum",
  "Skills",
  "Context",
  "Projection",
];

function getPlayerAccent(color?: string) {
  switch ((color ?? "").toLowerCase()) {
    case "blue":
      return "#60A5FA";
    case "green":
      return "#84CC16";
    case "purple":
      return "#C084FC";
    case "orange":
      return "#FB923C";
    case "yellow":
      return "#FACC15";
    default:
      return "#A855F7";
  }
}

function cropPosition(index: number) {
  return {
    row: Math.floor(index / 5),
    col: index % 5,
  };
}

function getInitials(name?: string) {
  if (!name?.trim()) return "?";
  return name.trim()[0].toUpperCase();
}

function CropCardArt({
  artIndex,
  width,
  height,
}: {
  artIndex: number;
  width: number;
  height: number;
}) {
  const { row, col } = cropPosition(artIndex);

  return (
    <View style={[styles.cropWindow, { width, height }]}>
      <Image
        source={SHEET}
        resizeMode="stretch"
        style={{
          position: "absolute",
          width: width * 5,
          height: height * 6,
          left: -(col * width),
          top: -(row * height),
        }}
      />
    </View>
  );
}
function toneStyles(tone?: StatCardTone) {
  switch (tone) {
    case "accent":
      return { bg: COLORS.accentSoft, value: COLORS.accent };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "green":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "red":
      return { bg: COLORS.redSoft, value: COLORS.red };
    default:
      return { bg: COLORS.whiteSoft, value: COLORS.text };
  }
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function formatMetricValue(value: string | number | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.round(value)}`;
  return "0";
}

function formatSigned(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0";
  const rounded =
    digits > 0 ? value.toFixed(digits) : `${Math.round(value)}`;
  return value > 0 ? `+${rounded}` : rounded;
}

function formatPercentFromDecimal(value: number): string {
  return `${Math.round(toNumber(value) * 100)}%`;
}

function buildAllRowsForPlayer(games: any[], playerId: string): ProfileGameRow[] {
  const rows: ProfileGameRow[] = [];

  (games || []).forEach((game: any, index: number) => {
    const players = Array.isArray(game?.players) ? game.players : [];
    const totals = game?.totals ?? {};

    const isInGame = players.some((p: any) => String(p?.id) === String(playerId));
    if (!isInGame) return;

    const playerTotals = totals?.[playerId];
    if (!playerTotals) return;

    const opponentIds = players
      .map((p: any) => String(p?.id))
      .filter((id: string) => id !== String(playerId));

    const opponentElos = opponentIds.map((id: string) =>
      toNumber(totals?.[id]?.elo ?? totals?.[id]?.rating ?? 1200)
    );

    const opponentAvgElo =
      opponentElos.length > 0
        ? opponentElos.reduce((acc: number, value: number) => acc + value, 0) /
          opponentElos.length
        : 1200;

    const preGameElo = toNumber(playerTotals?.elo ?? playerTotals?.rating ?? 1200);

    const winnerId =
      game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId ?? null;

    const win = String(winnerId) === String(playerId) ? 1 : 0;

    const eloDelta =
      typeof playerTotals?.eloDelta === "number"
        ? playerTotals.eloDelta
        : win
        ? 12
        : -12;

    rows.push({
      gameId: String(game?.id ?? game?.gameId ?? `game-${index}`),
      playerId: String(playerId),
      opponentIds,
      preGameElo,
      postGameElo: preGameElo + eloDelta,
      opponentAvgElo,
      eloDelta,
      win,
      gameIndex: index,
    });
  });

  return rows;
}

function getWinStreaks(rows: ProfileGameRow[]) {
  let currentWin = 0;
  let bestWin = 0;
  let currentLoss = 0;
  let worstLoss = 0;

  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].win === 1) currentWin += 1;
    else break;
  }

  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].win === 0) currentLoss += 1;
    else break;
  }

  let tempWin = 0;
  let tempLoss = 0;

  rows.forEach((row) => {
    if (row.win === 1) {
      tempWin += 1;
      tempLoss = 0;
      bestWin = Math.max(bestWin, tempWin);
    } else {
      tempLoss += 1;
      tempWin = 0;
      worstLoss = Math.max(worstLoss, tempLoss);
    }
  });

  return {
    currentWin,
    bestWin,
    currentLoss,
    worstLoss,
  };
}

function getLastN<T>(items: T[], count: number): T[] {
  return items.slice(Math.max(0, items.length - count));
}

function buildProfileInsights(
  rows: ProfileGameRow[],
  currentElo: number,
  peakElo: number,
  confidence: number
) {
  const last5 = getLastN(rows, 5);
  const last10 = getLastN(rows, 10);

  const winRateAll = rows.length ? sum(rows.map((r) => r.win)) / rows.length : 0;
  const winRate5 = last5.length ? sum(last5.map((r) => r.win)) / last5.length : 0;
  const avgDelta = rows.length ? average(rows.map((r) => r.eloDelta)) : 0;
  const avgDelta5 = last5.length ? average(last5.map((r) => r.eloDelta)) : 0;
  const variability = stdDev(rows.map((r) => r.eloDelta));
  const formGap = winRate5 - winRateAll;
  const peakGap = peakElo - currentElo;

  let headline = "Balanced profile";
  let body =
    "This player is tracking near their established baseline with no major outlier signal dominating the profile.";

  if (formGap >= 0.2 && avgDelta5 > 0) {
    headline = "Heating up";
    body =
      "Recent form is materially above the player’s long-run win rate, and short-run ELO change is trending positive.";
  } else if (formGap <= -0.2 && avgDelta5 < 0) {
    headline = "Cooling off";
    body =
      "Recent form has slipped below baseline, with weaker short-run win conversion and negative recent ELO drift.";
  } else if (confidence >= 0.75 && peakGap <= 25) {
    headline = "Stable contender";
    body =
      "This player is operating close to peak level with above-average confidence, which suggests repeatable output rather than volatility.";
  } else if (variability >= 18) {
    headline = "High variance profile";
    body =
      "Performance swings are large from game to game. Upside is evident, but consistency remains the main limiter.";
  }

  return { headline, body };
}

function buildCustomTabCards(
  activeTab: EloMetricTab,
  rows: ProfileGameRow[],
  selectedPlayerName: string,
  selectedOpponentName?: string | null
): { cards: CustomCard[]; title: string; subtitle: string } {
  const totalGames = rows.length;
  const wins = sum(rows.map((r) => r.win));
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? wins / totalGames : 0;

  const metricRows = rows as any;
  const currentElo = computeMetric("elo_current", metricRows);
  const peakElo = computeMetric("elo_peak", metricRows);
  const confidence = computeMetric("elo_confidence", metricRows);

  const last3 = getLastN(rows, 3);
  const last5 = getLastN(rows, 5);
  const last10 = getLastN(rows, 10);

  const recentWinRate3 = last3.length ? sum(last3.map((r) => r.win)) / last3.length : 0;
  const recentWinRate5 = last5.length ? sum(last5.map((r) => r.win)) / last5.length : 0;
  const recentWinRate10 = last10.length ? sum(last10.map((r) => r.win)) / last10.length : 0;

  const avgDelta = totalGames ? average(rows.map((r) => r.eloDelta)) : 0;
  const recentAvgDelta5 = last5.length ? average(last5.map((r) => r.eloDelta)) : 0;
  const recentAvgDelta10 = last10.length ? average(last10.map((r) => r.eloDelta)) : 0;

  const positiveDeltaRate = totalGames
    ? rows.filter((r) => r.eloDelta > 0).length / totalGames
    : 0;

  const avgOpponent = totalGames ? average(rows.map((r) => r.opponentAvgElo)) : 0;
  const highOppGames = rows.filter((r) => r.opponentAvgElo >= currentElo).length;
  const highOppWins = rows.filter((r) => r.opponentAvgElo >= currentElo && r.win === 1).length;
  const highOppWinRate = highOppGames ? highOppWins / highOppGames : 0;

  const favoredGames = rows.filter((r) => r.preGameElo >= r.opponentAvgElo).length;
  const favoredWins = rows.filter((r) => r.preGameElo >= r.opponentAvgElo && r.win === 1).length;
  const favoredWinRate = favoredGames ? favoredWins / favoredGames : 0;

  const underdogGames = rows.filter((r) => r.preGameElo < r.opponentAvgElo).length;
  const underdogWins = rows.filter((r) => r.preGameElo < r.opponentAvgElo && r.win === 1).length;
  const underdogWinRate = underdogGames ? underdogWins / underdogGames : 0;

  const eloStd = stdDev(rows.map((r) => r.eloDelta));
  const postGameStd = stdDev(rows.map((r) => r.postGameElo));
  const peakGap = peakElo - currentElo;

  const strongestWin = rows.length
    ? rows.reduce((best, row) => (row.eloDelta > best.eloDelta ? row : best), rows[0])
    : null;

  const worstLoss = rows.length
    ? rows.reduce((worst, row) => (row.eloDelta < worst.eloDelta ? row : worst), rows[0])
    : null;

  const streaks = getWinStreaks(rows);

  const formScore = clamp(
    50 + (recentAvgDelta5 * 2.2) + ((recentWinRate5 - winRate) * 70),
    0,
    100
  );
  const skillScore = clamp(
    50 + ((currentElo - avgOpponent) / 8) + ((winRate - 0.5) * 100),
    0,
    100
  );
  const projectionScore = clamp(
    50 + (recentAvgDelta10 * 1.8) + ((confidence - 0.5) * 40) - (peakGap / 4),
    0,
    100
  );

  switch (activeTab) {
    case "Leaderboard":
      return {
        title: "Profile Snapshot",
        subtitle: `${selectedPlayerName} at a glance`,
        cards: [
          {
            key: "currentElo",
            label: "Current ELO",
            value: `${Math.round(currentElo)}`,
            sub: "Live rating",
            tone: "accent",
          },
          {
            key: "peakElo",
            label: "Peak ELO",
            value: `${Math.round(peakElo)}`,
            sub: `Gap ${Math.round(peakGap)}`,
            tone: "blue",
          },
          {
            key: "confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(confidence),
            sub: "Profile trust level",
            tone: "green",
          },
          {
            key: "games",
            label: "Games Played",
            value: `${totalGames}`,
            sub: `${wins}-${losses} record`,
            tone: "default",
          },
          {
            key: "winRate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            sub: `${wins} wins`,
            tone: winRate >= 0.6 ? "green" : winRate >= 0.45 ? "blue" : "red",
          },
          {
            key: "avgDelta",
            label: "Avg ELO Delta",
            value: formatSigned(avgDelta, 1),
            sub: "Per game net movement",
            tone: avgDelta >= 0 ? "green" : "red",
          },
          {
            key: "bestStreak",
            label: "Best Win Streak",
            value: `${streaks.bestWin}`,
            sub: `Current ${streaks.currentWin}`,
            tone: "blue",
          },
          {
            key: "variance",
            label: "Delta Variance",
            value: `${Math.round(eloStd)}`,
            sub: "Game-to-game swing",
            tone: eloStd <= 10 ? "green" : eloStd <= 18 ? "blue" : "red",
          },
        ],
      };

    case "Momentum":
      return {
        title: "Momentum Profile",
        subtitle: "Short-run form and trend strength",
        cards: [
          {
            key: "formScore",
            label: "Form Score",
            value: `${Math.round(formScore)}`,
            sub: "Recent trend index",
            tone: formScore >= 65 ? "green" : formScore >= 45 ? "blue" : "red",
          },
          {
            key: "recentDelta5",
            label: "Last 5 Avg Delta",
            value: formatSigned(recentAvgDelta5, 1),
            sub: "Recent ELO movement",
            tone: recentAvgDelta5 >= 0 ? "green" : "red",
          },
          {
            key: "recentDelta10",
            label: "Last 10 Avg Delta",
            value: formatSigned(recentAvgDelta10, 1),
            sub: "Extended form",
            tone: recentAvgDelta10 >= 0 ? "green" : "red",
          },
          {
            key: "wr3",
            label: "Last 3 Win Rate",
            value: formatPercentFromDecimal(recentWinRate3),
            sub: "Immediate form",
            tone: recentWinRate3 >= 0.67 ? "green" : recentWinRate3 >= 0.34 ? "blue" : "red",
          },
          {
            key: "wr5",
            label: "Last 5 Win Rate",
            value: formatPercentFromDecimal(recentWinRate5),
            sub: "Rolling sample",
            tone: recentWinRate5 >= 0.6 ? "green" : recentWinRate5 >= 0.4 ? "blue" : "red",
          },
          {
            key: "wr10",
            label: "Last 10 Win Rate",
            value: formatPercentFromDecimal(recentWinRate10),
            sub: "Trend stability",
            tone: recentWinRate10 >= 0.6 ? "green" : recentWinRate10 >= 0.4 ? "blue" : "red",
          },
          {
            key: "currentStreak",
            label: "Current Streak",
            value:
              streaks.currentWin > 0
                ? `${streaks.currentWin}W`
                : streaks.currentLoss > 0
                ? `${streaks.currentLoss}L`
                : "0",
            sub: `Best ${streaks.bestWin}W / Worst ${streaks.worstLoss}L`,
            tone: streaks.currentWin > 0 ? "green" : streaks.currentLoss > 0 ? "red" : "default",
          },
          {
            key: "positiveDeltaRate",
            label: "Positive Delta Rate",
            value: formatPercentFromDecimal(positiveDeltaRate),
            sub: "Share of upward games",
            tone: positiveDeltaRate >= 0.55 ? "green" : positiveDeltaRate >= 0.45 ? "blue" : "red",
          },
        ],
      };

    case "Skills":
      return {
        title: "Skill Indicators",
        subtitle: "Repeatable strength rather than short-run noise",
        cards: [
          {
            key: "skillScore",
            label: "Skill Score",
            value: `${Math.round(skillScore)}`,
            sub: "Overall strength index",
            tone: skillScore >= 65 ? "green" : skillScore >= 45 ? "blue" : "red",
          },
          {
            key: "favoredWinRate",
            label: "Favored Win Rate",
            value: formatPercentFromDecimal(favoredWinRate),
            sub: `${favoredWins}/${favoredGames} when favored`,
            tone: favoredWinRate >= 0.65 ? "green" : favoredWinRate >= 0.5 ? "blue" : "red",
          },
          {
            key: "underdogWinRate",
            label: "Underdog Win Rate",
            value: formatPercentFromDecimal(underdogWinRate),
            sub: `${underdogWins}/${underdogGames} when chasing`,
            tone: underdogWinRate >= 0.45 ? "green" : underdogWinRate >= 0.25 ? "blue" : "red",
          },
          {
            key: "avgOpponent",
            label: "Avg Opponent ELO",
            value: `${Math.round(avgOpponent)}`,
            sub: "Typical opposition",
            tone: "blue",
          },
          {
            key: "bestGain",
            label: "Best Single Gain",
            value: strongestWin ? formatSigned(strongestWin.eloDelta) : "0",
            sub: strongestWin ? `Game ${strongestWin.gameIndex + 1}` : "No data",
            tone: "green",
          },
          {
            key: "worstDrop",
            label: "Worst Single Drop",
            value: worstLoss ? formatSigned(worstLoss.eloDelta) : "0",
            sub: worstLoss ? `Game ${worstLoss.gameIndex + 1}` : "No data",
            tone: "red",
          },
          {
            key: "consistency",
            label: "Consistency Score",
            value: `${Math.round(clamp(100 - eloStd * 4.2, 0, 100))}`,
            sub: "Lower variance scores higher",
            tone: eloStd <= 10 ? "green" : eloStd <= 18 ? "blue" : "red",
          },
          {
            key: "baselineEdge",
            label: "Baseline Edge",
            value: formatSigned(currentElo - avgOpponent),
            sub: "Rating vs field average",
            tone: currentElo >= avgOpponent ? "accent" : "blue",
          },
        ],
      };

    case "Context":
      return {
        title: "Context Splits",
        subtitle: selectedOpponentName
          ? `Filtered to ${selectedOpponentName}`
          : "How results change by matchup strength",
        cards: [
          {
            key: "highOppRate",
            label: "Vs Equal+ ELO",
            value: formatPercentFromDecimal(highOppWinRate),
            sub: `${highOppWins}/${highOppGames} against stronger fields`,
            tone: highOppWinRate >= 0.5 ? "green" : highOppWinRate >= 0.35 ? "blue" : "red",
          },
          {
            key: "favoredRateContext",
            label: "When Favored",
            value: formatPercentFromDecimal(favoredWinRate),
            sub: `${favoredWins}/${favoredGames}`,
            tone: favoredWinRate >= 0.65 ? "green" : favoredWinRate >= 0.5 ? "blue" : "red",
          },
          {
            key: "underdogRateContext",
            label: "When Underdog",
            value: formatPercentFromDecimal(underdogWinRate),
            sub: `${underdogWins}/${underdogGames}`,
            tone: underdogWinRate >= 0.45 ? "green" : underdogWinRate >= 0.25 ? "blue" : "red",
          },
          {
            key: "opponentSpread",
            label: "Opponent Range",
            value: `${Math.round(
              rows.length ? Math.max(...rows.map((r) => r.opponentAvgElo)) - Math.min(...rows.map((r) => r.opponentAvgElo)) : 0
            )}`,
            sub: "Difficulty spread",
            tone: "blue",
          },
          {
            key: "averageOppDelta",
            label: "Opposition Gap",
            value: formatSigned(
              rows.length ? average(rows.map((r) => r.preGameElo - r.opponentAvgElo)) : 0,
              1
            ),
            sub: "Pre-game rating edge",
            tone: "accent",
          },
          {
            key: "contextDelta",
            label: "Context Avg Delta",
            value: formatSigned(avgDelta, 1),
            sub: selectedOpponentName ? "Filtered average" : "All-context average",
            tone: avgDelta >= 0 ? "green" : "red",
          },
          {
            key: "hardGamesShare",
            label: "Tough Match Share",
            value: formatPercentFromDecimal(
              totalGames ? highOppGames / totalGames : 0
            ),
            sub: "Games vs equal-or-better avg ELO",
            tone: "blue",
          },
          {
            key: "contextStability",
            label: "Context Stability",
            value: `${Math.round(clamp(100 - postGameStd * 0.9, 0, 100))}`,
            sub: "Post-game rating steadiness",
            tone: postGameStd <= 20 ? "green" : postGameStd <= 35 ? "blue" : "red",
          },
        ],
      };

    case "Projection":
    default:
      return {
        title: "Projection Signals",
        subtitle: "Where the profile is likely heading next",
        cards: [
          {
            key: "projectionScore",
            label: "Projection Score",
            value: `${Math.round(projectionScore)}`,
            sub: "Forward-looking outlook",
            tone: projectionScore >= 65 ? "green" : projectionScore >= 45 ? "blue" : "red",
          },
          {
            key: "peakGapProj",
            label: "Distance From Peak",
            value: `${Math.round(peakGap)}`,
            sub: "Closer is stronger",
            tone: peakGap <= 20 ? "green" : peakGap <= 50 ? "blue" : "red",
          },
          {
            key: "confidenceProj",
            label: "Confidence",
            value: formatPercentFromDecimal(confidence),
            sub: "Projection reliability",
            tone: confidence >= 0.7 ? "green" : confidence >= 0.5 ? "blue" : "red",
          },
          {
            key: "recentLift",
            label: "Recent Lift",
            value: formatSigned(
              last10.length ? average(last10.map((r) => r.postGameElo - r.preGameElo)) : 0,
              1
            ),
            sub: "Average late-sample gain",
            tone: recentAvgDelta10 >= 0 ? "green" : "red",
          },
          {
            key: "ceilingPressure",
            label: "Ceiling Pressure",
            value: `${Math.round(clamp((peakGap / Math.max(1, peakElo)) * 1000, 0, 100))}`,
            sub: "Lower means nearer ceiling",
            tone: peakGap <= 20 ? "green" : peakGap <= 50 ? "blue" : "red",
          },
          {
            key: "trendSlope",
            label: "Trend Slope",
            value: formatSigned(recentAvgDelta5 - avgDelta, 1),
            sub: "Recent vs overall pace",
            tone: recentAvgDelta5 >= avgDelta ? "green" : "red",
          },
          {
            key: "breakoutChance",
            label: "Breakout Chance",
            value: `${Math.round(
              clamp((recentWinRate10 * 45) + (confidence * 30) + ((peakGap <= 25 ? 15 : 0)) + (recentAvgDelta10 * 1.2), 0, 100)
            )}`,
            sub: "Upward move probability",
            tone: projectionScore >= 65 ? "green" : projectionScore >= 45 ? "blue" : "red",
          },
          {
            key: "floorStrength",
            label: "Floor Strength",
            value: `${Math.round(clamp((winRate * 55) + (confidence * 35) - (eloStd * 1.2), 0, 100))}`,
            sub: "Downside resistance",
            tone: confidence >= 0.65 && eloStd <= 14 ? "green" : "blue",
          },
        ],
      };
  }
}

function getPlayerNameById(players: StorePlayer[], playerId?: string | null): string | null {
  if (!playerId) return null;
  return players.find((player) => String(player.id) === String(playerId))?.name || null;
}

export default function PlayerProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();
  const scrollViewRef = React.useRef<ScrollView | null>(null);

  const games = useStore((s: any) => s.games || []);
  const players = useStore((s: any) => s.players || []);

  const playerId = Array.isArray(params.playerId) ? params.playerId[0] : params.playerId;
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EloMetricTab>(getDefaultMetricTab());
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [opponentSearchQuery, setOpponentSearchQuery] = useState("");
  const [recentGamesAnchorY, setRecentGamesAnchorY] = useState(0);
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const deferredOpponentSearchQuery = useDeferredValue(opponentSearchQuery);

  const sortedPlayers = useMemo<StorePlayer[]>(() => {
    return [...players].sort((a: StorePlayer, b: StorePlayer) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [players]);

  useEffect(() => {
    setSelectedOpponentId(null);
    setPlayerSearchQuery("");
    setOpponentSearchQuery("");
  }, [playerId]);

  const openCommandPage = () => {
    router.push(APP_ROUTES.home);
  };

  const handleSelectPlayer = (nextPlayerId: string) => {
    if (String(nextPlayerId) === String(playerId)) return;
    router.replace(buildPlayerProfileRoute(String(nextPlayerId)));
  };

  const openCompareLaunchpad = () => {
    if (!playerId) return;
    router.push(buildCompareRoute({ mode: "players", ids: [String(playerId)] }));
  };

  const openChartsLaunchpad = () => {
    if (!playerId) return;
    router.push(buildChartsRoute({
      playerId: String(playerId),
      setup: true,
    }));
  };

  const jumpToRecentGames = () => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(recentGamesAnchorY - 12, 0),
      animated: true,
    });
  };

  const selectedPlayer = useMemo(
    () => sortedPlayers.find((p) => String(p.id) === String(playerId)) || null,
    [sortedPlayers, playerId]
  );

  const filteredPlayerOptions = useMemo(() => {
    const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedPlayers;

    return sortedPlayers.filter((player) =>
      String(player?.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [sortedPlayers, deferredPlayerSearchQuery]);

  const selectedPlayerName = selectedPlayer?.name || "Player";
  const playerAccent = getPlayerAccent(selectedPlayer?.color);
  const playerArtIndex =
    (isValidPlayerCardArtIndex(selectedPlayer?.assignedCardArtIndex)
      ? selectedPlayer?.assignedCardArtIndex
      : resolveAssignedCardArtIndexForProfile({
          favoriteColor: selectedPlayer?.color,
          assignedCardArtIndex: null,
        })) ?? 0;

  const opponentOptions = useMemo(
    () => sortedPlayers.filter((p) => String(p.id) !== String(playerId)),
    [sortedPlayers, playerId]
  );

  const topOpponentOptions = useMemo(
    () =>
      buildCommonOpponentOptions({
        playerId,
        players: sortedPlayers as any,
        games: games as any,
        limit: 4,
      }),
    [playerId, sortedPlayers, games]
  );

  const filteredOpponentOptions = useMemo(() => {
    const normalizedQuery = deferredOpponentSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return opponentOptions.filter((player) =>
      String(player?.name || "").toLowerCase().includes(normalizedQuery)
    );
  }, [opponentOptions, deferredOpponentSearchQuery]);

  const profilePlayers = useMemo(
    () =>
      sortedPlayers.map((player) => ({
        id: String(player.id),
        name: player.name || "Player",
      })),
    [sortedPlayers]
  );

  const playstyleSamples = useMemo(
    () => buildPlaystyleSamples(profilePlayers as any, games),
    [profilePlayers, games]
  );

  const playerRows = useMemo(
    () => (playerId ? buildAllRowsForPlayer(games, String(playerId)) : []),
    [games, playerId]
  );

  const filteredRows = useMemo(() => {
    if (!selectedOpponentId) return playerRows;
    return playerRows.filter((row) =>
      row.opponentIds.some((id) => String(id) === String(selectedOpponentId))
    );
  }, [playerRows, selectedOpponentId]);

  const context: MetricContext = useMemo(
    () => ({
      selectedOpponentId: selectedOpponentId || null,
    }),
    [selectedOpponentId]
  );

  const {
    topCards,
    activeInsight,
    hasData,
  } = useMetricScreenData({
    games,
    players,
    playerId: playerId || null,
    activeTab,
    tabs: PROFILE_TABS,
    context,
  });

  const selectedOpponentName = getPlayerNameById(sortedPlayers, selectedOpponentId);

  const filteredMetricRows = filteredRows as any;
  const currentElo = computeMetric("elo_current", filteredMetricRows);
  const peakElo = computeMetric("elo_peak", filteredMetricRows);
  const confidence = computeMetric("elo_confidence", filteredMetricRows);

  const totalGames = filteredRows.length;
  const totalWins = filteredRows.filter((row) => row.win === 1).length;
  const winRate = totalGames > 0 ? totalWins / totalGames : 0;

  const currentEloBadgeIndex = playerArtIndex;
  const peakBadgeIndex = playerArtIndex;
  const winRateBadgeIndex = playerArtIndex;

  const customSection = useMemo(
    () =>
      buildCustomTabCards(
        activeTab,
        filteredRows,
        selectedPlayerName,
        selectedOpponentName
      ),
    [activeTab, filteredRows, selectedPlayerName, selectedOpponentName]
  );

  const moonrakersIntel = useMemo(() => {
    if (!playerId) {
      return {
        hasData: false as const,
        emptyTitle: "Not enough Moonrakers data yet",
        emptyBody:
          "Finish or import a few more games to unlock player-specific playstyle reads.",
      };
    }

    return buildMoonrakersIntelProfile({
      playerId: String(playerId),
      players: profilePlayers as any,
      games,
      samples: playstyleSamples,
    });
  }, [playerId, profilePlayers, games, playstyleSamples]);

  const featuredCard = topCards[0];
  const secondaryCards = topCards.slice(1, 3);

  const recentGames = useMemo(() => {
    const filteredGames = (games || []).filter((game: any) => {
      const gamePlayers = Array.isArray(game?.players) ? game.players : [];
      const includesPlayer = gamePlayers.some((p: any) => String(p?.id) === String(playerId));
      if (!includesPlayer) return false;

      if (!selectedOpponentId) return true;
      return gamePlayers.some((p: any) => String(p?.id) === String(selectedOpponentId));
    });

    return filteredGames.reverse();
  }, [games, playerId, selectedOpponentId]);

  const profileInsight = useMemo(
    () => buildProfileInsights(filteredRows, currentElo, peakElo, confidence),
    [filteredRows, currentElo, peakElo, confidence]
  );

  if (!selectedPlayer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Player not found</Text>
          <Text style={styles.centerSub}>
            The profile route does not match a player in store data.
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={openCommandPage}
          >
            <Text style={styles.backButtonText}>Back to Command</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
      >
        
        
        <View style={styles.headerCard}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.kicker}>Moonrakers</Text>

            <View style={styles.profileTitleRow}>
              <View
                style={[
                  styles.profileCardBadge,
                  { borderColor: playerAccent, shadowColor: playerAccent },
                ]}
              >
                <CropCardArt artIndex={playerArtIndex} width={44} height={44} />
                <View style={styles.profileCardBadgeDim} />
                <Text style={styles.profileCardBadgeText}>
                  {getInitials(selectedPlayer.name)}
                </Text>
              </View>

              <Text
                style={[
                  styles.title,
                  styles.profileTitleGlow,
                  { color: playerAccent, textShadowColor: playerAccent },
                ]}
              >
                {selectedPlayer.name || "Player Profile"}
              </Text>
            </View>

            <TextInput
              value={playerSearchQuery}
              onChangeText={setPlayerSearchQuery}
              placeholder="Search User"
              placeholderTextColor={COLORS.muted}
              style={styles.playerSearchInput}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {filteredPlayerOptions.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.profileSearchRail}
              >
                {filteredPlayerOptions.map((player) => {
                  const active = String(player.id) === String(playerId);

                  return (
                    <Pressable
                      key={String(player.id)}
                      style={styles.underlineTabButton}
                      onPress={() => handleSelectPlayer(String(player.id))}
                    >
                      <Text
                        style={[
                          styles.underlineTabText,
                          active && styles.underlineTabTextActive,
                        ]}
                      >
                        {player.name || "Player"}
                      </Text>
                      <View
                        style={[
                          styles.underlineTabLine,
                          active && styles.underlineTabLineActive,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No players match that search yet.</Text>
            )}
          </View>

          <Pressable
            style={styles.headerBadge}
            onPress={openCommandPage}
          >
            <Text style={styles.headerBadgeText}>Back to Command</Text>
          </Pressable>
        </View>

        <View style={styles.metricGridTop}>
          <View style={[styles.metricCardTop, { backgroundColor: COLORS.accentSoft }]}>
            <View style={styles.metricCardTopHeader}>
              <View style={[styles.metricMiniCardBadge, { borderColor: COLORS.accent, shadowColor: COLORS.accent }]}>
                <CropCardArt artIndex={currentEloBadgeIndex} width={24} height={24} />
                <View style={styles.metricMiniCardBadgeDim} />
                <Text style={styles.metricMiniCardBadgeText}>
                  {getInitials(selectedPlayer.name)}
                </Text>
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>Current ELO</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.accent }]}>
              {Math.round(currentElo)}
            </Text>
            <Text style={styles.metricSub}>Live rating</Text>
          </View>

          <View style={[styles.metricCardTop, { backgroundColor: COLORS.blueSoft }]}>
            <View style={styles.metricCardTopHeader}>
              <View style={[styles.metricMiniCardBadge, { borderColor: COLORS.blue, shadowColor: COLORS.blue }]}>
                <CropCardArt artIndex={peakBadgeIndex} width={24} height={24} />
                <View style={styles.metricMiniCardBadgeDim} />
                <Text style={styles.metricMiniCardBadgeText}>
                  {getInitials(selectedPlayer.name)}
                </Text>
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>Peak</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.blue }]}>
              {Math.round(peakElo)}
            </Text>
            <Text style={styles.metricSub}>Best rating reached</Text>
          </View>

          <View style={[styles.metricCardTop, { backgroundColor: COLORS.greenSoft }]}>
            <View style={styles.metricCardTopHeader}>
              <View style={[styles.metricMiniCardBadge, { borderColor: COLORS.green, shadowColor: COLORS.green }]}>
                <CropCardArt artIndex={winRateBadgeIndex} width={24} height={24} />
                <View style={styles.metricMiniCardBadgeDim} />
                <Text style={styles.metricMiniCardBadgeText}>
                  {getInitials(selectedPlayer.name)}
                </Text>
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>Win Rate</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.green }]}>
              {formatPercentFromDecimal(winRate)}
            </Text>
            <Text style={styles.metricSub}>
              {totalWins} wins / {totalGames} games
            </Text>
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSub}>Jump into the next player workflow</Text>
          </View>

          <View style={styles.quickActionsGrid}>
            <Pressable style={styles.quickActionCard} onPress={openCompareLaunchpad}>
              <Text style={styles.quickActionTitle}>Compare with...</Text>
              <Text style={styles.quickActionLabel}>
                Lock {selectedPlayer.name || "this player"} and pick the rival on the compare screen.
              </Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={openChartsLaunchpad}>
              <Text style={styles.quickActionTitle}>Open charts</Text>
              <Text style={styles.quickActionLabel}>
                Carry this player into chart setup and choose the view there.
              </Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={jumpToRecentGames}>
              <Text style={styles.quickActionTitle}>Recent games</Text>
              <Text style={styles.quickActionLabel}>
                Jump straight to the existing history section lower on this profile.
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.stickyProfileTabShell}>
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Profile Tabs</Text>
              <Text style={styles.sectionSub}>Custom player breakdown</Text>
            </View>

            <View style={styles.tabGrid}>
              <View style={styles.tabGridRowTwo}>
                {(["Leaderboard", "Momentum"] as EloMetricTab[]).map((tab) => {
                  const active = tab === activeTab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.underlineMainTab, styles.underlineMainTabTwoCol]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        style={[
                          styles.underlineMainTabText,
                          active && styles.underlineMainTabTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                      <View
                        style={[
                          styles.underlineMainTabLine,
                          active && styles.underlineMainTabLineActive,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.tabGridRowThree}>
                {(["Skills", "Context", "Projection"] as EloMetricTab[]).map((tab) => {
                  const active = tab === activeTab;
                  return (
                    <Pressable
                      key={tab}
                      style={[styles.underlineMainTab, styles.underlineMainTabThreeCol]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        style={[
                          styles.underlineMainTabText,
                          active && styles.underlineMainTabTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                      <View
                        style={[
                          styles.underlineMainTabLine,
                          active && styles.underlineMainTabLineActive,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.profileSummaryCards}>
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>View</Text>
              <Text style={styles.profileSummaryValue}>{activeTab}</Text>
            </View>
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Opponent</Text>
              <Text style={styles.profileSummaryValue}>
                {selectedOpponentId
                  ? opponentOptions.find((player) => String(player.id) === String(selectedOpponentId))?.name ?? "Focused"
                  : "All"}
              </Text>
            </View>
            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Signals</Text>
              <Text style={styles.profileSummaryValue}>{featuredCard ? "Ready" : "Pending"}</Text>
            </View>
          </View>
        </View>

        {activeTab === "Context" ? (
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Context Matchup</Text>
              <Text style={styles.sectionSub}>Filter to one opponent only when you want a narrower read</Text>
            </View>

            <View style={styles.underlineSelectorRow}>
              <Pressable
                style={styles.underlineTabButton}
                onPress={() => setSelectedOpponentId(null)}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    !selectedOpponentId && styles.underlineTabTextActive,
                  ]}
                >
                  All
                </Text>
                <View
                  style={[
                    styles.underlineTabLine,
                    !selectedOpponentId && styles.underlineTabLineActive,
                  ]}
                />
              </Pressable>

              {topOpponentOptions.map((player) => {
                const active = String(player.id) === String(selectedOpponentId);
                return (
                  <Pressable
                    key={player.id}
                    style={styles.underlineTabButton}
                    onPress={() => setSelectedOpponentId(String(player.id))}
                  >
                    <Text
                      style={[
                        styles.underlineTabText,
                        active && styles.underlineTabTextActive,
                      ]}
                    >
                      {player.name || "Unknown"}
                    </Text>
                    <View
                      style={[
                        styles.underlineTabLine,
                        active && styles.underlineTabLineActive,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={opponentSearchQuery}
              onChangeText={setOpponentSearchQuery}
              placeholder="Search opponents"
              placeholderTextColor={COLORS.muted}
              style={styles.contextSearchInput}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {opponentSearchQuery.trim() ? (
              filteredOpponentOptions.length ? (
                <View style={styles.underlineSelectorRow}>
                  {filteredOpponentOptions.map((player) => {
                    const active = String(player.id) === String(selectedOpponentId);
                    return (
                      <Pressable
                        key={`search-${player.id}`}
                        style={styles.underlineTabButton}
                        onPress={() => setSelectedOpponentId(String(player.id))}
                      >
                        <Text
                          style={[
                            styles.underlineTabText,
                            active && styles.underlineTabTextActive,
                          ]}
                        >
                          {player.name || "Unknown"}
                        </Text>
                        <View
                          style={[
                            styles.underlineTabLine,
                            active && styles.underlineTabLineActive,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No opponents match that search yet.</Text>
              )
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top 3 Winning Signals</Text>
            <Text style={styles.sectionSub}>{selectedPlayer.name || "No player selected"}</Text>
          </View>

          {!hasData ? (
            <Text style={styles.emptyText}>No ELO rows available for this player yet.</Text>
          ) : (
            <View style={styles.featuredSignalsWrap}>
              {featuredCard ? (
                <View
                  style={[
                    styles.featuredSignalCard,
                    { backgroundColor: toneStyles(featuredCard.tone as StatCardTone).bg },
                  ]}
                >
                  <Text style={styles.featuredSignalLabel} numberOfLines={1}>
                    {featuredCard.label}
                  </Text>
                  <Text
                    style={[
                      styles.featuredSignalValue,
                      { color: toneStyles(featuredCard.tone as StatCardTone).value },
                    ]}
                  >
                    {featuredCard.value}
                  </Text>
                  {featuredCard.sub ? (
                    <Text style={styles.featuredSignalSub} numberOfLines={2}>
                      {featuredCard.sub}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.secondarySignalColumn}>
                {secondaryCards.map((card) => {
                  const tone = toneStyles(card.tone as StatCardTone);
                  return (
                    <View
                      key={card.key}
                      style={[styles.secondarySignalCard, { backgroundColor: tone.bg }]}
                    >
                      <Text style={styles.metricLabelCompact} numberOfLines={1}>
                        {card.label}
                      </Text>
                      <Text style={[styles.metricValueCompact, { color: tone.value }]}>
                        {card.value}
                      </Text>
                      {card.sub ? (
                        <Text style={styles.metricSubCompact} numberOfLines={1}>
                          {card.sub}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.insightCardCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{profileInsight.headline}</Text>
            <Text style={styles.insightChip}>{activeTab.toUpperCase()}</Text>
          </View>
          <Text style={styles.insightText}>{profileInsight.body}</Text>
          {activeInsight?.body ? (
            <Text style={styles.insightTextSecondary}>{activeInsight.body}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{customSection.title}</Text>
            <Text style={styles.sectionSub}>{customSection.subtitle}</Text>
          </View>

          {filteredRows.length === 0 ? (
            <Text style={styles.emptyText}>No metric data available yet.</Text>
          ) : (
            <View style={styles.metricGridDense}>
              {customSection.cards.map((card) => {
                const tone = toneStyles(card.tone);
                return (
                  <View
                    key={card.key}
                    style={[styles.metricCardDense, { backgroundColor: tone.bg }]}
                  >
                    <Text style={styles.metricLabelCompact} numberOfLines={2}>
                      {card.label}
                    </Text>
                    <Text style={[styles.metricValueCompact, { color: tone.value }]}>
                      {formatMetricValue(card.value)}
                    </Text>
                    {card.sub ? (
                      <Text style={styles.metricSubCompact} numberOfLines={2}>
                        {card.sub}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <MoonrakersIntelSection profile={moonrakersIntel} />

        <View
          style={styles.sectionCompact}
          onLayout={(event) => setRecentGamesAnchorY(event.nativeEvent.layout.y)}
        >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Games</Text>
              <Text style={styles.sectionSub}>
              {selectedOpponentId ? "Filtered by opponent" : "Full history"}
              </Text>
            </View>

          {recentGames.length === 0 ? (
            <Text style={styles.emptyText}>No recent games found for this player.</Text>
          ) : (
            <View style={styles.gameList}>
              {recentGames.map((game: any, index: number) => {
                const participants = Array.isArray(game?.players) ? game.players : [];
                const participantNames = participants
                  .map((p: any) => p?.name || "Unknown")
                  .join(" • ");

                const winnerId =
                  game?.winnerId ??
                  game?.selectedWinnerId ??
                  game?.manualWinnerId ??
                  null;

                const isWin = String(winnerId) === String(playerId);

                return (
                  <View key={String(game?.id ?? game?.gameId ?? index)} style={styles.gameRow}>
                    <View style={styles.gameLeft}>
                      <View style={styles.gameTitleRow}>
                        <View
                          style={[
                            styles.gameMiniCardBadge,
                            { borderColor: playerAccent, shadowColor: playerAccent },
                          ]}
                        >
                          <CropCardArt
                            artIndex={playerArtIndex}
                            width={24}
                            height={24}
                          />
                          <View style={styles.metricMiniCardBadgeDim} />
                          <Text style={styles.metricMiniCardBadgeText}>
                            {getInitials(selectedPlayer.name)}
                          </Text>
                        </View>

                        <Text style={styles.gameTitle}>Game {recentGames.length - index}</Text>
                      </View>

                      <Text style={styles.gameMeta} numberOfLines={1}>
                        {participantNames}
                      </Text>
                    </View>

                    <View style={styles.gameRight}>
                      <Text
                        style={[
                          styles.gameResult,
                          isWin ? styles.gameResultWin : styles.gameResultLoss,
                        ]}
                      >
                        {isWin ? "WIN" : "LOSS"}
                      </Text>
                      <Text style={styles.gameMeta}>
                        {game?.id || game?.gameId || "Tracked"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: uiPolish.spacing.sm,
    paddingBottom: uiPolish.spacing.xxl,
  },
  stickyProfileTabShell: {
    backgroundColor: "rgba(8,17,32,0.94)",
    borderRadius: 18,
    marginBottom: 8,
    paddingBottom: 6,
  },
  profileSummaryCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 8,
  },
  profileSummaryCard: {
    flex: 1,
    minWidth: 96,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  profileSummaryLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  profileSummaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  cropWindow: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    backgroundColor: "#111827",
  },

  profileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  profileCardBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  profileCardBadgeDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  profileCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    zIndex: 2,
  },

  profileTitleGlow: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  centerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  centerSub: {
    color: COLORS.sub,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
  },

  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  kicker: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  playerSearchInput: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  contextSearchInput: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  profileSearchRail: {
    gap: 8,
    paddingTop: 8,
    paddingRight: 8,
    alignItems: "center",
  },
  headerBadge: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.34)",
  },
  headerBadgeText: {
    color: "#E8F1FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  metricGridTop: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  metricCardTop: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 76,
    justifyContent: "center",
  },
  metricCardTopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metricMiniCardBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  metricMiniCardBadgeDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  metricMiniCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    zIndex: 2,
  },
  metricLabel: {
    color: COLORS.sub,
    fontSize: 10,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  metricSub: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
  },

  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  insightCardCompact: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },

  tabGrid: {
    gap: 8,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickActionCard: {
    minWidth: "31%",
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  quickActionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  quickActionLabel: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  tabGridRowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  tabGridRowThree: {
    flexDirection: "row",
    gap: 10,
  },
  underlineMainTab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  underlineMainTabTwoCol: {
    flex: 1,
  },
  underlineMainTabThreeCol: {
    flex: 1,
  },
  underlineMainTabText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "800",
  },
  underlineMainTabTextActive: {
    color: COLORS.accent,
  },
  underlineMainTabLine: {
    marginTop: 5,
    height: 3,
    width: "100%",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
  },

  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
    alignItems: "flex-end",
  },
  underlineTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },

  featuredSignalsWrap: {
    flexDirection: "row",
    gap: 4,
  },
  featuredSignalCard: {
    width: "52%",
    minHeight: 150,
    borderRadius: 14,
    padding: 10,
    justifyContent: "space-between",
  },
  featuredSignalLabel: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 14,
    marginBottom: 6,
  },
  featuredSignalValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 6,
  },
  featuredSignalSub: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  secondarySignalColumn: {
    width: "46%",
    justifyContent: "space-between",
    gap: 4,
  },
  secondarySignalCard: {
    borderRadius: 12,
    padding: 10,
    minHeight: 72,
  },

  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metricCardDense: {
    width: "32%",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 72,
    justifyContent: "center",
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  metricSubCompact: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
  },

  insightChip: {
    color: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: "800",
  },
  insightText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },
  insightTextSecondary: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },

  gameList: {
    gap: 4,
  },
  gameRow: {
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameLeft: {
    flex: 1,
    paddingRight: 10,
  },
  gameRight: {
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  gameTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  gameMiniCardBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.34,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  gameTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 1,
  },
  gameMeta: {
    color: COLORS.sub,
    fontSize: 10,
  },
  gameResult: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2,
  },
  gameResultWin: {
    color: COLORS.green,
  },
  gameResultLoss: {
    color: COLORS.blue,
  },

  bottomSpacer: {
    height: 8,
  },
});
