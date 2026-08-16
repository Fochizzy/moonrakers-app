
import { create } from 'zustand';
import { buildActiveGameProjection } from '../lib/game-draft/buildActiveGameProjection.ts';
import { createUuid } from '../lib/ids/uuid.ts';
import {
  isGameplayDraftPhase,
} from '../lib/game-draft/phase.ts';
import type {
  GameDraft,
  GameDraftSyncState,
} from '../lib/game-draft/types.ts';
import { mergeRegisteredProfileIntoPlayer } from '../utils/registeredProfilePlayer';

export type Player = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  displayName?: string;
  hasSavedGames?: boolean;
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
  assistCountBySource?: Record<string, number>;
  objectivePrestige: number;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  headToHeadScoreBonus?: number;
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
  metaType?: "main" | "bonusObjective" | "headToHeadFirstPlace" | "headToHeadSecondPlace";
  linkedTurnId?: string;
  headToHeadScoreBonus?: number;
};

export type ActiveGameCurrent = {
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  headToHeadFirstPlaceId?: string | null;
  headToHeadSecondPlaceId?: string | null;
};

export type Game = {
  id: string;
  hostProfileId?: string;
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

export type AuthSession = {
  user: {
    id: string;
    email?: string | null;
  };
} | null;

export type AuthProfile = {
  id: string;
  player_name?: string | null;
  display_name?: string | null;
  favorite_color?: string | null;
  assigned_card_art_index?: number | null;
} | null;

export type AuthBootstrapStatus = 'idle' | 'loading' | 'ready' | 'error';

export type StatsGroupSnapshot = {
  groupId: string;
  name?: string;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type StatsSnapshot = {
  personal: Record<string, unknown>;
  global: Record<string, unknown>;
  groups: StatsGroupSnapshot[];
  loadedAt: number;
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

function isRecoveredPlayerName(v: any): boolean {
  return normalizeName(v).toLowerCase() === 'recovered player';
}

function isRecoveredPlayerRecord(v: any): boolean {
  return isRecoveredPlayerName(v?.name ?? v?.playerName ?? v?.displayName);
}

function getInitialsFromName(name: string): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function normalizeAssistMap(input: any): Record<string, number> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input)
      .map(([id, value]) => [normalizeId(id), safeNumber(value)])
      .filter(([id]) => Boolean(id))
  );
}

function normalizeAssistSourceMap(...inputs: any[]): Record<string, number> {
  return inputs.reduce((merged, input) => {
    const normalized = normalizeAssistMap(input);
    for (const [playerId, value] of Object.entries(normalized)) {
      merged[playerId] = safeNumber(merged[playerId]) + safeNumber(value);
    }
    return merged;
  }, {} as Record<string, number>);
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
    metaType:
      raw?.metaType === 'main' ||
      raw?.metaType === 'bonusObjective' ||
      raw?.metaType === 'headToHeadFirstPlace' ||
      raw?.metaType === 'headToHeadSecondPlace'
        ? raw.metaType
        : undefined,
    linkedTurnId: normalizeId(raw?.linkedTurnId) || undefined,
    headToHeadScoreBonus: safeNumber(raw?.headToHeadScoreBonus),
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
    headToHeadFirstPlaceId: null,
    headToHeadSecondPlaceId: null,
  };
}

function sanitizeStoredPlayers(players: any): Player[] {
  const seen = new Set<string>();

  return (Array.isArray(players) ? players : [])
    .map((rawPlayer: any) => {
      const id = normalizeId(rawPlayer?.id);
      const name = normalizeName(rawPlayer?.name);

      if (!id || !name || isRecoveredPlayerName(name) || seen.has(id)) {
        return null;
      }

      seen.add(id);

      return {
        ...rawPlayer,
        id,
        name,
        initials:
          normalizeStringOrUndefined(rawPlayer?.initials) || getInitialsFromName(name),
        color: normalizeStringOrUndefined(rawPlayer?.color),
        displayName: normalizeStringOrUndefined(rawPlayer?.displayName),
        hasSavedGames:
          typeof rawPlayer?.hasSavedGames === 'boolean'
            ? rawPlayer.hasSavedGames
            : undefined,
        assignedCardArtIndex:
          typeof rawPlayer?.assignedCardArtIndex === 'number' &&
          Number.isFinite(rawPlayer.assignedCardArtIndex)
            ? rawPlayer.assignedCardArtIndex
            : null,
      } satisfies Player;
    })
    .filter((player): player is Player => Boolean(player));
}

