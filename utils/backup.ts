import * as FileSystem from 'expo-file-system/legacy';

export const BACKUP_FILE_NAME = 'moonrakers_backup.json';

export type PlayerColor =
  | 'Green'
  | 'Purple'
  | 'Blue'
  | 'Orange'
  | 'Yellow';

export type Player = {
  id: string;
  name: string;
  initials?: string;
  color?: PlayerColor | string;
  startOrder?: number;
};

export type Group = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt: number;
  objectiveStatsEligible?: boolean;
};

export type Round = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectivePrestige: number;
  createdAt: number;
};

export type EloSnapshot = Record<string, number>;

export type PlayerGameTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assistPrestigeBySource: Record<string, number>;
  assistCountBySource: Record<string, number>;
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

export type GamePlayer = Player & {
  startOrder?: number;
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
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type Game = {
  id: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players: GamePlayer[];
  createdAt?: number;
  groupId?: string;
  groupName?: string;
  totals?: GameTotals;
  rounds?: Round[];
  timeline?: Round[];
  roundCount?: number;
  eloSnapshot?: EloSnapshot;
  objectiveStatsEligible?: boolean;
};

export type BackupPayload = {
  version: 2;
  exportedAt: number;
  players: Player[];
  groups: Group[];
  games: Game[];
};

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeInitials(value: unknown, fallbackName?: string): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    return cleaned || undefined;
  }

  if (typeof fallbackName === 'string' && fallbackName.trim()) {
    const parts = fallbackName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      const single = parts[0].slice(0, 2).toUpperCase();
      return single || undefined;
    }
    const combined = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 3);
    return combined || undefined;
  }

  return undefined;
}

function safeNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [String(key).trim(), safeNumber(value)])
  );
}

function safePlayer(raw: unknown): Player | null {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Record<string, unknown>;
  const id = safeOptionalString(value.id);
  const name = safeOptionalString(value.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    initials: normalizeInitials(value.initials, name),
    color: typeof value.color === 'string' ? value.color.trim() : undefined,
    startOrder:
      typeof value.startOrder === 'number' && Number.isFinite(value.startOrder)
        ? value.startOrder
        : undefined,
  };
}

function safeGroup(raw: unknown): Group | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const value = raw as Record<string, unknown>;
  const id = safeOptionalString(value.id);
  const name = safeOptionalString(value.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    playerIds: Array.isArray(value.playerIds)
      ? value.playerIds.filter((item): item is string => typeof item === 'string' && !!item.trim()).map((item) => item.trim())
      : [],
    createdAt: safeNumber(value.createdAt) || Date.now(),
    objectiveStatsEligible:
      typeof value.objectiveStatsEligible === 'boolean'
        ? value.objectiveStatsEligible
        : undefined,
  };
}

function safeRound(raw: unknown): Round | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const value = raw as Record<string, unknown>;
  const id = safeOptionalString(value.id);
  const playerId = safeOptionalString(value.playerId);
  if (!id || !playerId) return null;

  return {
    id,
    playerId,
    prestige: safeNumber(value.prestige),
    contracts: safeNumber(value.contracts),
    failures: safeNumber(value.failures),
    assistRecipients:
      value.assistRecipients && typeof value.assistRecipients === 'object' && !Array.isArray(value.assistRecipients)
        ? Object.fromEntries(
            Object.entries(value.assistRecipients as Record<string, unknown>).map(([k, v]) => [String(k).trim(), safeNumber(v)])
          )
        : {},
    assistPrestigeRecipients:
      value.assistPrestigeRecipients && typeof value.assistPrestigeRecipients === 'object' && !Array.isArray(value.assistPrestigeRecipients)
        ? Object.fromEntries(
            Object.entries(value.assistPrestigeRecipients as Record<string, unknown>).map(([k, v]) => [String(k).trim(), safeNumber(v)])
          )
        : {},
    objectivePrestige: safeNumber((value as any).objectivePrestige),
    createdAt: safeNumber(value.createdAt) || Date.now(),
  };
}

function safeRoundsArray(raw: unknown): Round[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(safeRound).filter((round): round is Round => Boolean(round));
}

