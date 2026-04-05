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

export type StoredRound = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  createdAt: number;
};

export type StoredGamePlayer = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  startOrder?: number;
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
};

export type StorageSchema = {
  players: StoredPlayer[];
  games: StoredGame[];
  groups: StoredGroup[];
  settings: StoredSettings;
};
