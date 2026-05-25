import { toNumber } from "@/utils/numbers";
import { formatMetricValue, formatSigned, formatPercentFromDecimal } from "@/utils/formatters";
import { computeMetric, type EloMetricTab } from "@/utils/elo/metricRegistry";

export type ProfileGameRow = {
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

export type StatCardTone = "default" | "accent" | "blue" | "green" | "red";

export type CustomCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: StatCardTone;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, value) => s + value, 0) / values.length;
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

export function buildAllRowsForPlayer(games: any[], playerId: string): ProfileGameRow[] {
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

  return { currentWin, bestWin, currentLoss, worstLoss };
}

function getLastN<T>(items: T[], count: number): T[] {
  return items.slice(Math.max(0, items.length - count));
}

export function buildProfileInsights(
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
      "Recent form is materially above the player's long-run win rate, and short-run ELO change is trending positive.";
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

export function buildCustomTabCards(
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
