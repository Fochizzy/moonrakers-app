import type { ArchiveGame } from "@/lib/data/gameArchiveTypes";

export type HistorySort = "newest" | "oldest" | "winner" | "rounds";
export type HistoryFilter = "all" | "group" | "mine";

export type HistoryRowPlayer = {
  color: string | null;
  id: string;
  isWinner: boolean;
  name: string;
  totalPrestige: number;
};

export type HistoryRow = {
  createdAt: number;
  groupName: string | null;
  id: string;
  includesSignedInPlayer: boolean;
  /** Winner's prestige minus the runner-up's; null when no winner was saved. */
  margin: number | null;
  ordinal: number;
  players: HistoryRowPlayer[];
  roundCount: number;
  winnerName: string | null;
  winnerPrestige: number;
};

function gameIncludesPlayer(game: ArchiveGame, playerId: string) {
  const normalized = playerId.trim();
  if (!normalized) {
    return false;
  }

  return (
    game.players.some((player) => player.id === normalized) ||
    Object.keys(game.totals).includes(normalized) ||
    game.rounds.some((round) => round.playerId === normalized)
  );
}

/**
 * Build the archive rows the History view renders. Ordinals are assigned
 * newest-last so "Game 1" stays the oldest tracked game no matter how the list
 * is later sorted or filtered, matching the app's archive numbering.
 */
export function buildHistoryRows(
  games: ArchiveGame[],
  signedInPlayerId: string,
): HistoryRow[] {
  const oldestFirst = [...games].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }

    return left.id.localeCompare(right.id);
  });

  return oldestFirst.map((game, index) => {
    // Snapshot order is seat order, but nothing on the row says so, which just
    // reads as arbitrary. Name order is the one a reader can follow.
    const players = game.players
      .map((player) => ({
        color: player.color,
        id: player.id,
        isWinner: Boolean(game.winnerId && player.id === game.winnerId),
        name: player.name,
        totalPrestige: game.totals[player.id]?.totalPrestige ?? 0,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const winner = players.find((player) => player.isWinner) ?? null;
    const runnerUpPrestige = players
      .filter((player) => !player.isWinner)
      .reduce(
        (best, player) => Math.max(best, player.totalPrestige),
        Number.NEGATIVE_INFINITY,
      );

    return {
      createdAt: game.createdAt,
      groupName: game.groupName,
      id: game.id,
      includesSignedInPlayer: gameIncludesPlayer(game, signedInPlayerId),
      margin:
        winner && Number.isFinite(runnerUpPrestige)
          ? winner.totalPrestige - runnerUpPrestige
          : null,
      ordinal: index + 1,
      players,
      roundCount: game.roundCount,
      winnerName: winner?.name ?? null,
      winnerPrestige: winner?.totalPrestige ?? 0,
    };
  });
}

export function listHistoryGroupNames(rows: HistoryRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => String(row.groupName ?? "").trim())
        .filter((name) => name.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function sortHistoryRows(rows: HistoryRow[], sort: HistorySort) {
  return [...rows].sort((left, right) => {
    switch (sort) {
      case "oldest":
        if (left.createdAt !== right.createdAt) {
          return left.createdAt - right.createdAt;
        }
        return left.id.localeCompare(right.id);
      case "winner": {
        const leftWinner = (left.winnerName ?? "").toLowerCase();
        const rightWinner = (right.winnerName ?? "").toLowerCase();
        if (leftWinner !== rightWinner) {
          return leftWinner.localeCompare(rightWinner);
        }
        if (right.createdAt !== left.createdAt) {
          return right.createdAt - left.createdAt;
        }
        return right.id.localeCompare(left.id);
      }
      case "rounds":
        if (right.roundCount !== left.roundCount) {
          return right.roundCount - left.roundCount;
        }
        if (right.createdAt !== left.createdAt) {
          return right.createdAt - left.createdAt;
        }
        return right.id.localeCompare(left.id);
      case "newest":
      default:
        if (right.createdAt !== left.createdAt) {
          return right.createdAt - left.createdAt;
        }
        return right.id.localeCompare(left.id);
    }
  });
}

export function filterHistoryRows(input: {
  dateLabelFor: (row: HistoryRow) => string;
  filter: HistoryFilter;
  groupName: string;
  query: string;
  rows: HistoryRow[];
}) {
  const query = input.query.trim().toLowerCase();

  return input.rows.filter((row) => {
    const rowGroupName = String(row.groupName ?? "").trim();

    if (input.filter === "group" && !rowGroupName) {
      return false;
    }

    if (
      input.filter === "group" &&
      input.groupName !== "all" &&
      rowGroupName !== input.groupName
    ) {
      return false;
    }

    if (input.filter === "mine" && !row.includesSignedInPlayer) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      row.winnerName ?? "",
      rowGroupName,
      input.dateLabelFor(row),
      `game ${row.ordinal}`,
      ...row.players.map((player) => player.name),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}
