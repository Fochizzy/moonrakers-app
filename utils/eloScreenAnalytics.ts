import {
  formatPercentFromDecimal,
  formatSigned,
} from "@/utils/formatters";
import {
  describeRecentForm,
  replaceRecentFormSummaryInText,
} from "@/utils/eloRecentForm";
import { type EloMetricTab } from "@/utils/elo/metricRegistry";
import { toNumber } from "@/utils/numbers";
import { normalizeId } from "@/utils/strings";

export type { EloMetricTab } from "@/utils/elo/metricRegistry";

export type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
};

export type SimpleEloRow = {
  gameId: string;
  createdAt: number;
  playerId: string;
  opponentIds: string[];
  win: number;
};

export type PlayerSummary = {
  playerId: string;
  name: string;
  currentElo: number;
  peakElo: number;
  confidence: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgDelta: number;
  bestDelta: number;
  worstDelta: number;
  recentForm: string;
};

export type StatCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "blue" | "green" | "danger";
};

const DEFAULT_ELO = 1000;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function getGameWinnerId(game: unknown): string | null {
  const source = asRecord(game);
  const explicit = normalizeId(
    source.winnerId ?? source.selectedWinnerId ?? source.manualWinnerId
  );
  if (explicit) return explicit;

  const totals = asRecord(source.totals);
  const players = Array.isArray(source.players) ? source.players : [];

  const ranked = players
    .map((p) => {
      const participant = asRecord(p);
      const id = normalizeId(participant.id ?? participant.playerId);
      const playerTotals = asRecord(totals[id]);
      const totalPrestige = toNumber(
        playerTotals.totalPrestige ?? playerTotals.prestige
      );
      const score = toNumber(playerTotals.score);
      return { id, totalPrestige, score };
    })
    .filter((row) => row.id)
    .sort((a, b) => {
      if (b.totalPrestige !== a.totalPrestige) {
        return b.totalPrestige - a.totalPrestige;
      }
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });

  return ranked[0]?.id ?? null;
}

function getChronologicalGames(games: unknown[]): unknown[] {
  return [...(Array.isArray(games) ? games : [])].sort((a, b) => {
    const createdDiff = toNumber(asRecord(a).createdAt) - toNumber(asRecord(b).createdAt);
    if (createdDiff !== 0) return createdDiff;
    return normalizeId(asRecord(a).id).localeCompare(normalizeId(asRecord(b).id));
  });
}

export function buildGameRowsByPlayer(
  games: unknown[],
  players: StorePlayer[]
): Record<string, SimpleEloRow[]> {
  const rowsByPlayer: Record<string, SimpleEloRow[]> = {};
  const validPlayerIds = new Set(
    players.map((player) => normalizeId(player.id)).filter(Boolean)
  );

  for (const player of players) {
    const id = normalizeId(player.id);
    rowsByPlayer[id] = [];
  }

  for (const game of getChronologicalGames(games)) {
    const source = asRecord(game);
    const participantIds: string[] = Array.from(
      new Set(
        (Array.isArray(source.players) ? source.players : [])
          .map((player) => {
            const entry = asRecord(player);
            return normalizeId(entry.id ?? entry.playerId);
          })
          .filter((id) => Boolean(id) && validPlayerIds.has(id))
      )
    );

    if (participantIds.length < 2) continue;

    const winnerId = getGameWinnerId(game);
    if (!winnerId || !participantIds.includes(winnerId)) continue;

    const gameId =
      normalizeId(source.id ?? source.gameId) ||
      `${toNumber(source.createdAt)}-${winnerId}`;

    for (const playerId of participantIds) {
      if (!rowsByPlayer[playerId]) rowsByPlayer[playerId] = [];
      rowsByPlayer[playerId].push({
        gameId,
        createdAt: toNumber(source.createdAt),
        playerId,
        opponentIds: participantIds.filter((id) => id !== playerId),
        win: playerId === winnerId ? 1 : 0,
      });
    }
  }

  return rowsByPlayer;
}

export function computeConfidence(rows: SimpleEloRow[]): number {
  if (!rows.length) return 0;
  return Math.min(1, rows.length / 12);
}

export function buildContextRows(
  rows: SimpleEloRow[],
  selectedOpponentId: string | null
): SimpleEloRow[] {
  if (!selectedOpponentId) return rows;
  return rows.filter((row) => row.opponentIds.includes(selectedOpponentId));
}