function sanitizeStoredGroups(groups: any, validPlayerIds: Set<string>): Group[] {
  return (Array.isArray(groups) ? groups : [])
    .map((rawGroup: any) => {
      const id = normalizeId(rawGroup?.id);
      const name = normalizeName(rawGroup?.name);

      if (!id || !name) {
        return null;
      }

      const playerIds = Array.from(
        new Set(
          (Array.isArray(rawGroup?.playerIds) ? rawGroup.playerIds : [])
            .map((playerId: any) => normalizeId(playerId))
            .filter((playerId: string) => Boolean(playerId) && validPlayerIds.has(playerId))
        )
      );

      if (playerIds.length === 0) {
        return null;
      }

      return {
        ...rawGroup,
        id,
        name,
        playerIds,
        createdAt:
          typeof rawGroup?.createdAt === 'number' && Number.isFinite(rawGroup.createdAt)
            ? rawGroup.createdAt
            : undefined,
        objectiveStatsEligible:
          typeof rawGroup?.objectiveStatsEligible === 'boolean'
            ? rawGroup.objectiveStatsEligible
            : undefined,
      } satisfies Group;
    })
    .filter((group): group is Group => Boolean(group));
}

function sanitizeStoredGames(games: any): Game[] {
  return (Array.isArray(games) ? games : [])
    .map((game: any) => normalizeImportedGame(game))
    .filter((game) => Array.isArray(game?.players) && game.players.length > 0);
}

function sanitizeSnapshotState(input: {
  players?: any;
  groups?: any;
  games?: any;
}) {
  const players = sanitizeStoredPlayers(input.players);
  const validPlayerIds = new Set(players.map((player) => player.id));

  return {
    players,
    groups: sanitizeStoredGroups(input.groups, validPlayerIds),
    games: sanitizeStoredGames(input.games),
  };
}

