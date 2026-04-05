////////////////////////////////////////////////////////////////////////////////
// 📊 TYPES
////////////////////////////////////////////////////////////////////////////////
export type Game = {
  id: string;
  players: { id: string; name: string }[];
  rounds: any[];
  totals: Record<
    string,
    {
      score: number;
      prestige: number;
    }
  >;
  winnerId: string;
  createdAt: number;
};

export type GameFilters = {
  playerIds?: string[];        // must include ALL
  anyPlayerIds?: string[];     // include ANY
  excludePlayerIds?: string[]; // exclude ANY

  exactGroup?: boolean;        // match exact set

  playerCount?: number;        // exact #
  minPlayers?: number;
  maxPlayers?: number;

  startDate?: number;
  endDate?: number;

  winnerId?: string;
};

////////////////////////////////////////////////////////////////////////////////
// 🧠 HELPERS
////////////////////////////////////////////////////////////////////////////////
function hasAllPlayers(game: Game, ids: string[]) {
  const gameIds = game.players.map((p) => p.id);
  return ids.every((id) => gameIds.includes(id));
}

function hasAnyPlayer(game: Game, ids: string[]) {
  const gameIds = game.players.map((p) => p.id);
  return ids.some((id) => gameIds.includes(id));
}

function excludesPlayers(game: Game, ids: string[]) {
  const gameIds = game.players.map((p) => p.id);
  return ids.every((id) => !gameIds.includes(id));
}

function matchesExactGroup(game: Game, ids: string[]) {
  const gameIds = game.players.map((p) => p.id).sort();
  const target = [...ids].sort();

  if (gameIds.length !== target.length) return false;

  return gameIds.every((id, i) => id === target[i]);
}

////////////////////////////////////////////////////////////////////////////////
// 🚀 MAIN FILTER FUNCTION
////////////////////////////////////////////////////////////////////////////////
export function filterGames(
  games: Game[],
  filters: GameFilters = {}
): Game[] {
  return games.filter((game) => {
    ////////////////////////////////////////////////////////////////////////////
    // 👥 PLAYER FILTERS
    ////////////////////////////////////////////////////////////////////////////
    if (
      filters.playerIds &&
      !hasAllPlayers(game, filters.playerIds)
    ) {
      return false;
    }

    if (
      filters.anyPlayerIds &&
      !hasAnyPlayer(game, filters.anyPlayerIds)
    ) {
      return false;
    }

    if (
      filters.excludePlayerIds &&
      !excludesPlayers(game, filters.excludePlayerIds)
    ) {
      return false;
    }

    if (
      filters.exactGroup &&
      filters.playerIds &&
      !matchesExactGroup(game, filters.playerIds)
    ) {
      return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    // 🔢 PLAYER COUNT
    ////////////////////////////////////////////////////////////////////////////
    const count = game.players.length;

    if (
      filters.playerCount !== undefined &&
      count !== filters.playerCount
    ) {
      return false;
    }

    if (
      filters.minPlayers !== undefined &&
      count < filters.minPlayers
    ) {
      return false;
    }

    if (
      filters.maxPlayers !== undefined &&
      count > filters.maxPlayers
    ) {
      return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    // 📅 DATE RANGE
    ////////////////////////////////////////////////////////////////////////////
    if (
      filters.startDate &&
      game.createdAt < filters.startDate
    ) {
      return false;
    }

    if (
      filters.endDate &&
      game.createdAt > filters.endDate
    ) {
      return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    // 🏆 WINNER FILTER
    ////////////////////////////////////////////////////////////////////////////
    if (
      filters.winnerId &&
      game.winnerId !== filters.winnerId
    ) {
      return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    // ✅ PASSED ALL FILTERS
    ////////////////////////////////////////////////////////////////////////////
    return true;
  });
}