export function buildSummary(
  playerId: string,
  players: StorePlayer[],
  rowsByPlayer: Record<string, SimpleEloRow[]>,
  eloMap: Record<string, number>
): PlayerSummary {
  const rows = rowsByPlayer[playerId] ?? [];
  const name =
    players.find((player) => normalizeId(player.id) === playerId)?.name ||
    "Unknown";
  const currentEloRaw = eloMap[playerId];
  const currentElo =
    typeof currentEloRaw === "number" && Number.isFinite(currentEloRaw)
      ? currentEloRaw
      : DEFAULT_ELO;

  const wins = rows.filter((row) => row.win === 1).length;
  const losses = rows.length - wins;

  return {
    playerId,
    name,
    currentElo,
    peakElo: currentElo,
    confidence: computeConfidence(rows),
    gamesPlayed: rows.length,
    wins,
    losses,
    avgDelta: 0,
    bestDelta: 0,
    worstDelta: 0,
    recentForm: rows
      .slice(-5)
      .map((row) => (row.win ? "W" : "L"))
      .join(""),
  };
}

export function buildTopCards(
  summary: PlayerSummary,
  rows: SimpleEloRow[],
  contextRows: SimpleEloRow[]
): StatCard[] {
  const winRate = rows.length ? summary.wins / rows.length : 0;
  const contextWinRate = contextRows.length
    ? contextRows.filter((row) => row.win === 1).length / contextRows.length
    : 0;

  return [
    {
      key: "current-elo",
      label: "Current ELO",
      value: `${Math.round(summary.currentElo)}`,
      sub: `${summary.gamesPlayed} rated game${
        summary.gamesPlayed === 1 ? "" : "s"
      }`,
      tone: "accent",
    },
    {
      key: "peak-elo",
      label: "Peak ELO",
      value: `${Math.round(summary.peakElo)}`,
      sub: "Matched to leaderboard source",
      tone: "blue",
    },
    {
      key: "win-rate",
      label: "Win Rate",
      value: formatPercentFromDecimal(winRate),
      sub: contextRows.length
        ? `H2H ${formatPercentFromDecimal(contextWinRate)}`
        : "All rated games",
      tone: "green",
    },
  ];
}

