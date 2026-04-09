
import { create } from 'zustand';

export type Player = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

export type Group = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt?: number;
  objectiveStatsEligible?: boolean;
};

export type PlayerGameTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assistPrestigeBySource: Record<string, number>;
  objectivePrestige: number;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type GameTotals = Record<string, PlayerGameTotals>;

export type GamePlayer = {
  id: string;
  name?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  startOrder?: number;
};

export type StoredRound = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  objectivePrestige: number;
  createdAt: number;
};

export type ActiveGameCurrent = {
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
};

export type Game = {
  id: string;
  players: GamePlayer[];
  totals: GameTotals;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  createdAt?: number;
  groupId?: string;
  groupName?: string;
  rounds?: StoredRound[];
  timeline?: StoredRound[];
  roundCount?: number;
  objectiveStatsEligible?: boolean;
};

export type ActiveGame = {
  id: string;
  players: GamePlayer[];
  turnIndex: number;
  rounds: StoredRound[];
  totals: GameTotals;
  current: ActiveGameCurrent;
  createdAt: number;
  groupId?: string;
  groupName?: string;
  selectedWinnerId?: string;
  showTieBreaker?: boolean;
  roundCount: number;
};

function safeNumber(v: any): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function normalizeId(v: any): string {
  return String(v ?? '').trim();
}

function normalizeName(v: any): string {
  return String(v ?? '').trim();
}

function normalizeStringOrUndefined(v: any): string | undefined {
  const normalized = normalizeName(v);
  return normalized || undefined;
}

function normalizeAssistMap(input: any): Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input)
      .map(([id, value]) => [normalizeId(id), safeNumber(value)])
      .filter(([id]) => Boolean(id))
  );
}

