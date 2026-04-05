// gameSlice.ts
export type PlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type RoundRecord = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  createdAt: number;
};

export type GamePlayerRecord = {
  id: string;
  name?: string;
  color?: string;
  startOrder?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type GameRecord = {
  id: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, PlayerTotals>;
  players?: GamePlayerRecord[];
  rounds?: RoundRecord[];
  roundCount?: number;
  groupId?: string | null;
  groupName?: string | null;
  createdAt?: number;
};

export interface GameSlice {
  games: GameRecord[];
  activeGame: GameRecord | null;

  setGames: (games: GameRecord[]) => void;
  mergeImportedGames: (games: GameRecord[]) => void;

  addGame: (game: GameRecord) => void;
  updateGame: (id: string, updates: Partial<GameRecord>) => void;
  deleteGame: (id: string) => void;
  clearGames: () => void;

  setActiveGame: (game: GameRecord | null) => void;
  clearActiveGame: () => void;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeAssistSource(
  raw: unknown
): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === 'number' && Number.isFinite(v) ? v : 0,
    ])
  );
}

function normalizeTotals(
  totals: unknown
): Record<string, PlayerTotals> | undefined {
  if (!totals || typeof totals !== 'object' || Array.isArray(totals)) {
    return undefined;
  }

  const normalized: Record<string, PlayerTotals> = {};

  for (const [playerId, value] of Object.entries(totals as Record<string, unknown>)) {
    if (!playerId || typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }

    const source = value as Record<string, unknown>;
    const directPrestige = safeNumber(source.directPrestige) ?? 0;
    const assistPrestigeReceived = safeNumber(source.assistPrestigeReceived) ?? 0;

    const totalPrestige =
      safeNumber(source.totalPrestige) ??
      safeNumber(source.prestige) ??
      directPrestige + assistPrestigeReceived;

    normalized[playerId] = {
      prestige: totalPrestige,
      totalPrestige,
      directPrestige,
      assistPrestigeReceived,
      assistPrestigeBySource: normalizeAssistSource(source.assistPrestigeBySource) ?? {},
      score: safeNumber(source.score),
      assists: safeNumber(source.assists),
      failures: safeNumber(source.failures),
      contracts: safeNumber(source.contracts),
      performance: safeNumber(source.performance),
      efficiency: safeNumber(source.efficiency),
      assistedEfficiency: safeNumber(source.assistedEfficiency),
    };
  }

  return normalized;
}

function normalizeRounds(rounds: unknown): RoundRecord[] {
  if (!Array.isArray(rounds)) return [];

  return rounds
    .filter(
      (round): round is Record<string, unknown> =>
        !!round && typeof round === 'object' && !Array.isArray(round)
    )
    .map((round) => ({
      id: safeString(round.id) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId: safeString(round.playerId) ?? '',
      prestige: safeNumber(round.prestige) ?? 0,
      contracts: safeNumber(round.contracts) ?? 0,
      failures: safeNumber(round.failures) ?? 0,
      assistRecipients:
        round.assistRecipients && typeof round.assistRecipients === 'object'
          ? Object.fromEntries(
              Object.entries(round.assistRecipients as Record<string, unknown>).map(
                ([k, v]) => [k, safeNumber(v) ?? 0]
              )
            )
          : {},
      assistPrestigeRecipients:
        round.assistPrestigeRecipients &&
        typeof round.assistPrestigeRecipients === 'object'
          ? Object.fromEntries(
              Object.entries(
                round.assistPrestigeRecipients as Record<string, unknown>
              ).map(([k, v]) => [k, safeNumber(v) ?? 0])
            )
          : {},
      createdAt: safeNumber(round.createdAt) ?? Date.now(),
    }))
    .filter((round) => !!round.playerId);
}

