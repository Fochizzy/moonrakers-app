import { buildGroupRows, buildPlayerRows } from '@/utils/compareHelpers';
import { Group, Player, StoredGame, SortDirection } from '@/utils/compareTypes';

const MAX_CONDITIONAL_ENTITIES = 5;

export type ConditionalSubjectMode = 'players' | 'groups';
export type ConditionalSelectionMode = 'must' | 'may';
export type ConditionalViewMode = 'present' | 'absent';
export type ConditionalSortKey =
  | 'name'
  | 'sampleGames'
  | 'winRateDelta'
  | 'prestigeDelta'
  | 'scoreDelta'
  | 'efficiencyDelta'
  | 'synergyDelta';

export type ConditionalEntityDelta = {
  id: string;
  name: string;
  color: string;
  isAnchor: boolean;
  sampleGames: number;
  overallGames: number;
  sampleWinRate: number;
  overallWinRate: number;
  winRateDelta: number;
  samplePrestigePerGame: number;
  overallPrestigePerGame: number;
  prestigeDelta: number;
  sampleScorePerGame: number;
  overallScorePerGame: number;
  scoreDelta: number;
  sampleEfficiency: number;
  overallEfficiency: number;
  efficiencyDelta: number;
  sampleSynergy: number;
  overallSynergy: number;
  synergyDelta: number;
};

export type ConditionalAnalysis = {
  anchorId: string | null;
  subjectMode: ConditionalSubjectMode;
  mustIncludeIds: string[];
  mayIncludeIds: string[];
  excludedMode: boolean;
  matchedGames: StoredGame[];
  summary: string;
  entities: ConditionalEntityDelta[];
  sampleSize: number;
  winRate: number;
  avgPrestige: number;
  avgScore: number;
  avgAssists: number;
} | null;

export type ConditionalState = {
  subjectMode: ConditionalSubjectMode;
  mustIncludeIds: string[];
  mayIncludeIds: string[];
  anchorId: string | null;
  selectionMode: ConditionalSelectionMode;
  viewMode: ConditionalViewMode;
  selectorCollapsed: boolean;
  hasRunCompare: boolean;
  sortKey: ConditionalSortKey;
  sortDirection: SortDirection;
};

export type ConditionalAction =
  | { type: 'toggle-entity'; id: string }
  | { type: 'remove-entity'; id: string }
  | { type: 'set-anchor'; id: string | null }
  | { type: 'set-selection-mode'; mode: ConditionalSelectionMode }
  | { type: 'set-view-mode'; mode: ConditionalViewMode }
  | { type: 'toggle-selector-collapsed' }
  | { type: 'run-compare' }
  | { type: 'clear' }
  | { type: 'set-sort'; key: ConditionalSortKey }
  | { type: 'apply-preset'; ids: string[]; anchorId?: string | null }
  | { type: 'set-subject-mode'; mode: ConditionalSubjectMode };

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getGamePlayers(game: StoredGame): { id: string }[] {
  return Array.isArray(game.players) ? game.players : [];
}

function hasPlayer(game: StoredGame, playerId: string): boolean {
  return getGamePlayers(game).some((player) => player.id === playerId);
}

function hasGroup(
  game: StoredGame,
  groupId: string,
  groupMap: Map<string, Group>
): boolean {
  const group = groupMap.get(groupId);
  if (!group) return false;
  const players = getGamePlayers(game).map((player) => player.id);
  return group.playerIds.length > 0 && group.playerIds.every((id) => players.includes(id));
}

function hasEntity(
  game: StoredGame,
  subjectMode: ConditionalSubjectMode,
  entityId: string,
  groupMap: Map<string, Group>
): boolean {
  return subjectMode === 'players'
    ? hasPlayer(game, entityId)
    : hasGroup(game, entityId, groupMap);
}

function matchesConditionalGame(
  game: StoredGame,
  subjectMode: ConditionalSubjectMode,
  anchorId: string | null,
  mustIncludeIds: string[],
  mayIncludeIds: string[],
  excludedMode: boolean,
  groupMap: Map<string, Group>
): boolean {
  if (!anchorId) return false;
  if (!hasEntity(game, subjectMode, anchorId, groupMap)) return false;

  if (excludedMode) {
    if (mustIncludeIds.some((id) => hasEntity(game, subjectMode, id, groupMap))) return false;
    if (mayIncludeIds.length > 0 && mayIncludeIds.every((id) => !hasEntity(game, subjectMode, id, groupMap))) {
      return false;
    }
    return true;
  }

  if (mustIncludeIds.some((id) => !hasEntity(game, subjectMode, id, groupMap))) return false;
  if (mayIncludeIds.length > 0 && !mayIncludeIds.some((id) => hasEntity(game, subjectMode, id, groupMap))) {
    return false;
  }

  return true;
}

