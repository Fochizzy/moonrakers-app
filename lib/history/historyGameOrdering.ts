export type HistoryGameLike = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  roundCount?: number;
  rounds?: unknown[];
  timeline?: unknown[];
};

export type HistoryPlayerLike = {
  id?: string;
  name?: string;
};

export type HistorySort = "newest" | "oldest" | "winner" | "rounds";

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function getWinnerId(game?: HistoryGameLike | null) {
  return normalizeId(
    game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId,
  );
}

function getTimestamp(game?: HistoryGameLike | null) {
  return typeof game?.createdAt === "number" && Number.isFinite(game.createdAt)
    ? game.createdAt
    : 0;
}

function getRoundsCount(game?: HistoryGameLike | null) {
  if (typeof game?.roundCount === "number" && Number.isFinite(game.roundCount)) {
    return game.roundCount;
  }

  if (Array.isArray(game?.rounds) && game.rounds.length > 0) {
    return game.rounds.length;
  }

  if (Array.isArray(game?.timeline) && game.timeline.length > 0) {
    return game.timeline.length;
  }

  return 0;
}

function getWinnerName(game: HistoryGameLike, players: HistoryPlayerLike[]) {
  const winnerId = getWinnerId(game);
  return (
    players.find((player) => normalizeId(player?.id) === winnerId)?.name?.toLowerCase() ??
    ""
  );
}

export function sortHistoryGames<T extends HistoryGameLike>(
  games: T[],
  options?: {
    sort?: HistorySort;
    players?: HistoryPlayerLike[];
  },
) {
  const sort = options?.sort ?? "newest";
  const players = Array.isArray(options?.players) ? options.players : [];

  return [...games].sort((left, right) => {
    const leftTime = getTimestamp(left);
    const rightTime = getTimestamp(right);
    const leftId = normalizeId(left?.id);
    const rightId = normalizeId(right?.id);

    switch (sort) {
      case "oldest":
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return leftId.localeCompare(rightId);
      case "winner": {
        const leftWinner = getWinnerName(left, players);
        const rightWinner = getWinnerName(right, players);
        if (leftWinner !== rightWinner) {
          return leftWinner.localeCompare(rightWinner);
        }
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return rightId.localeCompare(leftId);
      }
      case "rounds": {
        const leftRounds = getRoundsCount(left);
        const rightRounds = getRoundsCount(right);
        if (rightRounds !== leftRounds) {
          return rightRounds - leftRounds;
        }
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return rightId.localeCompare(leftId);
      }
      case "newest":
      default:
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return rightId.localeCompare(leftId);
    }
  });
}

export function buildHistoryOrdinalMap<T extends HistoryGameLike>(
  games: T[],
  players?: HistoryPlayerLike[],
) {
  const sorted = sortHistoryGames(games, {
    sort: "newest",
    players,
  });
  const ordinals = new Map<string, number>();

  sorted.forEach((game, index) => {
    const gameId = normalizeId(game?.id);
    if (!gameId) return;
    ordinals.set(gameId, sorted.length - index);
  });

  return ordinals;
}