export function buildSectionCards(
  activeTab: EloMetricTab,
  summary: PlayerSummary,
  rows: SimpleEloRow[],
  contextRows: SimpleEloRow[],
  opponentName: string | null
): { title: string; cards: StatCard[] } {
  const winRate = rows.length ? summary.wins / rows.length : 0;
  const contextWins = contextRows.filter((row) => row.win === 1).length;
  const contextWinRate = contextRows.length
    ? contextWins / contextRows.length
    : 0;

  switch (activeTab) {
    case "Momentum":
      return {
        title: "Momentum Snapshot",
        cards: [
          {
            key: "recent-form",
            label: "Recent Form",
            value: describeRecentForm(summary.recentForm),
            tone: "accent",
          },
          {
            key: "games",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
          {
            key: "wins",
            label: "Wins",
            value: `${summary.wins}`,
            tone: "green",
          },
          {
            key: "losses",
            label: "Losses",
            value: `${summary.losses}`,
            tone: "danger",
          },
          {
            key: "winrate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            tone: winRate >= 0.5 ? "green" : "danger",
          },
          {
            key: "confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
        ],
      };

    case "Skills":
      return {
        title: "Rating Profile",
        cards: [
          {
            key: "current",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "accent",
          },
          {
            key: "peak",
            label: "Peak ELO",
            value: `${Math.round(summary.peakElo)}`,
            tone: "blue",
          },
          {
            key: "avg-delta",
            label: "Avg ELO Change",
            value: formatSigned(summary.avgDelta, 1),
            tone: summary.avgDelta >= 0 ? "green" : "danger",
          },
          {
            key: "games",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
          {
            key: "record",
            label: "Record",
            value: `${summary.wins}-${summary.losses}`,
            tone: summary.wins >= summary.losses ? "green" : "danger",
          },
          {
            key: "confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
          {
            key: "winrate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            tone: winRate >= 0.5 ? "green" : "danger",
          },
        ],
      };

    case "Context":
      return {
        title: "Context Split",
        cards: [
          {
            key: "sample",
            label: opponentName ? `Games vs ${opponentName}` : "Filtered Games",
            value: `${contextRows.length}`,
            tone: "accent",
          },
          {
            key: "context-winrate",
            label: "Head-to-Head Win Rate",
            value: formatPercentFromDecimal(contextWinRate),
            tone: contextWinRate >= 0.5 ? "green" : "danger",
          },
          {
            key: "context-wins",
            label: "Filter Wins",
            value: `${contextWins}`,
            tone: "green",
          },
          {
            key: "context-losses",
            label: "Filter Losses",
            value: `${Math.max(0, contextRows.length - contextWins)}`,
            tone: "danger",
          },
          {
            key: "context-current",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "blue",
          },
          {
            key: "context-confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "default",
          },
        ],
      };

    case "Projection":
      return {
        title: "Projection Window",
        cards: [
          {
            key: "current-proj",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "accent",
          },
          {
            key: "next-win",
            label: "Next Win Range",
            value: `${Math.round(summary.currentElo)}`,
            tone: "green",
          },
          {
            key: "next-loss",
            label: "Next Loss Range",
            value: `${Math.round(summary.currentElo)}`,
            tone: "danger",
          },
          {
            key: "record-proj",
            label: "Record",
            value: `${summary.wins}-${summary.losses}`,
            tone: "default",
          },
          {
            key: "confidence-proj",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
          {
            key: "games-proj",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
        ],
      };

    case "Leaderboard":
    default:
      return {
        title: "Leaderboard Metrics",
        cards: [
          {
            key: "leader-current",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "accent",
          },
          {
            key: "leader-peak",
            label: "Peak ELO",
            value: `${Math.round(summary.peakElo)}`,
            tone: "blue",
          },
          {
            key: "leader-games",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
          {
            key: "leader-record",
            label: "Record",
            value: `${summary.wins}-${summary.losses}`,
            tone: summary.wins >= summary.losses ? "green" : "danger",
          },
          {
            key: "leader-winrate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            tone: winRate >= 0.5 ? "green" : "danger",
          },
          {
            key: "leader-confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
        ],
      };
  }
}

export function buildInsight(
  activeTab: EloMetricTab,
  summary: PlayerSummary,
  contextRows: SimpleEloRow[],
  opponentName: string | null
): { title: string; body: string } {
  switch (activeTab) {
    case "Momentum":
      {
        const body =
          summary.gamesPlayed === 0
            ? "No rated games yet. Finish a saved game to start real leaderboard-backed ELO tracking."
            : `${summary.name} recent form: ${describeRecentForm(summary.recentForm)}.`;
      return {
        title: "Momentum Insight",
        body: replaceRecentFormSummaryInText(body, summary.recentForm),
      };
      }

    case "Skills":
      return {
        title: "Rating Insight",
        body:
          summary.gamesPlayed === 0
            ? "This screen now uses the same ELO source as the leaderboard."
            : `${summary.name} currently sits at ${Math.round(
                summary.currentElo
              )}. The headline ELO now matches leaderboard ordering exactly, and average change is ${formatSigned(summary.avgDelta, 1)} per rated game.`,
      };

    case "Context":
      return {
        title: "Context Insight",
        body:
          opponentName && contextRows.length
            ? `${summary.name} has ${
                contextRows.filter((row) => row.win === 1).length
              } win${
                contextRows.filter((row) => row.win === 1).length === 1
                  ? ""
                  : "s"
              } in ${contextRows.length} rated game${
                contextRows.length === 1 ? "" : "s"
              } against ${opponentName}.`
            : "Select an opponent to isolate head-to-head results from saved game history.",
      };

    case "Projection":
      return {
        title: "Projection Insight",
        body:
          summary.gamesPlayed === 0
            ? "Projection is limited until saved games exist."
            : `Current displayed ELO is now aligned to the leaderboard source. Projection cards are informational and no longer use the old separate ELO engine.`,
      };

    case "Leaderboard":
    default:
      return {
        title: "Leaderboard Insight",
        body:
          summary.gamesPlayed === 0
            ? "Leaderboard and ELO now share the same current-rating source."
            : `${summary.name} is ranked using the same current ELO value as the leaderboard view.`,
      };
  }
}