function colorForEntity(
  subjectMode: ConditionalSubjectMode,
  entityId: string,
  playerMap: Map<string, Player>,
  groupMap: Map<string, Group>
): string {
  if (subjectMode === 'players') {
    return playerMap.get(entityId)?.color ?? '#60a5fa';
  }

  const group = groupMap.get(entityId);
  if (!group) return '#7dd3fc';

  for (const playerId of group.playerIds) {
    const color = playerMap.get(playerId)?.color;
    if (color) return color;
  }

  return '#7dd3fc';
}

function nameForEntity(
  subjectMode: ConditionalSubjectMode,
  entityId: string,
  playerMap: Map<string, Player>,
  groupMap: Map<string, Group>
): string {
  return subjectMode === 'players'
    ? playerMap.get(entityId)?.name ?? 'Unknown Player'
    : groupMap.get(entityId)?.name ?? 'Unknown Group';
}

type ConditionalRowLike = {
  id: string;
  label?: unknown;
  name?: unknown;
  color?: unknown;
  games?: unknown;
  winRate?: unknown;
  avgPrestigePerGame?: unknown;
  avgScorePerGame?: unknown;
  efficiency?: unknown;
  synergyIndex?: unknown;
};

function toConditionalDelta(
  row: ConditionalRowLike,
  overall: ConditionalRowLike | undefined,
  isAnchor: boolean
): ConditionalEntityDelta {
  return {
    id: String(row.id),
    name: String(row.label ?? row.name ?? 'Unknown'),
    color: String(row.color ?? '#60a5fa'),
    isAnchor,
    sampleGames: n(row.games),
    overallGames: n(overall?.games),
    sampleWinRate: n(row.winRate),
    overallWinRate: n(overall?.winRate),
    winRateDelta: round(n(row.winRate) - n(overall?.winRate), 2),
    samplePrestigePerGame: n(row.avgPrestigePerGame),
    overallPrestigePerGame: n(overall?.avgPrestigePerGame),
    prestigeDelta: round(n(row.avgPrestigePerGame) - n(overall?.avgPrestigePerGame), 2),
    sampleScorePerGame: n(row.avgScorePerGame),
    overallScorePerGame: n(overall?.avgScorePerGame),
    scoreDelta: round(n(row.avgScorePerGame) - n(overall?.avgScorePerGame), 2),
    sampleEfficiency: n(row.efficiency),
    overallEfficiency: n(overall?.efficiency),
    efficiencyDelta: round(n(row.efficiency) - n(overall?.efficiency), 2),
    sampleSynergy: n(row.synergyIndex),
    overallSynergy: n(overall?.synergyIndex),
    synergyDelta: round(n(row.synergyIndex) - n(overall?.synergyIndex), 3),
  };
}

export function buildConditionalAnalysis(args: {
  subjectMode: ConditionalSubjectMode;
  anchorId: string | null;
  mustIncludeIds: string[];
  mayIncludeIds: string[];
  excludedMode: boolean;
  playerMap: Map<string, Player>;
  groupMap: Map<string, Group>;
  games: StoredGame[];
}): ConditionalAnalysis {
  const {
    subjectMode,
    anchorId,
    mustIncludeIds,
    mayIncludeIds,
    excludedMode,
    playerMap,
    groupMap,
    games,
  } = args;

  if (!anchorId) return null;

  const selectedUniverse = Array.from(
    new Set([anchorId, ...mustIncludeIds, ...mayIncludeIds].filter(Boolean))
  ) as string[];

  const matchedGames = games.filter((game) =>
    matchesConditionalGame(
      game,
      subjectMode,
      anchorId,
      mustIncludeIds,
      mayIncludeIds,
      excludedMode,
      groupMap
    )
  );

  const allOverallRows: ConditionalRowLike[] =
    subjectMode === 'players'
      ? buildPlayerRows(Array.from(playerMap.keys()), playerMap, games)
      : buildGroupRows(Array.from(groupMap.keys()), groupMap, playerMap, games);

  const sampleRows: ConditionalRowLike[] =
    subjectMode === 'players'
      ? buildPlayerRows(selectedUniverse, playerMap, matchedGames)
      : buildGroupRows(selectedUniverse, groupMap, playerMap, matchedGames);

  const overallById = new Map(allOverallRows.map((row) => [row.id, row] as const));

  const entities = sampleRows.map((row) =>
    toConditionalDelta(
      {
        ...row,
        color: row.color ?? colorForEntity(subjectMode, row.id, playerMap, groupMap),
        label: row.label ?? nameForEntity(subjectMode, row.id, playerMap, groupMap),
      },
      overallById.get(row.id),
      row.id === anchorId
    )
  );

  const anchorRow = entities.find((row) => row.id === anchorId) ?? entities[0];

  const selectionNames = selectedUniverse
    .filter((id) => id !== anchorId)
    .map((id) => nameForEntity(subjectMode, id, playerMap, groupMap));

  const subjectLabel = subjectMode === 'players' ? 'player' : 'group';
  const clause = excludedMode ? 'without' : 'with';
  const selectionText = selectionNames.length ? selectionNames.join(', ') : `no extra ${subjectLabel}s`;

  return {
    anchorId,
    subjectMode,
    mustIncludeIds,
    mayIncludeIds,
    excludedMode,
    matchedGames,
    entities,
    sampleSize: matchedGames.length,
    winRate: anchorRow?.sampleWinRate ?? 0,
    avgPrestige: anchorRow?.samplePrestigePerGame ?? 0,
    avgScore: anchorRow?.sampleScorePerGame ?? 0,
    avgAssists: 0,
    summary: `${nameForEntity(subjectMode, anchorId, playerMap, groupMap)} ${clause} ${selectionText} matched ${matchedGames.length} games.`,
  };
}

