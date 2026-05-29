import type {
  EloInsightPayload,
  EloMetricCard,
  EloSectionPayload,
  EloSummary,
} from "@/lib/cloud/analytics/types";
import {
  describeRecentForm,
  replaceRecentFormSummaryInText,
} from "@/utils/eloRecentForm";
import { formatPercentFromDecimal, formatSigned } from "@/utils/formatters";

export type EloMetricTabName =
  | "Leaderboard"
  | "Momentum"
  | "Skills"
  | "Context"
  | "Projection";

function safeName(summary: EloSummary) {
  const name = String(summary.name ?? "").trim();
  return name || "This player";
}

function safeGames(summary: EloSummary) {
  return Number.isFinite(summary.gamesPlayed) ? Math.max(0, Math.round(summary.gamesPlayed)) : 0;
}

function safeWins(summary: EloSummary) {
  return Number.isFinite(summary.wins) ? Math.max(0, Math.round(summary.wins)) : 0;
}

function safeLosses(summary: EloSummary) {
  return Number.isFinite(summary.losses) ? Math.max(0, Math.round(summary.losses)) : 0;
}

function safeCurrentElo(summary: EloSummary) {
  return Number.isFinite(summary.currentElo) ? Math.round(summary.currentElo) : 1000;
}

function safePeakElo(summary: EloSummary) {
  return Number.isFinite(summary.peakElo) ? Math.round(summary.peakElo) : safeCurrentElo(summary);
}

function safeConfidence(summary: EloSummary) {
  return Number.isFinite(summary.confidence) ? Math.max(0, summary.confidence) : 0;
}

function safeWinRate(summary: EloSummary) {
  const games = safeGames(summary);
  return games > 0 ? safeWins(summary) / games : 0;
}

function safeRecentForm(summary: EloSummary) {
  return describeRecentForm(summary.recentForm);
}

function buildCard(
  key: string,
  label: string,
  value: string,
  tone: EloMetricCard["tone"] = "default",
): EloMetricCard {
  return { key, label, value, tone };
}

function fallbackSectionTitle(tab: EloMetricTabName) {
  switch (tab) {
    case "Leaderboard":
      return "Leaderboard Metrics";
    case "Momentum":
      return "Momentum Snapshot";
    case "Skills":
      return "Rating Profile";
    case "Context":
      return "Context Split";
    case "Projection":
      return "Projection Window";
  }
}

function fallbackInsightTitle(tab: EloMetricTabName) {
  switch (tab) {
    case "Leaderboard":
      return "Leaderboard Insight";
    case "Momentum":
      return "Momentum Insight";
    case "Skills":
      return "Rating Insight";
    case "Context":
      return "Context Insight";
    case "Projection":
      return "Projection Insight";
  }
}

export function buildFallbackEloSection(
  tab: EloMetricTabName,
  summary: EloSummary,
  opponentName: string | null,
): EloSectionPayload {
  const games = safeGames(summary);
  const wins = safeWins(summary);
  const losses = safeLosses(summary);
  const currentElo = safeCurrentElo(summary);
  const peakElo = safePeakElo(summary);
  const confidence = formatPercentFromDecimal(safeConfidence(summary));
  const winRate = formatPercentFromDecimal(safeWinRate(summary));
  const avgDelta = formatSigned(summary.avgDelta, 1);
  const bestDelta = formatSigned(summary.bestDelta, 0);
  const worstDelta = formatSigned(summary.worstDelta, 0);

  switch (tab) {
    case "Leaderboard":
      return {
        title: fallbackSectionTitle(tab),
        cards: [
          buildCard("leader-current", "Current ELO", String(currentElo), "accent"),
          buildCard("leader-peak", "Peak ELO", String(peakElo), "blue"),
          buildCard("leader-games", "Rated Games", String(games)),
          buildCard("leader-record", "Record", `${wins}-${losses}`, wins >= losses ? "green" : "danger"),
          buildCard("leader-winrate", "Win Rate", winRate, wins >= losses ? "green" : "danger"),
          buildCard("leader-confidence", "Confidence", confidence, "blue"),
        ],
      };
    case "Momentum":
      return {
        title: fallbackSectionTitle(tab),
        cards: [
          buildCard("recent-form", "Recent Form", safeRecentForm(summary), "accent"),
          buildCard("avg-delta", "Avg ELO Change", avgDelta, summary.avgDelta >= 0 ? "green" : "danger"),
          buildCard("wins", "Wins", String(wins), "green"),
          buildCard("losses", "Losses", String(losses), "danger"),
          buildCard("winrate", "Win Rate", winRate, wins >= losses ? "green" : "danger"),
          buildCard("confidence", "Confidence", confidence, "blue"),
        ],
      };
    case "Skills":
      return {
        title: fallbackSectionTitle(tab),
        cards: [
          buildCard("current", "Current ELO", String(currentElo), "accent"),
          buildCard("peak", "Peak ELO", String(peakElo), "blue"),
          buildCard("avg-delta", "Avg ELO Change", avgDelta, summary.avgDelta >= 0 ? "accent" : "danger"),
          buildCard("best-delta", "Best Single Game", bestDelta, "green"),
          buildCard("worst-delta", "Worst Single Game", worstDelta, "danger"),
          buildCard("record", "Record", `${wins}-${losses}`, wins >= losses ? "green" : "danger"),
          buildCard("confidence", "Confidence", confidence, "blue"),
        ],
      };
    case "Context":
      return {
        title: fallbackSectionTitle(tab),
        cards: [
          buildCard(
            "sample",
            opponentName ? `Games vs ${opponentName}` : "Filtered Games",
            String(games),
            "accent",
          ),
          buildCard("context-winrate", "H2H Win Rate", winRate, wins >= losses ? "green" : "danger"),
          buildCard("context-wins", "Filter Wins", String(wins), "green"),
          buildCard("context-losses", "Filter Losses", String(losses), "danger"),
          buildCard("context-current", "Current ELO", String(currentElo), "blue"),
          buildCard("context-confidence", "Confidence", confidence),
        ],
      };
    case "Projection":
      return {
        title: fallbackSectionTitle(tab),
        cards: [
          buildCard("current-proj", "Current ELO", String(currentElo), "accent"),
          buildCard("avg-delta", "Avg ELO Change", avgDelta, summary.avgDelta >= 0 ? "accent" : "danger"),
          buildCard("best-delta", "Best Single Game", bestDelta, "green"),
          buildCard("worst-delta", "Worst Single Game", worstDelta, "danger"),
          buildCard("peak-proj", "Peak ELO", String(peakElo), "blue"),
          buildCard("confidence-proj", "Confidence", confidence, "blue"),
        ],
      };
  }
}

