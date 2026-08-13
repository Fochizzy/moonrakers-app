// storageKeys.ts

const APP_NAMESPACE = 'moonrakers';
const STORAGE_VERSION = 2;
const PREFIX = `${APP_NAMESPACE}:v${STORAGE_VERSION}` as const;

function createKey<T extends string>(key: T): `${typeof PREFIX}:${T}` {
  return `${PREFIX}:${key}`;
}

export const STORAGE_KEYS = {
  PLAYERS: createKey('players'),
  GAMES: createKey('games'),
  GROUPS: createKey('groups'),
  SETTINGS: createKey('settings'),
  GAME_DRAFT: createKey('game-draft'),
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export type StoredPlayer = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  startOrder?: number;
};

export type StoredGroup = {
  id: string;
  name: string;
  playerIds?: string[];
};

export type StoredPlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistCountBySource?: Record<string, number>;
  objectivePrestige?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  headToHeadScoreBonus?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
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

export type StoredGamePlayer = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  startOrder?: number;
  assignedCardArtIndex?: number | null;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistCountBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type StoredGame = {
  id: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, StoredPlayerTotals>;
  rounds?: StoredRound[];
  timeline?: StoredRound[];
  roundCount?: number;
  players?: StoredGamePlayer[];
  groupId?: string;
  groupName?: string;
  createdAt?: number;
};

export type StoredSettings = {
  lastOpenedAt?: number;
  /**
   * Owner of the cached players/groups/games snapshot. The cache is only
   * applied when it belongs to the signed-in profile, so switching accounts
   * never shows the previous account's history.
   */
  snapshotProfileId?: string;
  snapshotSavedAt?: number;
};

export type StoredGameDraftPhase =
  | 'player_selection'
  | 'setup'
  | 'in_progress'
  | 'ready_to_finish';

export type StoredGameDraftGameplay = {
  turnIndex: number;
  rounds: StoredRound[];
  totals: Record<string, StoredPlayerTotals>;
  current: {
    prestige: number;
    contracts: number;
    failures: number;
    assistRecipients: Record<string, number>;
    assistPrestigeRecipients: Record<string, number>;
    objectiveCount: number;
    headToHeadFirstPlaceId?: string | null;
    headToHeadSecondPlaceId?: string | null;
  };
  roundCount: number;
  selectedWinnerId?: string | null;
};

export type StoredGameDraft = {
  profileId: string;
  draftId: string;
  phase: StoredGameDraftPhase;
  revision: number;
  updatedAt: number;
  deviceUpdatedAt: number;
  selectedPlayerIds: string[];
  selectedGroupId?: string | null;
  selectedGroupName?: string | null;
  turnOrder: string[];
  playerSnapshots: StoredGamePlayer[];
  gameplay?: StoredGameDraftGameplay | null;
};

export type StoredGameDraftShadow = {
  profileId: string;
  draft: StoredGameDraft | null;
  dirty: boolean;
  syncState: 'idle' | 'restoring' | 'saving' | 'saved' | 'pending' | 'conflict' | 'failed';
  lastSyncedAt?: number | null;
};

export type StorageSchema = {
  players: StoredPlayer[];
  games: StoredGame[];
  groups: StoredGroup[];
  settings: StoredSettings;
  gameDraft: StoredGameDraftShadow;
};