function normalizePlayerTotals(raw: unknown): PlayerGameTotals {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      prestige: 0,
      totalPrestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      assistPrestigeSent: 0,
      assistPrestigeBySource: {},
      assistCountBySource: {},
      objectivePrestige: 0,
      score: 0,
      assists: 0,
      failures: 0,
      contracts: 0,
      performance: 0,
      efficiency: 0,
      assistedEfficiency: 0,
    };
  }

  const value = raw as Record<string, unknown>;
  const directPrestige = safeNumber(value.directPrestige);
  const assistPrestigeReceived = safeNumber(value.assistPrestigeReceived);
  const objectivePrestige = safeNumber(value.objectivePrestige);

  const totalPrestige =
    typeof value.totalPrestige === 'number' && Number.isFinite(value.totalPrestige)
      ? value.totalPrestige
      : typeof value.prestige === 'number' && Number.isFinite(value.prestige)
        ? value.prestige
        : directPrestige + assistPrestigeReceived + objectivePrestige;

  return {
    prestige: totalPrestige,
    totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent: safeNumber(value.assistPrestigeSent),
    assistPrestigeBySource: safeNumberMap(value.assistPrestigeBySource),
    assistCountBySource: safeNumberMap(value.assistCountBySource),
    objectivePrestige,
    score: safeNumber(value.score),
    assists: safeNumber(value.assists),
    failures: safeNumber(value.failures),
    contracts: safeNumber(value.contracts),
    performance: safeNumber(value.performance),
    efficiency: safeNumber(value.efficiency),
    assistedEfficiency: safeNumber(value.assistedEfficiency),
  };
}

function safeTotals(raw: unknown): GameTotals | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([playerId, totals]) => [String(playerId).trim(), normalizePlayerTotals(totals)] as const)
    .filter(([playerId]) => !!playerId);

  return entries.length ? (Object.fromEntries(entries) as GameTotals) : undefined;
}

function safeEloSnapshot(raw: unknown): EloSnapshot | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([playerId, rating]) => [String(playerId).trim(), safeNumber(rating)] as const)
    .filter(([playerId]) => !!playerId);

  return entries.length ? (Object.fromEntries(entries) as EloSnapshot) : undefined;
}

function safeGamePlayer(raw: unknown): GamePlayer | null {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Record<string, unknown>;
  const base = safePlayer(raw);
  if (!base) return null;

  return {
    ...base,
    startOrder:
      typeof value.startOrder === 'number' && Number.isFinite(value.startOrder)
        ? value.startOrder
        : undefined,
    prestige: safeNumber(value.prestige),
    totalPrestige:
      typeof value.totalPrestige === 'number' && Number.isFinite(value.totalPrestige)
        ? value.totalPrestige
        : safeNumber(value.prestige),
    directPrestige: safeNumber(value.directPrestige),
    assistPrestigeReceived: safeNumber(value.assistPrestigeReceived),
    assistPrestigeSent: safeNumber(value.assistPrestigeSent),
    assistPrestigeBySource: safeNumberMap(value.assistPrestigeBySource),
    assistCountBySource: safeNumberMap(value.assistCountBySource),
    objectivePrestige: safeNumber(value.objectivePrestige),
    score: safeNumber(value.score),
    assists: safeNumber(value.assists),
    failures: safeNumber(value.failures),
    contracts: safeNumber(value.contracts),
    performance: safeNumber(value.performance),
    efficiency: safeNumber(value.efficiency),
    assistedEfficiency: safeNumber(value.assistedEfficiency),
  };
}

function ensurePlayersFromReferences(
  players: GamePlayer[],
  totals?: GameTotals,
  rounds?: Round[],
  timeline?: Round[]
): GamePlayer[] {
  const next = [...players];
  const seen = new Set(next.map((player) => player.id));

  const addMissing = (playerId: string) => {
    const id = playerId.trim();
    if (!id || seen.has(id)) return;
    next.push({ id, name: 'Recovered Player' });
    seen.add(id);
  };

  for (const playerId of Object.keys(totals ?? {})) addMissing(playerId);
  for (const round of rounds ?? []) addMissing(round.playerId);
  for (const round of timeline ?? []) addMissing(round.playerId);

  return next;
}

function safeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const value = raw as Record<string, unknown>;
  const id = safeOptionalString(value.id);
  if (!id) return null;

  const rounds = safeRoundsArray(value.rounds);
  const timeline = safeRoundsArray(value.timeline);
  const normalizedRounds = rounds.length ? rounds : timeline;
  const normalizedTimeline = timeline.length ? timeline : normalizedRounds;
  const totals = safeTotals(value.totals);

  const basePlayers = Array.isArray(value.players)
    ? value.players.map(safeGamePlayer).filter((player): player is GamePlayer => Boolean(player))
    : [];

  const players = ensurePlayersFromReferences(basePlayers, totals, normalizedRounds, normalizedTimeline);
  if (!players.length) return null;

  const validPlayerIds = new Set(players.map((player) => player.id));

  const winnerId = typeof value.winnerId === 'string' && validPlayerIds.has(value.winnerId.trim())
    ? value.winnerId.trim()
    : undefined;
  const selectedWinnerId = typeof value.selectedWinnerId === 'string' && validPlayerIds.has(value.selectedWinnerId.trim())
    ? value.selectedWinnerId.trim()
    : undefined;
  const manualWinnerId = typeof value.manualWinnerId === 'string' && validPlayerIds.has(value.manualWinnerId.trim())
    ? value.manualWinnerId.trim()
    : undefined;

  return {
    id,
    winnerId,
    selectedWinnerId,
    manualWinnerId,
    players,
    createdAt: safeNumber(value.createdAt) || Date.now(),
    groupId: safeOptionalString(value.groupId),
    groupName: safeOptionalString(value.groupName),
    totals,
    rounds: normalizedRounds,
    timeline: normalizedTimeline,
    roundCount:
      typeof value.roundCount === 'number' && Number.isFinite(value.roundCount)
        ? value.roundCount
        : normalizedRounds.length,
    eloSnapshot: safeEloSnapshot(value.eloSnapshot),
    objectiveStatsEligible:
      typeof value.objectiveStatsEligible === 'boolean'
        ? value.objectiveStatsEligible
        : false,
  };
}

function sanitizeBackupPayload(data: unknown): BackupPayload {
  const value = data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};

  const players = Array.isArray(value.players)
    ? value.players.map(safePlayer).filter((player): player is Player => Boolean(player))
    : [];

  const groups = Array.isArray(value.groups)
    ? value.groups.map(safeGroup).filter((group): group is Group => Boolean(group))
    : [];

  const games = Array.isArray(value.games)
    ? value.games.map(safeGame).filter((game): game is Game => Boolean(game))
    : [];

  return {
    version: 2,
    exportedAt:
      typeof value.exportedAt === 'number' && Number.isFinite(value.exportedAt)
        ? value.exportedAt
        : Date.now(),
    players,
    groups,
    games,
  };
}

export function parseBackupPayload(data: unknown): BackupPayload {
  return sanitizeBackupPayload(data);
}

export function getBackupFileUri() {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? null;
  if (!base) {
    throw new Error('No writable file directory is available.');
  }
  return `${base}${BACKUP_FILE_NAME}`;
}

export async function writeBackupFile(data: {
  players: Player[];
  groups: Group[];
  games: Game[];
}) {
  const uri = getBackupFileUri();

  const payload: BackupPayload = sanitizeBackupPayload({
    version: 2,
    exportedAt: Date.now(),
    players: data.players,
    groups: data.groups,
    games: data.games,
  });

  const json = JSON.stringify(payload, null, 2);
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return uri;
}

export async function readBackupFile<T = BackupPayload>() {
  const uri = getBackupFileUri();
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists) {
    return null;
  }

  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!raw.trim()) {
    return null;
  }

  const parsed = JSON.parse(raw);
  return sanitizeBackupPayload(parsed) as unknown as T;
}

export async function backupFileExists() {
  const uri = getBackupFileUri();
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}
