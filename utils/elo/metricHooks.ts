import { useMemo } from "react";
import { getVisibleEloMetricTabs } from "./visibleMetricTabs";
import type { EloGameRecord } from "./eloTransforms";
import {
  computeMetric,
  getMetricsForTab,
  getTop3WinningSignalsEngineV2,
  metricRegistry,
  type EloMetricTab,
  type MetricContext,
  type MetricKey,
} from "./metricRegistry";

type MetricCardTone = "default" | "accent" | "blue" | "green" | "amber";

type MetricCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: MetricCardTone;
};

type MetricSection = {
  title: string;
  cards: MetricCard[];
};

type MetricInsight = {
  title: string;
  body: string;
};

type UseMetricScreenDataArgs = {
  games: any[];
  players: any[];
  playerId: string | null;
  activeTab: EloMetricTab;
  tabs: EloMetricTab[];
  context?: MetricContext;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatPercent(value: number): string {
  return `${Math.round(toNumber(value) * 100)}%`;
}

function formatDecimal(value: number): string {
  return toNumber(value).toFixed(2);
}

function formatElo(value: number): string {
  return `${Math.round(toNumber(value))}`;
}

function formatSignedNumber(value: number): string {
  const rounded = Math.round(toNumber(value));
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function formatMetricValue(format: string, value: number): string {
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "decimal":
      return formatDecimal(value);
    case "elo":
      return formatElo(value);
    case "rank":
      return `#${Math.max(1, Math.round(toNumber(value)))}`;
    case "number":
    default:
      return formatSignedNumber(value);
  }
}

function getToneForMetric(key: MetricKey): MetricCardTone {
  switch (key) {
    case "clutchScore":
    case "promotionOdds":
      return "accent";
    case "conversionScore":
    case "consistencyScore":
      return "green";
    case "tierStabilityScore":
    case "recoveryRate":
    case "contextConfidence":
      return "blue";
    case "upsetRate":
    case "vsHigherRatedWinRate":
      return "amber";
    default:
      return "default";
  }
}

function getTabInsight(
  activeTab: EloMetricTab,
  playerName: string,
  topCards: MetricCard[]
): MetricInsight {
  const lead = topCards[0];

  switch (activeTab) {
    case "Leaderboard":
      return {
        title: "Ladder Position",
        body: `${playerName} is being evaluated on current rating, peak level, and confidence built from game volume.`,
      };
    case "Momentum":
      return {
        title: "Form Read",
        body: lead
          ? `${playerName}'s recent form is led by ${lead.label.toLowerCase()}, showing where short-run performance is strongest right now.`
          : `${playerName}'s recent form will appear here once more ELO history is available.`,
      };
    case "Skills":
      return {
        title: "Skill Signal",
        body: lead
          ? `${playerName}'s strongest skill signal is ${lead.label.toLowerCase()}, and this merged view now carries the forward-looking projection outlook as well.`
          : `${playerName}'s skill profile and projection outlook will populate once enough game history is available.`,
      };
    case "Context":
      return {
        title: "Context Read",
        body: `${playerName}'s contextual edge is evaluated against selected opponents and tougher-rating environments.`,
      };
    case "Projection":
      return {
        title: "Projection Read",
        body: `${playerName}'s projection combines expected win rate, forward ELO pathing, and promotion odds toward the next tier.`,
      };
    default:
      return {
        title: "Insight",
        body: `${playerName}'s current metric profile is shown here.`,
      };
  }
}

function buildEloRows(games: any[], playerId: string | null): EloGameRecord[] {
  if (!playerId) return [];

  const rows: EloGameRecord[] = [];

  for (const game of games || []) {
    const players = Array.isArray(game?.players) ? game.players : [];
    const totals = game?.totals ?? {};

    const isInGame = players.some((p: any) => String(p?.id) === String(playerId));
    if (!isInGame) continue;

    const playerTotals = totals?.[playerId];
    if (!playerTotals) continue;

    const opponentIds = players
      .map((p: any) => String(p?.id))
      .filter((id: string) => id !== String(playerId));

    const opponentElos = opponentIds.map((id: string) =>
      toNumber(totals?.[id]?.elo ?? totals?.[id]?.rating ?? 1200)
    );

    const opponentAvgElo =
      opponentElos.length > 0
        ? opponentElos.reduce((sum: number, value: number) => sum + value, 0) / opponentElos.length
        : 1200;

    const preGameElo = toNumber(playerTotals?.elo ?? playerTotals?.rating ?? 1200);

    const winnerId =
      game?.winnerId ??
      game?.selectedWinnerId ??
      game?.manualWinnerId ??
      null;

    const win = String(winnerId) === String(playerId) ? 1 : 0;

    const eloDelta =
      typeof playerTotals?.eloDelta === "number"
        ? playerTotals.eloDelta
        : win
        ? 12
        : -12;

    rows.push({
      gameId: game?.id ?? game?.gameId ?? "",
      playerId: String(playerId),
      opponentIds,
      preGameElo,
      postGameElo: preGameElo + eloDelta,
      opponentAvgElo,
      eloDelta,
      win,
    } as EloGameRecord);
  }

  return rows;
}

function buildAllEloRows(games: any[]): EloGameRecord[] {
  const rows: EloGameRecord[] = [];

  for (const game of games || []) {
    const players = Array.isArray(game?.players) ? game.players : [];
    const totals = game?.totals ?? {};

    for (const player of players) {
      const playerId = String(player?.id ?? "");
      if (!playerId) continue;

      const playerTotals = totals?.[playerId];
      if (!playerTotals) continue;

      const opponentIds = players
        .map((p: any) => String(p?.id))
        .filter((id: string) => id !== playerId);

      const opponentElos = opponentIds.map((id: string) =>
        toNumber(totals?.[id]?.elo ?? totals?.[id]?.rating ?? 1200)
      );

      const opponentAvgElo =
        opponentElos.length > 0
          ? opponentElos.reduce((sum: number, value: number) => sum + value, 0) / opponentElos.length
          : 1200;

      const preGameElo = toNumber(playerTotals?.elo ?? playerTotals?.rating ?? 1200);

      const winnerId =
        game?.winnerId ??
        game?.selectedWinnerId ??
        game?.manualWinnerId ??
        null;

      const win = String(winnerId) === playerId ? 1 : 0;

      const eloDelta =
        typeof playerTotals?.eloDelta === "number"
          ? playerTotals.eloDelta
          : win
          ? 12
          : -12;

      rows.push({
        gameId: game?.id ?? game?.gameId ?? "",
        playerId,
        opponentIds,
        preGameElo,
        postGameElo: preGameElo + eloDelta,
        opponentAvgElo,
        eloDelta,
        win,
      } as EloGameRecord);
    }
  }

  return rows;
}

export function getAvailableMetricTabs(): EloMetricTab[] {
  return getVisibleEloMetricTabs();
}

export function getDefaultMetricTab(): EloMetricTab {
  return "Leaderboard";
}

export function useMetricScreenData({
  games,
  players,
  playerId,
  activeTab,
  context,
}: UseMetricScreenDataArgs) {
  const rows = useMemo(() => buildEloRows(games, playerId), [games, playerId]);
  const allRows = useMemo(() => buildAllEloRows(games), [games]);

  const selectedPlayer = useMemo(
    () => (players || []).find((p: any) => String(p?.id) === String(playerId)) ?? null,
    [players, playerId]
  );

  const topCards = useMemo(() => {
    const ranked = getTop3WinningSignalsEngineV2(rows, allRows, context);

    return ranked.map((item) => ({
      key: item.key,
      label: item.label,
      value: formatMetricValue(metricRegistry[item.key].format, item.value),
      sub: item.reason,
      tone: getToneForMetric(item.key),
    }));
  }, [rows, allRows, context]);

  const activeSection = useMemo<MetricSection>(() => {
    const defs = getMetricsForTab(activeTab);

    return {
      title: activeTab,
      cards: defs.map((def) => {
        const value = computeMetric(def.key, rows, allRows, context);
        return {
          key: def.key,
          label: def.label,
          value: formatMetricValue(def.format, value),
          sub: def.description,
          tone: getToneForMetric(def.key),
        };
      }),
    };
  }, [activeTab, rows, allRows, context]);

  const activeInsight = useMemo<MetricInsight>(() => {
    const playerName = selectedPlayer?.name || "This player";
    return getTabInsight(activeTab, playerName, topCards);
  }, [activeTab, selectedPlayer, topCards]);

  return {
    topCards,
    activeSection,
    activeInsight,
    hasData: rows.length > 0,
  };
}