function normalizeImportedGame(raw: any): Game {
  const playerMap = new Map<string, GamePlayer>();

  if (Array.isArray(raw?.players)) {
    raw.players.forEach((p: any, index: number) => {
      if (isRecoveredPlayerRecord(p)) return;

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
    .filter((round: StoredRound | null): round is StoredRound => Boolean(round));

  const timeline = rawTimeline
    .map(normalizeRound)
    .filter((round: StoredRound | null): round is StoredRound => Boolean(round));

  const totals: GameTotals = {};
  const rawTotals =
    raw?.totals && typeof raw.totals === 'object' && !Array.isArray(raw.totals)
      ? raw.totals
      : {};

  Object.entries(rawTotals).forEach(([rawPlayerId, t]: any) => {
    const id = normalizeId(rawPlayerId);
    if (!id) return;
    if (!playerMap.has(id)) return;

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
      assistPrestigeBySource: normalizeAssistSourceMap(
        t?.assistPrestigeBySource,
        t?.assistPrestigeByPlayer,
        t?.assistPrestigeFromPlayers,
        t?.assistSources
      ),
      assistCountBySource: normalizeAssistMap(t?.assistCountBySource),
      objectivePrestige: objective,
      score: safeNumber(t?.score),
      assists: safeNumber(t?.assists),
      failures: safeNumber(t?.failures),
      contracts: safeNumber(t?.contracts),
      headToHeadScoreBonus: safeNumber(t?.headToHeadScoreBonus),
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
    hostProfileId: normalizeStringOrUndefined(raw?.hostProfileId),
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

type CloudSnapshotInput = {
  profile: AuthProfile;
  players: Player[];
  groups: Group[];
  games: Game[];
};

type RegisteredProfileInput = {
  id: string;
  name: string;
  displayName?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  hasSavedGames?: boolean;
};

type Store = {
  players: Player[];
  groups: Group[];
  games: Game[];
  activeGame: ActiveGame | null;
  gameDraft: GameDraft | null;
  gameDraftSyncState: GameDraftSyncState;
  selectedGroupId: string | null;
  authSession: AuthSession;
  authProfile: AuthProfile;
  authBootstrapStatus: AuthBootstrapStatus;
  authError: string | null;
  passwordRecoveryPending: boolean;
  statsSnapshot: StatsSnapshot | null;

  selectedPlayerId: string | null;
  selectedGameId: string | null;
  selectedComparePlayerIds: string[];

  setAuthSession: (session: AuthSession) => void;
  setAuthProfile: (profile: AuthProfile) => void;
  setAuthBootstrapStatus: (status: AuthBootstrapStatus) => void;
  setAuthError: (message: string | null) => void;
  setPasswordRecoveryPending: (pending: boolean) => void;
  setStatsSnapshot: (snapshot: StatsSnapshot | null) => void;
  hydrateAuthBootstrap: (input: {
    session: AuthSession;
    profile: AuthProfile;
  }) => void;
  hydrateCloudSnapshot: (input: {
    session: AuthSession;
    snapshot: CloudSnapshotInput;
    statsSnapshot?: StatsSnapshot | null;
  }) => void;
  hydrateCachedSnapshot: (input: {
    players?: unknown;
    groups?: unknown;
    games?: unknown;
  }) => void;
  clearAuthState: () => void;

  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  upsertRegisteredProfile: (profile: RegisteredProfileInput) => void;
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
  clearActiveGame: () => void;
  hydrateGameDraft: (input: {
    draft: GameDraft | null;
    syncState?: Partial<GameDraftSyncState>;
  }) => void;
  patchGameDraft: (updater: (draft: GameDraft | null) => GameDraft | null) => void;
  setGameDraftSyncState: (patch: Partial<GameDraftSyncState>) => void;
  clearGameDraft: () => void;

  assignPlayerCard: (playerId: string, artIndex: number | null) => void;
  resetStore: () => void;
};

export const useStore = create<Store>((set, get) => ({
  players: [],
  groups: [],
  games: [],
  activeGame: null,
  gameDraft: null,
  gameDraftSyncState: {
    state: 'idle',
    dirty: false,
    lastSyncedAt: null,
    conflictMessage: null,
  },
  selectedGroupId: null,
  authSession: null,
  authProfile: null,
  authBootstrapStatus: 'idle',
  authError: null,
  passwordRecoveryPending: false,
  statsSnapshot: null,

  selectedPlayerId: null,
  selectedGameId: null,
  selectedComparePlayerIds: [],

  setAuthSession: (session) =>
    set({
      authSession: session,
    }),

  setAuthProfile: (profile) =>
    set({
      authProfile: profile,
    }),

  setAuthBootstrapStatus: (status) =>
    set({
      authBootstrapStatus: status,
    }),

  setAuthError: (message) =>
    set({
      authError: message,
    }),

  setPasswordRecoveryPending: (pending) =>
    set({
      passwordRecoveryPending: Boolean(pending),
    }),

  setStatsSnapshot: (snapshot) =>
    set({
      statsSnapshot: snapshot,
    }),

  hydrateAuthBootstrap: ({ session, profile }) =>
    set({
      authSession: session,
      authProfile: profile,
      authBootstrapStatus: 'ready',
      authError: null,
    }),

  hydrateCloudSnapshot: ({ session, snapshot, statsSnapshot = null }) =>
    set(() => {
      const sanitized = sanitizeSnapshotState({
        players: snapshot.players,
        groups: snapshot.groups,
        games: snapshot.games,
      });

      return {
      authSession: session,
      authProfile: snapshot.profile,
      players: sanitized.players,
      groups: sanitized.groups,
      games: sanitized.games,
      statsSnapshot,
      authBootstrapStatus: 'ready',
      authError: null,
      };
    }),

  // Seeds the shared collections from the on-device cache during a cold start,
  // before the cloud snapshot lands. Auth state is left untouched: this says
  // nothing about who is signed in, only what the last session saw.
  hydrateCachedSnapshot: ({ players, groups, games }) =>
    set(() => {
      const sanitized = sanitizeSnapshotState({ players, groups, games });

      return {
        players: sanitized.players,
        groups: sanitized.groups,
        games: sanitized.games,
      };
    }),

  clearAuthState: () =>
    set({
      authSession: null,
      authProfile: null,
      authBootstrapStatus: 'idle',
      authError: null,
      passwordRecoveryPending: false,
      statsSnapshot: null,
    }),

  setPlayers: (players) =>
    set({
      players: sanitizeStoredPlayers(players),
    }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  upsertRegisteredProfile: (profile) =>
    set((state) => {
      const existingPlayer =
        state.players.find((player) => player.id === normalizeId(profile?.id)) ?? null;
      const nextPlayer = mergeRegisteredProfileIntoPlayer(existingPlayer, profile);

      if (!nextPlayer) {
        return {};
      }

      const exists = state.players.some((player) => player.id === nextPlayer.id);
      return {
        players: exists
          ? state.players.map((player) =>
              player.id === nextPlayer.id ? { ...player, ...nextPlayer } : player
            )
          : [...state.players, nextPlayer],
      };
    }),

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
    set((state) => ({
      groups: sanitizeStoredGroups(groups, new Set(state.players.map((player) => player.id))),
    })),

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
      const normalizedGames = sanitizeStoredGames(games).sort(
        (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
      );
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
    set((state) => {
      const normalizedGame = normalizeImportedGame(game);
      if (!Array.isArray(normalizedGame.players) || normalizedGame.players.length === 0) {
        return {};
      }

      return {
        games: [normalizedGame, ...state.games].sort(
          (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
        ),
      };
    }),

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
          assistCountBySource: {
            ...(existingTotals.assistCountBySource || {}),
            ...(((t as any).assistCountBySource || {}) as Record<string, number>),
          },
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
      hostProfileId: b.hostProfileId ?? a.hostProfileId,
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
      const normalizedGame = normalizeImportedGame(game);
      if (normalizedGame.players.length > 0) {
        byId.set(game.id, normalizedGame);
      }
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
        id: createUuid(),
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

  clearActiveGame: () =>
    set({
      activeGame: null,
    }),

  hydrateGameDraft: ({ draft, syncState }) =>
    set((state) => ({
      gameDraft: draft,
      gameDraftSyncState: {
        ...state.gameDraftSyncState,
        ...syncState,
      },
      activeGame:
        draft && isGameplayDraftPhase(draft.phase)
          ? buildActiveGameProjection(draft)
          : null,
    })),

  patchGameDraft: (updater) =>
    set((state) => {
      const nextDraft = updater(state.gameDraft);

      return {
        gameDraft: nextDraft,
        gameDraftSyncState: {
          ...state.gameDraftSyncState,
          state: 'pending',
          dirty: true,
          conflictMessage: null,
        },
        activeGame:
          nextDraft && isGameplayDraftPhase(nextDraft.phase)
            ? buildActiveGameProjection(nextDraft)
            : null,
      };
    }),

  setGameDraftSyncState: (patch) =>
    set((state) => ({
      gameDraftSyncState: {
        ...state.gameDraftSyncState,
        ...patch,
      },
    })),

  clearGameDraft: () =>
    set({
      gameDraft: null,
      gameDraftSyncState: {
        state: 'idle',
        dirty: false,
        lastSyncedAt: null,
        conflictMessage: null,
      },
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
      gameDraft: null,
      gameDraftSyncState: {
        state: 'idle',
        dirty: false,
        lastSyncedAt: null,
        conflictMessage: null,
      },
      selectedGroupId: null,
      authSession: null,
      authProfile: null,
      authBootstrapStatus: 'idle',
      authError: null,
      passwordRecoveryPending: false,
      statsSnapshot: null,
      selectedPlayerId: null,
      selectedGameId: null,
      selectedComparePlayerIds: [],
    }),
}));

export type StoreState = Store;

export function useGames() { return useStore((s: Store) => s.games); }
export function usePlayers() { return useStore((s: Store) => s.players); }
export function useGroups() { return useStore((s: Store) => s.groups); }
export function useActiveGame() { return useStore((s: Store) => s.activeGame); }
export function useSelectedGroupId() { return useStore((s: Store) => s.selectedGroupId); }
export function useAuthSession() { return useStore((s: Store) => s.authSession); }
export function useAuthProfile() { return useStore((s: Store) => s.authProfile); }
export function useAuthBootstrapStatus() { return useStore((s: Store) => s.authBootstrapStatus); }
export function usePasswordRecoveryPending() { return useStore((s: Store) => s.passwordRecoveryPending); }
export function useStatsSnapshot() { return useStore((s: Store) => s.statsSnapshot); }
export function useSelectedPlayerId() { return useStore((s: Store) => s.selectedPlayerId); }
export function useSelectedGameId() { return useStore((s: Store) => s.selectedGameId); }
export function useSelectedComparePlayerIds() { return useStore((s: Store) => s.selectedComparePlayerIds); }
export function useSetSelectedPlayerId() { return useStore((s: Store) => s.setSelectedPlayerId); }
export function useClearActiveGame() { return useStore((s: Store) => s.clearActiveGame); }
export function useGameDraft() { return useStore((s: Store) => s.gameDraft); }
export function useGameDraftSyncState() { return useStore((s: Store) => s.gameDraftSyncState); }
export function useHydrateCloudSnapshot() { return useStore((s: Store) => s.hydrateCloudSnapshot); }
export function useClearAuthState() { return useStore((s: Store) => s.clearAuthState); }
export function useSetPasswordRecoveryPending() { return useStore((s: Store) => s.setPasswordRecoveryPending); }