function normalizeRound(raw: any): StoredRound | null {
  const playerId = normalizeId(raw?.playerId);
  if (!playerId) return null;

  const objectiveCount = Math.max(
    0,
    Math.floor(safeNumber(raw?.objectiveCount ?? raw?.objectivePrestige))
  );

  return {
    id: normalizeId(raw?.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    prestige: safeNumber(raw?.prestige),
    contracts: safeNumber(raw?.contracts),
    failures: safeNumber(raw?.failures),
    assistRecipients: normalizeAssistMap(raw?.assistRecipients),
    assistPrestigeRecipients: normalizeAssistMap(raw?.assistPrestigeRecipients),
    objectiveCount,
    objectivePrestige: objectiveCount,
    createdAt: safeNumber(raw?.createdAt) || Date.now(),
  };
}

function getResolvedWinner(game: any): string | undefined {
  const winnerId = normalizeId(
    game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId ?? ''
  );
  return winnerId || undefined;
}

function createEmptyCurrent(): ActiveGameCurrent {
  return {
    prestige: 0,
    contracts: 0,
    failures: 0,
    assistRecipients: {},
    assistPrestigeRecipients: {},
    objectiveCount: 0,
  };
}

function normalizeImportedGame(raw: any): Game {
  const playerMap = new Map<string, GamePlayer>();

  if (Array.isArray(raw?.players)) {
    raw.players.forEach((p: any, index: number) => {
      const id = normalizeId(p?.id ?? p?.playerId);
      if (!id) return;

      const current = playerMap.get(id);
      playerMap.set(id, {
        ...current,
        id,
        name: normalizeName(current?.name) || normalizeName(p?.name) || 'Player',
        initials:
          normalizeStringOrUndefined(current?.initials) ||
          normalizeStringOrUndefined(p?.initials),
        color:
          normalizeStringOrUndefined(current?.color) ||
          normalizeStringOrUndefined(p?.color),
        assignedCardArtIndex:
          typeof current?.assignedCardArtIndex === 'number' &&
          Number.isFinite(current.assignedCardArtIndex)
            ? current.assignedCardArtIndex
            : typeof p?.assignedCardArtIndex === 'number' &&
                Number.isFinite(p.assignedCardArtIndex)
              ? p.assignedCardArtIndex
              : null,
        startOrder:
          typeof current?.startOrder === 'number'
            ? current.startOrder
            : typeof p?.startOrder === 'number' && Number.isFinite(p.startOrder)
              ? p.startOrder
              : index,
      });
    });
  }

  const rawRounds = Array.isArray(raw?.rounds) ? raw.rounds : [];
  const rawTimeline = Array.isArray(raw?.timeline) ? raw.timeline : rawRounds;

  const rounds = rawRounds
    .map(normalizeRound)
    .filter((round): round is StoredRound => Boolean(round));

  const timeline = rawTimeline
    .map(normalizeRound)
    .filter((round): round is StoredRound => Boolean(round));

  for (const round of [...rounds, ...timeline]) {
    if (!playerMap.has(round.playerId)) {
      playerMap.set(round.playerId, {
        id: round.playerId,
        name: 'Recovered Player',
        assignedCardArtIndex: null,
      });
    }
  }

  const totals: GameTotals = {};
  const rawTotals =
    raw?.totals && typeof raw.totals === 'object' && !Array.isArray(raw.totals)
      ? raw.totals
      : {};

  Object.entries(rawTotals).forEach(([rawPlayerId, t]: any) => {
    const id = normalizeId(rawPlayerId);
    if (!id) return;

    if (!playerMap.has(id)) {
      playerMap.set(id, {
        id,
        name: 'Recovered Player',
        assignedCardArtIndex: null,
      });
    }

    const direct = safeNumber(t?.directPrestige);
    const assist = safeNumber(t?.assistPrestigeReceived);
    const objective = Math.max(
      0,
      Math.floor(safeNumber(t?.objectivePrestige ?? t?.objectiveCount))
    );
    const computedTotal = Math.max(0, direct + assist + objective);
    const total =
      typeof t?.totalPrestige === 'number' && Number.isFinite(t.totalPrestige)
        ? Math.max(0, t.totalPrestige)
        : typeof t?.prestige === 'number' && Number.isFinite(t.prestige)
          ? Math.max(0, t.prestige)
          : computedTotal;

    totals[id] = {
      prestige: total,
      totalPrestige: total,
      directPrestige: direct,
      assistPrestigeReceived: assist,
      assistPrestigeSent: safeNumber(t?.assistPrestigeSent),
      assistPrestigeBySource: normalizeAssistMap(t?.assistPrestigeBySource),
      objectivePrestige: objective,
      score: safeNumber(t?.score),
      assists: safeNumber(t?.assists),
      failures: safeNumber(t?.failures),
      contracts: safeNumber(t?.contracts),
      performance: safeNumber(t?.performance),
      efficiency: safeNumber(t?.efficiency),
      assistedEfficiency: safeNumber(t?.assistedEfficiency),
    };
  });

  const validIds = new Set(playerMap.keys());

  const sanitizeRoundList = (list: StoredRound[]) =>
    list.filter((round) => validIds.has(round.playerId));

  const sanitizedRounds = sanitizeRoundList(rounds);
  const sanitizedTimeline = sanitizeRoundList(timeline.length ? timeline : rounds);

  const sanitizeWinner = (value: any): string | undefined => {
    const id = normalizeId(value);
    return id && validIds.has(id) ? id : undefined;
  };

  return {
    id: normalizeId(raw?.id) || `${Date.now()}-${Math.random()}`,
    players: Array.from(playerMap.values()),
    totals,
    winnerId: sanitizeWinner(getResolvedWinner(raw)),
    selectedWinnerId: sanitizeWinner(raw?.selectedWinnerId),
    manualWinnerId: sanitizeWinner(raw?.manualWinnerId),
    createdAt:
      typeof raw?.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now(),
    rounds: sanitizedRounds,
    timeline: sanitizedTimeline,
    roundCount:
      typeof raw?.roundCount === 'number' && Number.isFinite(raw.roundCount)
        ? raw.roundCount
        : sanitizedRounds.length || sanitizedTimeline.length,
    groupId: normalizeStringOrUndefined(raw?.groupId),
    groupName: normalizeStringOrUndefined(raw?.groupName),
    objectiveStatsEligible:
      typeof raw?.objectiveStatsEligible === 'boolean'
        ? raw.objectiveStatsEligible
        : false,
  };
}

function patchGamePlayers(
  players: GamePlayer[] | undefined,
  playerId: string,
  updates: Partial<Player>
): GamePlayer[] {
  if (!Array.isArray(players)) return [];
  const normalized = normalizeId(playerId);

  return players.map((player) =>
    player.id === normalized
      ? {
          ...player,
          name: normalizeName(updates?.name ?? player.name) || player.name,
          initials: normalizeStringOrUndefined(updates?.initials ?? player.initials),
          color: normalizeStringOrUndefined(updates?.color ?? player.color),
          assignedCardArtIndex:
            updates?.assignedCardArtIndex === null
              ? null
              : typeof updates?.assignedCardArtIndex === 'number' &&
                  Number.isFinite(updates.assignedCardArtIndex)
                ? updates.assignedCardArtIndex
                : player.assignedCardArtIndex ?? null,
        }
      : player
  );
}

type StartActiveGameInput = {
  players: GamePlayer[];
  groupId?: string;
  groupName?: string;
};

type Store = {
  players: Player[];
  groups: Group[];
  games: Game[];
  activeGame: ActiveGame | null;
  selectedGroupId: string | null;

  selectedPlayerId: string | null;
  selectedGameId: string | null;
  selectedComparePlayerIds: string[];

  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removePlayer: (playerId: string) => void;
  deletePlayer: (playerId: string) => void;

  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  removeGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  selectGroup: (groupId: string | null) => void;

  setGames: (games: Game[]) => void;
  addGame: (game: Game) => void;
  removeGame: (gameId: string) => void;
  mergeImportedGames: (games: any[]) => void;

  setSelectedPlayerId: (playerId: string | null) => void;
  setSelectedGameId: (gameId: string | null) => void;
  setSelectedComparePlayerIds: (playerIds: string[]) => void;
  toggleComparePlayerId: (playerId: string) => void;
  clearChartSelections: () => void;

  startActiveGame: (input: StartActiveGameInput) => void;
  patchActiveGame: (patch: Partial<ActiveGame>) => void;
  clearActiveGame: () => void;

  assignPlayerCard: (playerId: string, artIndex: number | null) => void;
  resetStore: () => void;
};

export const useStore = create<Store>((set, get) => ({
  players: [],
  groups: [],
  games: [],
  activeGame: null,
  selectedGroupId: null,

  selectedPlayerId: null,
  selectedGameId: null,
  selectedComparePlayerIds: [],

  setPlayers: (players) =>
    set({
      players: Array.isArray(players) ? players : [],
    }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  updatePlayer: (playerId, updates) =>
    set((state) => {
      const normalized = normalizeId(playerId);
      if (!normalized) return {};

      const normalizedUpdates: Partial<Player> = {
        ...updates,
        name: normalizeName(updates?.name),
        color: normalizeStringOrUndefined(updates?.color),
        initials: normalizeStringOrUndefined(updates?.initials),
        assignedCardArtIndex:
          updates?.assignedCardArtIndex === null
            ? null
            : typeof updates?.assignedCardArtIndex === 'number' &&
                Number.isFinite(updates.assignedCardArtIndex)
              ? updates.assignedCardArtIndex
              : undefined,
      };

      return {
        players: state.players.map((p) =>
          p.id === normalized
            ? {
                ...p,
                ...normalizedUpdates,
                id: p.id,
                name: normalizedUpdates.name || p.name,
                color:
                  normalizedUpdates.color !== undefined ? normalizedUpdates.color : p.color,
                initials:
                  normalizedUpdates.initials !== undefined
                    ? normalizedUpdates.initials
                    : p.initials,
                assignedCardArtIndex:
                  normalizedUpdates.assignedCardArtIndex !== undefined
                    ? normalizedUpdates.assignedCardArtIndex
                    : p.assignedCardArtIndex ?? null,
              }
            : p
        ),
        activeGame: state.activeGame
          ? {
              ...state.activeGame,
              players: patchGamePlayers(
                state.activeGame.players,
                normalized,
                normalizedUpdates
              ),
            }
          : state.activeGame,
      };
    }),

  removePlayer: (playerId) =>
    set((state) => {
      const normalized = normalizeId(playerId);
      if (!normalized) return {};

      const nextPlayers = state.players.filter((p) => p.id !== normalized);

      const removedGroupIds = new Set(
        state.groups
          .filter((group) => Array.isArray(group.playerIds) && group.playerIds.includes(normalized))
          .map((group) => group.id)
      );

      const nextGroups = state.groups.filter((group) => !removedGroupIds.has(group.id));

      const sanitizeTotals = (totals: any) => {
        if (!totals || typeof totals !== 'object' || Array.isArray(totals)) {
          return totals ?? {};
        }
        return Object.fromEntries(
          Object.entries(totals).filter(([id]) => normalizeId(id) !== normalized)
        ) as GameTotals;
      };

      const sanitizeRounds = (rounds: any) =>
        Array.isArray(rounds)
          ? rounds.filter((round: any) => normalizeId(round?.playerId) !== normalized)
          : [];

      const sanitizePlayers = (playersToClean: any) =>
        Array.isArray(playersToClean)
          ? playersToClean.filter((p: any) => normalizeId(p?.id ?? p?.playerId) !== normalized)
          : [];

      const sanitizeWinner = (winnerId: any) =>
        normalizeId(winnerId) === normalized ? undefined : winnerId;

      const nextGames = state.games
        .map((game) => {
          const cleanedPlayers = sanitizePlayers(game.players);
          if (cleanedPlayers.length === 0) return null;

          return normalizeImportedGame({
            ...game,
            players: cleanedPlayers,
            totals: sanitizeTotals(game.totals),
            rounds: sanitizeRounds(game.rounds),
            timeline: sanitizeRounds(game.timeline),
            winnerId: sanitizeWinner(game.winnerId),
            selectedWinnerId: sanitizeWinner(game.selectedWinnerId),
            manualWinnerId: sanitizeWinner(game.manualWinnerId),
            groupId: removedGroupIds.has(String(game.groupId ?? '')) ? undefined : game.groupId,
            groupName: removedGroupIds.has(String(game.groupId ?? '')) ? undefined : game.groupName,
          });
        })
        .filter(Boolean) as Game[];

      const activeContainsPlayer =
        state.activeGame?.players?.some((p) => p.id === normalized) ?? false;

      const nextActiveGame = activeContainsPlayer
        ? null
        : state.activeGame
          ? {
              ...state.activeGame,
              players: sanitizePlayers(state.activeGame.players),
              totals: sanitizeTotals(state.activeGame.totals),
              rounds: sanitizeRounds(state.activeGame.rounds),
              selectedWinnerId: sanitizeWinner(state.activeGame.selectedWinnerId),
              groupId: removedGroupIds.has(String(state.activeGame.groupId ?? ''))
                ? undefined
                : state.activeGame.groupId,
              groupName: removedGroupIds.has(String(state.activeGame.groupId ?? ''))
                ? undefined
                : state.activeGame.groupName,
            }
          : null;

      return {
        players: nextPlayers,
        groups: nextGroups,
        games: nextGames,
        activeGame: nextActiveGame,
        selectedGroupId:
          state.selectedGroupId && removedGroupIds.has(state.selectedGroupId)
            ? null
            : state.selectedGroupId,
        selectedPlayerId:
          state.selectedPlayerId === normalized ? null : state.selectedPlayerId,
        selectedComparePlayerIds: state.selectedComparePlayerIds.filter((id) => id !== normalized),
      };
    }),

  deletePlayer: (playerId) => get().removePlayer(playerId),

  setGroups: (groups) =>
    set({
      groups: Array.isArray(groups) ? groups : [],
    }),

  addGroup: (group) =>
    set((state) => ({
      groups: [...state.groups, group],
    })),

  removeGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId,
      activeGame:
        state.activeGame?.groupId === groupId
          ? { ...state.activeGame, groupId: undefined, groupName: undefined }
          : state.activeGame,
    })),

  deleteGroup: (groupId) => get().removeGroup(groupId),

  selectGroup: (groupId) =>
    set({
      selectedGroupId: groupId,
    }),

  setGames: (games) =>
    set(() => {
      const normalizedGames = Array.isArray(games)
        ? games.map(normalizeImportedGame).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        : [];
      const currentSelectedGameId = get().selectedGameId;

      const validSelectedGameId =
        currentSelectedGameId &&
        normalizedGames.some((g) => String(g.id) === String(currentSelectedGameId))
          ? currentSelectedGameId
          : null;

      return {
        games: normalizedGames,
        selectedGameId: validSelectedGameId,
      };
    }),

  addGame: (game) =>
    set((state) => ({
      games: [normalizeImportedGame(game), ...state.games].sort(
        (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
      ),
    })),

  removeGame: (gameId) =>
    set((state) => {
      const normalized = normalizeId(gameId);
      if (!normalized) return {};

      const nextGames = state.games.filter((game) => String(game.id) !== normalized);

      return {
        games: nextGames,
        selectedGameId: state.selectedGameId === normalized ? null : state.selectedGameId,
      };
    }),

  mergeImportedGames: (incoming) => {
    const existing = Array.isArray(get().games) ? get().games : [];

    const incomingGames = (incoming ?? [])
      .map(normalizeImportedGame)
      .filter((g) => g.players.length > 0);

    const byId = new Map<string, Game>();

    const mergeTotals = (a: any, b: any) => {
      const result: any = { ...a };

      for (const [playerId, t] of Object.entries(b || {}) as [string, any][]) {
        const existingTotals = result[playerId] || {};

        result[playerId] = {
          ...existingTotals,
          ...t,
          score: Number((t as any).score) || Number(existingTotals.score) || 0,
          totalPrestige:
            Number((t as any).totalPrestige ?? (t as any).prestige) ||
            Number(existingTotals.totalPrestige ?? existingTotals.prestige) ||
            0,
          prestige:
            Number((t as any).prestige ?? (t as any).totalPrestige) ||
            Number(existingTotals.prestige ?? existingTotals.totalPrestige) ||
            0,
          directPrestige:
            Number((t as any).directPrestige) || Number(existingTotals.directPrestige) || 0,
          assistPrestigeReceived:
            Number((t as any).assistPrestigeReceived) ||
            Number(existingTotals.assistPrestigeReceived) ||
            0,
          assistPrestigeSent:
            Number((t as any).assistPrestigeSent) ||
            Number(existingTotals.assistPrestigeSent) ||
            0,
          objectivePrestige:
            Number((t as any).objectivePrestige) ||
            Number(existingTotals.objectivePrestige) ||
            0,
          assists: Number((t as any).assists) || Number(existingTotals.assists) || 0,
          contracts: Number((t as any).contracts) || Number(existingTotals.contracts) || 0,
          failures: Number((t as any).failures) || Number(existingTotals.failures) || 0,
          performance:
            Number((t as any).performance) || Number(existingTotals.performance) || 0,
          efficiency:
            Number((t as any).efficiency) || Number(existingTotals.efficiency) || 0,
          assistedEfficiency:
            Number((t as any).assistedEfficiency) ||
            Number(existingTotals.assistedEfficiency) ||
            0,
          assistPrestigeBySource: {
            ...(existingTotals.assistPrestigeBySource || {}),
            ...(((t as any).assistPrestigeBySource || {}) as Record<string, number>),
          },
        };
      }

      return result;
    };

    const mergeGame = (a: Game, b: Game): Game => ({
      ...a,
      ...b,
      totals: mergeTotals(a.totals, b.totals),
      rounds: b.rounds && b.rounds.length > 0 ? b.rounds : a.rounds,
      timeline:
        b.timeline && b.timeline.length > 0
          ? b.timeline
          : b.rounds && b.rounds.length > 0
            ? b.rounds
            : a.timeline ?? a.rounds,
      winnerId: b.winnerId ?? a.winnerId,
      selectedWinnerId:
        b.selectedWinnerId ??
        b.winnerId ??
        a.selectedWinnerId ??
        a.winnerId,
      manualWinnerId: b.manualWinnerId ?? a.manualWinnerId,
      roundCount:
        (typeof b.roundCount === 'number' ? b.roundCount : 0) ||
        (b.rounds?.length || b.timeline?.length || 0) ||
        (typeof a.roundCount === 'number' ? a.roundCount : 0) ||
        (a.rounds?.length || a.timeline?.length || 0),
      createdAt: b.createdAt ?? a.createdAt ?? Date.now(),
    });

    for (const game of existing) {
      byId.set(game.id, normalizeImportedGame(game));
    }

    for (const game of incomingGames) {
      const current = byId.get(game.id);
      if (!current) {
        byId.set(game.id, game);
      } else {
        byId.set(game.id, mergeGame(current, game));
      }
    }

    set({
      games: Array.from(byId.values()).sort(
        (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
      ),
    });
  },

  setSelectedPlayerId: (playerId) =>
    set((state) => {
      const normalized = normalizeId(playerId);
      if (!normalized) return { selectedPlayerId: null };

      const exists = state.players.some((p) => p.id === normalized);
      return { selectedPlayerId: exists ? normalized : null };
    }),

  setSelectedGameId: (gameId) =>
    set((state) => {
      const normalized = normalizeId(gameId);
      if (!normalized) return { selectedGameId: null };

      const exists = state.games.some((g) => String(g.id) === normalized);
      return { selectedGameId: exists ? normalized : null };
    }),

  setSelectedComparePlayerIds: (playerIds) =>
    set((state) => {
      const validPlayerIds = new Set(state.players.map((p) => p.id));
      const cleaned = Array.isArray(playerIds)
        ? Array.from(
            new Set(
              playerIds
                .map((id) => normalizeId(id))
                .filter((id) => id && validPlayerIds.has(id))
            )
          )
        : [];

      return {
        selectedComparePlayerIds: cleaned,
      };
    }),

  toggleComparePlayerId: (playerId) =>
    set((state) => {
      const normalized = normalizeId(playerId);
      if (!normalized) return {};

      const exists = state.players.some((p) => p.id === normalized);
      if (!exists) return {};

      const alreadySelected = state.selectedComparePlayerIds.includes(normalized);

      return {
        selectedComparePlayerIds: alreadySelected
          ? state.selectedComparePlayerIds.filter((id) => id !== normalized)
          : [...state.selectedComparePlayerIds, normalized],
      };
    }),

  clearChartSelections: () =>
    set({
      selectedPlayerId: null,
      selectedGameId: null,
      selectedComparePlayerIds: [],
    }),

  startActiveGame: ({ players, groupId, groupName }) => {
    const normalizedPlayers = Array.isArray(players)
      ? players
          .map((player, index) => ({
            id: normalizeId(player?.id),
            name: normalizeName(player?.name) || 'Player',
            initials: normalizeStringOrUndefined(player?.initials),
            color: normalizeStringOrUndefined(player?.color),
            assignedCardArtIndex:
              typeof player?.assignedCardArtIndex === 'number' &&
              Number.isFinite(player.assignedCardArtIndex)
                ? player.assignedCardArtIndex
                : null,
            startOrder:
              typeof player?.startOrder === 'number' && Number.isFinite(player.startOrder)
                ? player.startOrder
                : index,
          }))
          .filter((player) => player.id)
      : [];

    set({
      activeGame: {
        id: `${Date.now()}`,
        players: normalizedPlayers,
        turnIndex: 0,
        rounds: [],
        totals: {},
        current: createEmptyCurrent(),
        createdAt: Date.now(),
        groupId,
        groupName,
        selectedWinnerId: undefined,
        showTieBreaker: false,
        roundCount: 0,
      },
      selectedGroupId: groupId ?? null,
    });
  },

  patchActiveGame: (patch) =>
    set((state) => {
      if (!state.activeGame) return {};
      return {
        activeGame: {
          ...state.activeGame,
          ...patch,
        },
      };
    }),

  clearActiveGame: () =>
    set({
      activeGame: null,
    }),

  assignPlayerCard: (playerId, artIndex) =>
    set((state) => {
      const normalized = normalizeId(playerId);
      if (!normalized) return {};

      return {
        players: state.players.map((p) =>
          p.id === normalized ? { ...p, assignedCardArtIndex: artIndex } : p
        ),
        activeGame: state.activeGame
          ? {
              ...state.activeGame,
              players: patchGamePlayers(state.activeGame.players, normalized, {
                assignedCardArtIndex: artIndex,
              }),
            }
          : state.activeGame,
      };
    }),

  resetStore: () =>
    set({
      players: [],
      groups: [],
      games: [],
      activeGame: null,
      selectedGroupId: null,
      selectedPlayerId: null,
      selectedGameId: null,
      selectedComparePlayerIds: [],
    }),
}));