export function buildFallbackEloInsight(
  tab: EloMetricTabName,
  summary: EloSummary,
  opponentName: string | null,
): EloInsightPayload {
  const name = safeName(summary);
  const games = safeGames(summary);
  const wins = safeWins(summary);
  const currentElo = safeCurrentElo(summary);
  const peakElo = safePeakElo(summary);
  const avgDelta = formatSigned(summary.avgDelta, 1);
  const bestDelta = formatSigned(summary.bestDelta, 0);
  const worstDelta = formatSigned(summary.worstDelta, 0);

  switch (tab) {
    case "Leaderboard":
      return {
        title: fallbackInsightTitle(tab),
        body:
          games === 0
            ? "No rated games yet. Finish a saved game to start ELO tracking."
            : `${name} sits at ELO ${currentElo} (peak: ${peakElo}).`,
      };
    case "Momentum":
      {
        const body =
          games === 0
            ? "No rated games yet. Finish a saved game to start real ELO tracking."
            : `${name} recent form: ${safeRecentForm(summary)}. Avg ELO change: ${avgDelta} per game.`;
      return {
        title: fallbackInsightTitle(tab),
        body: replaceRecentFormSummaryInText(body, summary.recentForm),
      };
      }
    case "Skills":
      return {
        title: fallbackInsightTitle(tab),
        body:
          games === 0
            ? "No rated games yet."
            : peakElo > currentElo
              ? `${name} peaked at ${peakElo}. Currently ${peakElo - currentElo} below career peak. Average change is ${avgDelta} per rated game.`
              : `${name} peaked at ${peakElo}. Currently at career peak. Average change is ${avgDelta} per rated game.`,
      };
    case "Context":
      return {
        title: fallbackInsightTitle(tab),
        body:
          opponentName && games > 0
            ? `${name} has ${wins} win${wins === 1 ? "" : "s"} in ${games} game${games === 1 ? "" : "s"} against ${opponentName}.`
            : "Select an opponent to isolate head-to-head results.",
      };
    case "Projection":
      return {
        title: fallbackInsightTitle(tab),
        body:
          games === 0
            ? "Projection requires at least one rated game."
            : `${name} is at ELO ${currentElo}. Average change is ${avgDelta} per rated game, with a best swing of ${bestDelta} and worst swing of ${worstDelta}.`,
      };
  }
}

export function resolveEloSectionPayload(params: {
  tab: EloMetricTabName;
  summary: EloSummary;
  opponentName: string | null;
  sections: Record<string, unknown> | null | undefined;
}): EloSectionPayload {
  const section =
    params.sections && typeof params.sections === "object"
      ? (params.sections as Record<string, any>)[params.tab]
      : null;
  const cards = Array.isArray(section?.cards)
    ? section.cards
        .map((card: any) => ({
          key: String(card?.key ?? ""),
          label: String(card?.label ?? ""),
          value:
            String(card?.key ?? "") === "recent-form"
              ? describeRecentForm(String(card?.value ?? ""))
              : String(card?.value ?? "0"),
          sub:
            typeof card?.sub === "string" && card.sub.trim()
              ? card.sub.trim()
              : undefined,
          tone:
            card?.tone === "accent" ||
            card?.tone === "blue" ||
            card?.tone === "green" ||
            card?.tone === "danger"
              ? card.tone
              : "default",
        }))
        .filter((card: EloMetricCard) => Boolean(card.key && card.label))
    : [];

  if (cards.length > 0) {
    return {
      title:
        typeof section?.title === "string" && section.title.trim()
          ? section.title.trim()
          : fallbackSectionTitle(params.tab),
      cards,
    };
  }

  return buildFallbackEloSection(params.tab, params.summary, params.opponentName);
}

export function resolveEloInsightPayload(params: {
  tab: EloMetricTabName;
  summary: EloSummary;
  opponentName: string | null;
  insights: Record<string, unknown> | null | undefined;
}): EloInsightPayload {
  const insight =
    params.insights && typeof params.insights === "object"
      ? (params.insights as Record<string, any>)[params.tab]
      : null;
  const title =
    typeof insight?.title === "string" && insight.title.trim()
      ? insight.title.trim()
      : "";
  const body =
    typeof insight?.body === "string" && insight.body.trim()
      ? insight.body.trim()
      : "";

  if (title && body) {
    return {
      title,
      body:
        params.tab === "Momentum"
          ? replaceRecentFormSummaryInText(body, params.summary.recentForm)
          : body,
    };
  }

  return buildFallbackEloInsight(params.tab, params.summary, params.opponentName);
}