export const initialConditionalState: ConditionalState = {
  subjectMode: 'players',
  mustIncludeIds: [],
  mayIncludeIds: [],
  anchorId: null,
  selectionMode: 'must',
  viewMode: 'present',
  selectorCollapsed: false,
  hasRunCompare: false,
  sortKey: 'winRateDelta',
  sortDirection: 'desc',
};

export function conditionalReducer(
  state: ConditionalState,
  action: ConditionalAction
): ConditionalState {
  switch (action.type) {
    case 'toggle-entity': {
      const inMust = state.mustIncludeIds.includes(action.id);
      const inMay = state.mayIncludeIds.includes(action.id);

      if (inMust || inMay) {
        return {
          ...state,
          mustIncludeIds: state.mustIncludeIds.filter((id) => id !== action.id),
          mayIncludeIds: state.mayIncludeIds.filter((id) => id !== action.id),
          anchorId: state.anchorId === action.id ? null : state.anchorId,
          hasRunCompare: false,
        };
      }

      const totalSelected = state.mustIncludeIds.length + state.mayIncludeIds.length;
      if (totalSelected >= MAX_CONDITIONAL_ENTITIES) return state;

      if (state.selectionMode === 'must') {
        return {
          ...state,
          mustIncludeIds: [...state.mustIncludeIds, action.id],
          hasRunCompare: false,
        };
      }

      return {
        ...state,
        mayIncludeIds: [...state.mayIncludeIds, action.id],
        hasRunCompare: false,
      };
    }

    case 'remove-entity':
      return {
        ...state,
        mustIncludeIds: state.mustIncludeIds.filter((id) => id !== action.id),
        mayIncludeIds: state.mayIncludeIds.filter((id) => id !== action.id),
        anchorId: state.anchorId === action.id ? null : state.anchorId,
        hasRunCompare: false,
      };

    case 'set-anchor':
      return { ...state, anchorId: action.id, hasRunCompare: false };

    case 'set-selection-mode':
      return { ...state, selectionMode: action.mode, hasRunCompare: false };

    case 'set-view-mode':
      return { ...state, viewMode: action.mode, hasRunCompare: false };

    case 'toggle-selector-collapsed':
      return { ...state, selectorCollapsed: !state.selectorCollapsed };

    case 'run-compare':
      return { ...state, hasRunCompare: true, selectorCollapsed: true };

    case 'clear':
      return { ...initialConditionalState, subjectMode: state.subjectMode };

    case 'set-sort': {
      const nextDirection =
        state.sortKey === action.key
          ? state.sortDirection === 'desc'
            ? 'asc'
            : 'desc'
          : action.key === 'name'
            ? 'asc'
            : 'desc';

      return { ...state, sortKey: action.key, sortDirection: nextDirection };
    }

    case 'apply-preset': {
      const ids = [...new Set(action.ids)].slice(0, MAX_CONDITIONAL_ENTITIES);
      return {
        ...state,
        mustIncludeIds: ids.filter((id) => id !== (action.anchorId ?? ids[0] ?? null)),
        mayIncludeIds: [],
        anchorId: action.anchorId ?? ids[0] ?? null,
        selectorCollapsed: false,
        hasRunCompare: false,
      };
    }

    case 'set-subject-mode':
      return { ...initialConditionalState, subjectMode: action.mode };

    default:
      return state;
  }
}