function normalizePlayers(players: unknown): GamePlayerRecord[] {
  if (!Array.isArray(players)) return [];

  return players
    .filter(
      (player): player is Record<string, unknown> =>
        !!player && typeof player === 'object' && !Array.isArray(player)
    )
    .map((player) => {
      const directPrestige = safeNumber(player.directPrestige) ?? 0;
      const assistPrestigeReceived = safeNumber(player.assistPrestigeReceived) ?? 0;
      const totalPrestige =
        safeNumber(player.totalPrestige) ??
        safeNumber(player.prestige) ??
        directPrestige + assistPrestigeReceived;

      return {
        id: safeString(player.id) ?? '',
        name: safeString(player.name),
        color: safeString(player.color),
        startOrder: safeNumber(player.startOrder),
        prestige: totalPrestige,
        totalPrestige,
        directPrestige,
        assistPrestigeReceived,
        assistPrestigeBySource: normalizeAssistSource(player.assistPrestigeBySource) ?? {},
        score: safeNumber(player.score),
        assists: safeNumber(player.assists),
        failures: safeNumber(player.failures),
        contracts: safeNumber(player.contracts),
        performance: safeNumber(player.performance),
        efficiency: safeNumber(player.efficiency),
        assistedEfficiency: safeNumber(player.assistedEfficiency),
      };
    })
    .filter((player) => !!player.id);
}

function normalizeGame(game: GameRecord): GameRecord {
  const players = normalizePlayers(game.players);
  const validIds = new Set(players.map((p) => p.id));

  const totals = normalizeTotals(game.totals);
  const filteredTotals = totals
    ? (Object.fromEntries(
        Object.entries(totals).filter(([playerId]) => validIds.has(playerId))
      ) as Record<string, PlayerTotals>)
    : undefined;

  const rounds = normalizeRounds(game.rounds);

  return {
    id: safeString(game.id) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    winnerId:
      typeof game.winnerId === 'string' && validIds.has(game.winnerId)
        ? game.winnerId
        : undefined,
    selectedWinnerId:
      typeof game.selectedWinnerId === 'string' && validIds.has(game.selectedWinnerId)
        ? game.selectedWinnerId
        : undefined,
    manualWinnerId:
      typeof game.manualWinnerId === 'string' && validIds.has(game.manualWinnerId)
        ? game.manualWinnerId
        : undefined,
    totals: filteredTotals,
    players,
    rounds,
    roundCount: safeNumber(game.roundCount) ?? rounds.length,
    groupId: game.groupId === null ? null : safeString(game.groupId),
    groupName: game.groupName === null ? null : safeString(game.groupName),
    createdAt: safeNumber(game.createdAt) ?? Date.now(),
  };
}

function dedupeGamesById(games: GameRecord[]): GameRecord[] {
  const map = new Map<string, GameRecord>();

  for (const rawGame of games) {
    const game = normalizeGame(rawGame);
    map.set(game.id, game);
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
}

export const createGameSlice = (set: any): GameSlice => ({
  games: [],
  activeGame: null,

  setGames: (games) =>
    set(() => ({
      games: dedupeGamesById(Array.isArray(games) ? games : []),
    })),

  mergeImportedGames: (games) =>
    set((state: any) => {
      const currentGames = Array.isArray(state.games) ? state.games : [];
      const importedGames = Array.isArray(games) ? games : [];

      return {
        games: dedupeGamesById([...currentGames, ...importedGames]),
      };
    }),

  addGame: (game) =>
    set((state: any) => {
      const currentGames = Array.isArray(state.games) ? state.games : [];
      const normalized = normalizeGame(game);

      return {
        games: dedupeGamesById([normalized, ...currentGames]),
      };
    }),

  updateGame: (id, updates) =>
    set((state: any) => {
      const currentGames = Array.isArray(state.games) ? state.games : [];

      return {
        games: currentGames.map((game: GameRecord) =>
          game.id === id
            ? normalizeGame({
                ...game,
                ...updates,
                id: game.id,
              })
            : game
        ),
        activeGame:
          state.activeGame?.id === id
            ? normalizeGame({
                ...state.activeGame,
                ...updates,
                id,
              })
            : state.activeGame ?? null,
      };
    }),

  deleteGame: (id) =>
    set((state: any) => {
      const currentGames = Array.isArray(state.games) ? state.games : [];

      return {
        games: currentGames.filter((game: GameRecord) => game.id !== id),
        activeGame: state.activeGame?.id === id ? null : state.activeGame ?? null,
      };
    }),

  clearGames: () =>
    set(() => ({
      games: [],
      activeGame: null,
    })),

  setActiveGame: (game) =>
    set(() => ({
      activeGame: game ? normalizeGame(game) : null,
    })),

  clearActiveGame: () =>
    set(() => ({
      activeGame: null,
    })),
});
