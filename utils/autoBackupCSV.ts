import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';

export type StorePlayer = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  startOrder?: number;
  [key: string]: unknown;
};

export type StoreGroup = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt?: number;
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

export type StoreTotals = {
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  assistPrestigeBySource?: Record<string, number>;
  objectivePrestige?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
};

export type StoreGame = {
  id: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: StorePlayer[];
  totals?: Record<string, StoreTotals>;
  rounds?: Round[];
  timeline?: Round[];
  roundCount?: number;
  groupId?: string;
  groupName?: string;
  createdAt?: number;
  objectiveStatsEligible?: boolean;
};

export type HybridCsvRow = {
  rowType: 'group' | 'game';
  gameId?: string;
  playerId?: string;
  player?: string;
  playerName?: string;
  playerProfile?: string;
  initials?: string;
  color?: string;
  startOrder?: number | '';
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  objectivePrestige?: number;
  assistPrestigeBySource?: string;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
  winner?: string;
  selectedWinner?: string;
  manualWinner?: string;
  groupId?: string;
  groupName?: string;
  groupPlayerIdsJson?: string;
  groupCreatedAt?: string;
  roundCount?: number;
  roundsJson?: string;
  timelineJson?: string;
  date?: string;
  objectiveStatsEligible?: string;
};

export type AutoBackupHybridPayload = {
  version: 2;
  format: 'moonrakers-hybrid';
  exportedAt: number;
  players: StorePlayer[];
  groups: StoreGroup[];
  games: StoreGame[];
  csvRows: HybridCsvRow[];
  csvText: string;
};

const AUTO_BACKUP_JSON_FILE = 'moonrakers_auto_backup.json';
const LEGACY_AUTO_BACKUP_CSV_FILE = 'moonrakers_auto_backup.csv';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(value: unknown): string {
  if (value == null) return '';
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function parseDateToTimestamp(value: unknown): number {
  const text = asString(value).trim();
  if (!text) return Date.now();
  const timestamp = new Date(text).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function parseLooseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;

  const text = value.trim();
  if (!text) return fallback;

  const attempts = [
    text,
    text.replace(/^"+|"+$/g, ''),
    text.replace(/^"+|"+$/g, '').replace(/""/g, '"'),
  ];

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // keep trying
    }
  }

  return fallback;
}

function normalizeName(value: unknown): string {
  return asString(value).trim();
}

function normalizeIdentityName(value: unknown): string {
  return normalizeName(value).toLowerCase().replace(/\s+/g, ' ');
}

function normalizeIdentityColor(value: unknown): string {
  return normalizeName(value).toLowerCase();
}

function getIdentityKey(input: { name?: unknown; color?: unknown }): string | null {
  const name = normalizeIdentityName(input.name);
  const color = normalizeIdentityColor(input.color);
  if (!name || !color) return null;
  return `${name}::${color}`;
}

function deriveTotalPrestige(input: {
  totalPrestige?: unknown;
  prestige?: unknown;
  directPrestige?: unknown;
  assistPrestigeReceived?: unknown;
  objectivePrestige?: unknown;
}): number {
  if (input.totalPrestige !== undefined && input.totalPrestige !== '') {
    return asNumber(input.totalPrestige);
  }
  if (input.prestige !== undefined && input.prestige !== '') {
    return asNumber(input.prestige);
  }
  return (
    asNumber(input.directPrestige) +
    asNumber(input.assistPrestigeReceived) +
    asNumber(input.objectivePrestige)
  );
}

function deriveWinnerFlag(value: unknown): boolean {
  const normalized = asString(value).trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function normalizeStorePlayer(input: Partial<StorePlayer> | null | undefined): StorePlayer | null {
  const id = normalizeName(input?.id);
  const name = normalizeName(input?.name);
  if (!id || !name) return null;

  return {
    ...(input ?? {}),
    id,
    name,
    initials: normalizeName(input?.initials) || undefined,
    color: normalizeName(input?.color) || undefined,
    startOrder:
      typeof input?.startOrder === 'number' && Number.isFinite(input.startOrder)
        ? input.startOrder
        : undefined,
  };
}

function normalizeRound(input: Partial<Round> | null | undefined): Round | null {
  const playerId = normalizeName(input?.playerId);
  if (!playerId) return null;

  return {
    id: normalizeName(input?.id) || createId(),
    playerId,
    prestige: asNumber(input?.prestige),
    contracts: asNumber(input?.contracts),
    failures: asNumber(input?.failures),
    assistRecipients:
      input?.assistRecipients && typeof input.assistRecipients === 'object'
        ? Object.fromEntries(
            Object.entries(input.assistRecipients).map(([k, v]) => [normalizeName(k), asNumber(v)])
          )
        : {},
    assistPrestigeRecipients:
      input?.assistPrestigeRecipients && typeof input.assistPrestigeRecipients === 'object'
        ? Object.fromEntries(
            Object.entries(input.assistPrestigeRecipients).map(([k, v]) => [normalizeName(k), asNumber(v)])
          )
        : {},
    objectivePrestige: asNumber(input?.objectivePrestige),
    createdAt: asNumber(input?.createdAt) || Date.now(),
  };
}

function parseRounds(value: unknown): Round[] {
  const parsed = parseLooseJson<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => normalizeRound(item as Partial<Round>))
    .filter((round): round is Round => Boolean(round));
}

function normalizeTotalsEntry(raw: unknown): StoreTotals {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

  const totalPrestige = deriveTotalPrestige({
    totalPrestige: value.totalPrestige,
    prestige: value.prestige,
    directPrestige: value.directPrestige,
    assistPrestigeReceived: value.assistPrestigeReceived,
    objectivePrestige: value.objectivePrestige,
  });

  return {
    score: asNumber(value.score),
    prestige: totalPrestige,
    totalPrestige,
    directPrestige: asNumber(value.directPrestige),
    assistPrestigeReceived: asNumber(value.assistPrestigeReceived),
    assistPrestigeSent: asNumber(value.assistPrestigeSent),
    assistPrestigeBySource:
      value.assistPrestigeBySource && typeof value.assistPrestigeBySource === 'object' && !Array.isArray(value.assistPrestigeBySource)
        ? Object.fromEntries(
            Object.entries(value.assistPrestigeBySource as Record<string, unknown>).map(([k, v]) => [normalizeName(k), asNumber(v)])
          )
        : {},
    objectivePrestige: asNumber(value.objectivePrestige),
    assists: asNumber(value.assists),
    failures: asNumber(value.failures),
    contracts: asNumber(value.contracts),
    performance: asNumber(value.performance),
    efficiency: asNumber(value.efficiency),
    assistedEfficiency: asNumber(value.assistedEfficiency),
  };
}

function buildPlayerProfile(player: StorePlayer): Record<string, unknown> {
  const { id, name, initials, color, startOrder, ...rest } = player;
  return { id, name, initials, color, startOrder, ...rest };
}

function buildHybridCsvRows(data: {
  players?: StorePlayer[];
  groups?: StoreGroup[];
  games?: StoreGame[];
}): HybridCsvRow[] {
  const rows: HybridCsvRow[] = [];
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const games = Array.isArray(data.games) ? data.games : [];

  for (const group of groups) {
    rows.push({
      rowType: 'group',
      groupId: group.id,
      groupName: group.name,
      groupPlayerIdsJson: JSON.stringify(group.playerIds ?? []),
      groupCreatedAt: toIsoDate(group.createdAt),
      objectiveStatsEligible: group.objectiveStatsEligible ? 'yes' : 'no',
    });
  }

  for (const game of games) {
    const players = Array.isArray(game.players) ? game.players : [];
    const totals = game.totals ?? {};
    const rounds = Array.isArray(game.rounds) ? game.rounds : [];
    const timeline = Array.isArray(game.timeline) ? game.timeline : rounds;

    for (const player of players) {
      const t = normalizeTotalsEntry(totals[player.id]);
      rows.push({
        rowType: 'game',
        gameId: game.id,
        playerId: player.id,
        player: player.name,
        playerName: player.name,
        playerProfile: JSON.stringify(buildPlayerProfile(player)),
        initials: player.initials ?? '',
        color: player.color ?? '',
        startOrder:
          typeof player.startOrder === 'number' && Number.isFinite(player.startOrder)
            ? player.startOrder
            : '',
        score: asNumber(t.score),
        prestige: asNumber(t.totalPrestige ?? t.prestige),
        totalPrestige: asNumber(t.totalPrestige ?? t.prestige),
        directPrestige: asNumber(t.directPrestige),
        assistPrestigeReceived: asNumber(t.assistPrestigeReceived),
        assistPrestigeSent: asNumber(t.assistPrestigeSent),
        assistPrestigeBySource: JSON.stringify(t.assistPrestigeBySource ?? {}),
        objectivePrestige: asNumber(t.objectivePrestige),
        assists: asNumber(t.assists),
        failures: asNumber(t.failures),
        contracts: asNumber(t.contracts),
        performance: asNumber(t.performance),
        efficiency: asNumber(t.efficiency),
        assistedEfficiency: asNumber(t.assistedEfficiency),
        winner:
          game.winnerId === player.id || game.selectedWinnerId === player.id || game.manualWinnerId === player.id
            ? 'yes'
            : 'no',
        selectedWinner: game.selectedWinnerId === player.id ? 'yes' : 'no',
        manualWinner: game.manualWinnerId === player.id ? 'yes' : 'no',
        groupId: game.groupId ?? '',
        groupName: game.groupName ?? '',
        groupCreatedAt: '',
        roundCount: game.roundCount || rounds.length || timeline.length,
        roundsJson: JSON.stringify(rounds),
        timelineJson: JSON.stringify(timeline),
        date: toIsoDate(game.createdAt),
        objectiveStatsEligible: game.objectiveStatsEligible ? 'yes' : 'no',
      });
    }
  }

  return rows;
}

export function createAutoBackupHybridPayload(data: {
  players?: StorePlayer[];
  groups?: StoreGroup[];
  games?: StoreGame[];
}): AutoBackupHybridPayload {
  const players = (Array.isArray(data.players) ? data.players : [])
    .map((player) => normalizeStorePlayer(player))
    .filter((player): player is StorePlayer => Boolean(player));
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const games = Array.isArray(data.games) ? data.games : [];
  const csvRows = buildHybridCsvRows({ players, groups, games });

  return {
    version: 2,
    format: 'moonrakers-hybrid',
    exportedAt: Date.now(),
    players,
    groups,
    games,
    csvRows,
    csvText: Papa.unparse(csvRows),
  };
}

export async function saveAutoBackupHybrid(
  data: {
    players?: StorePlayer[];
    groups?: StoreGroup[];
    games?: StoreGame[];
  },
  options?: {
    fileName?: string;
  }
): Promise<{ saved: boolean; fileUri?: string }> {
  try {
    const payload = createAutoBackupHybridPayload(data);
    const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!baseDir) {
      return { saved: false };
    }

    const fileName = options?.fileName ?? AUTO_BACKUP_JSON_FILE;
    const fileUri = `${baseDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { saved: true, fileUri };
  } catch (error) {
    console.error('saveAutoBackupHybrid failed:', error);
    return { saved: false };
  }
}

function mergePlayerById(base: StorePlayer | undefined, incoming: StorePlayer): StorePlayer {
  return {
    ...(base ?? {}),
    ...incoming,
    id: incoming.id || base?.id || createId(),
    name: incoming.name || base?.name || 'Unknown Player',
    initials: incoming.initials || base?.initials || undefined,
    color: incoming.color || base?.color || undefined,
    startOrder:
      typeof incoming.startOrder === 'number' && Number.isFinite(incoming.startOrder)
        ? incoming.startOrder
        : base?.startOrder,
  };
}

type CanonicalPlayersResult = {
  players: StorePlayer[];
  idMap: Map<string, string>;
};

function buildCanonicalPlayers(existing: StorePlayer[], incoming: StorePlayer[]): CanonicalPlayersResult {
  const canonicalById = new Map<string, StorePlayer>();
  const canonicalByIdentity = new Map<string, StorePlayer>();
  const idMap = new Map<string, string>();

  const registerExisting = (player: StorePlayer) => {
    canonicalById.set(player.id, player);
    const identityKey = getIdentityKey(player);
    if (identityKey) canonicalByIdentity.set(identityKey, player);
    idMap.set(player.id, player.id);
  };

  for (const raw of existing) {
    const player = normalizeStorePlayer(raw);
    if (!player) continue;
    registerExisting(player);
  }

  for (const raw of incoming) {
    const player = normalizeStorePlayer(raw);
    if (!player) continue;

    const exact = canonicalById.get(player.id);
    if (exact) {
      const merged = mergePlayerById(exact, player);
      canonicalById.set(merged.id, merged);
      const identityKey = getIdentityKey(merged);
      if (identityKey) canonicalByIdentity.set(identityKey, merged);
      idMap.set(player.id, merged.id);
      continue;
    }

    const identityKey = getIdentityKey(player);
    if (identityKey) {
      const identityMatch = canonicalByIdentity.get(identityKey);
      if (identityMatch) {
        const merged = mergePlayerById(identityMatch, { ...player, id: identityMatch.id });
        canonicalById.set(identityMatch.id, merged);
        canonicalByIdentity.set(identityKey, merged);
        idMap.set(player.id, identityMatch.id);
        continue;
      }
    }

    canonicalById.set(player.id, player);
    if (identityKey) canonicalByIdentity.set(identityKey, player);
    idMap.set(player.id, player.id);
  }

  return {
    players: Array.from(canonicalById.values()),
    idMap,
  };
}

function remapId(id: unknown, idMap: Map<string, string>): string | undefined {
  const normalized = normalizeName(id);
  if (!normalized) return undefined;
  return idMap.get(normalized) || normalized;
}

function remapNumericMap(input: Record<string, number> | undefined, idMap: Map<string, string>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [rawId, rawValue] of Object.entries(input ?? {})) {
    const canonicalId = remapId(rawId, idMap);
    if (!canonicalId) continue;
    next[canonicalId] = asNumber(next[canonicalId]) + asNumber(rawValue);
  }
  return next;
}

function mergeTotals(base: StoreTotals | undefined, incoming: StoreTotals | undefined): StoreTotals {
  const left = normalizeTotalsEntry(base);
  const right = normalizeTotalsEntry(incoming);
  const totalPrestige =
    asNumber(left.totalPrestige ?? left.prestige) + asNumber(right.totalPrestige ?? right.prestige);

  return {
    score: asNumber(left.score) + asNumber(right.score),
    prestige: totalPrestige,
    totalPrestige,
    directPrestige: asNumber(left.directPrestige) + asNumber(right.directPrestige),
    assistPrestigeReceived: asNumber(left.assistPrestigeReceived) + asNumber(right.assistPrestigeReceived),
    assistPrestigeSent: asNumber(left.assistPrestigeSent) + asNumber(right.assistPrestigeSent),
    assistPrestigeBySource: (() => {
      const merged: Record<string, number> = {};
      for (const [k, v] of Object.entries(left.assistPrestigeBySource ?? {})) {
        merged[k] = asNumber(v);
      }
      for (const [k, v] of Object.entries(right.assistPrestigeBySource ?? {})) {
        merged[k] = asNumber(merged[k]) + asNumber(v);
      }
      return merged;
    })(),
    objectivePrestige: Math.max(asNumber(left.objectivePrestige), asNumber(right.objectivePrestige)),
    assists: asNumber(left.assists) + asNumber(right.assists),
    failures: asNumber(left.failures) + asNumber(right.failures),
    contracts: asNumber(left.contracts) + asNumber(right.contracts),
    performance: asNumber(left.performance) + asNumber(right.performance),
    efficiency: asNumber(left.efficiency) + asNumber(right.efficiency),
    assistedEfficiency: asNumber(left.assistedEfficiency) + asNumber(right.assistedEfficiency),
  };
}

function remapRounds(rounds: Round[] | undefined, idMap: Map<string, string>): Round[] {
  return (Array.isArray(rounds) ? rounds : [])
    .map((round) => {
      const normalized = normalizeRound(round);
      if (!normalized) return null;
      const playerId = remapId(normalized.playerId, idMap);
      if (!playerId) return null;
      return {
        ...normalized,
        playerId,
        assistRecipients: remapNumericMap(normalized.assistRecipients, idMap),
        assistPrestigeRecipients: remapNumericMap(normalized.assistPrestigeRecipients, idMap),
      };
    })
    .filter((round): round is Round => Boolean(round));
}

function normalizeGameShape(game: Partial<StoreGame> | null | undefined): StoreGame | null {
  const id = normalizeName(game?.id);
  if (!id) return null;

  const players = (Array.isArray(game?.players) ? game.players : [])
    .map((player) => normalizeStorePlayer(player))
    .filter((player): player is StorePlayer => Boolean(player));

  const totalsEntries = Object.entries(game?.totals ?? {}).map(([playerId, totals]) => [
    normalizeName(playerId),
    normalizeTotalsEntry(totals),
  ] as const).filter(([playerId]) => !!playerId);

  return {
    id,
    winnerId: normalizeName(game?.winnerId) || undefined,
    selectedWinnerId: normalizeName(game?.selectedWinnerId) || undefined,
    manualWinnerId: normalizeName(game?.manualWinnerId) || undefined,
    players,
    totals: Object.fromEntries(totalsEntries),
    rounds: remapRounds(game?.rounds, new Map()),
    timeline: remapRounds(game?.timeline, new Map()),
    roundCount:
      typeof game?.roundCount === 'number' && Number.isFinite(game.roundCount)
        ? game.roundCount
        : Array.isArray(game?.rounds)
          ? game.rounds.length
          : Array.isArray(game?.timeline)
            ? game.timeline.length
            : 0,
    groupId: normalizeName(game?.groupId) || undefined,
    groupName: normalizeName(game?.groupName) || undefined,
    createdAt: asNumber(game?.createdAt) || Date.now(),
    objectiveStatsEligible: Boolean(game?.objectiveStatsEligible),
  };
}

function remapGame(game: StoreGame, idMap: Map<string, string>): StoreGame {
  const playersById = new Map<string, StorePlayer>();
  for (const rawPlayer of game.players ?? []) {
    const normalized = normalizeStorePlayer(rawPlayer);
    if (!normalized) continue;
    const canonicalId = remapId(normalized.id, idMap);
    if (!canonicalId) continue;
    const current = playersById.get(canonicalId);
    playersById.set(canonicalId, mergePlayerById(current, { ...normalized, id: canonicalId }));
  }

  const totalsById = new Map<string, StoreTotals>();
  for (const [rawId, rawTotals] of Object.entries(game.totals ?? {})) {
    const canonicalId = remapId(rawId, idMap);
    if (!canonicalId) continue;
    const current = totalsById.get(canonicalId);
    totalsById.set(
      canonicalId,
      mergeTotals(current, {
        ...normalizeTotalsEntry(rawTotals),
        assistPrestigeBySource: remapNumericMap(normalizeTotalsEntry(rawTotals).assistPrestigeBySource, idMap),
      })
    );
  }

  for (const [playerId] of totalsById) {
    if (!playersById.has(playerId)) {
      playersById.set(playerId, {
        id: playerId,
        name: 'Recovered Player',
      });
    }
  }

  const rounds = remapRounds(game.rounds, idMap);
  const timeline = remapRounds(game.timeline, idMap);
  for (const round of [...rounds, ...timeline]) {
    if (!playersById.has(round.playerId)) {
      playersById.set(round.playerId, {
        id: round.playerId,
        name: 'Recovered Player',
      });
    }
  }

  const playerIds = new Set(Array.from(playersById.keys()));
  const winnerId = remapId(game.winnerId, idMap);
  const selectedWinnerId = remapId(game.selectedWinnerId, idMap);
  const manualWinnerId = remapId(game.manualWinnerId, idMap);

  return {
    ...game,
    players: Array.from(playersById.values()),
    totals: Object.fromEntries(Array.from(totalsById.entries()).filter(([playerId]) => playerIds.has(playerId))),
    rounds,
    timeline: timeline.length ? timeline : rounds,
    winnerId: winnerId && playerIds.has(winnerId) ? winnerId : undefined,
    selectedWinnerId: selectedWinnerId && playerIds.has(selectedWinnerId) ? selectedWinnerId : undefined,
    manualWinnerId: manualWinnerId && playerIds.has(manualWinnerId) ? manualWinnerId : undefined,
    roundCount: game.roundCount || rounds.length || timeline.length || 0,
  };
}

function remapGroups(groups: StoreGroup[], idMap: Map<string, string>): StoreGroup[] {
  return groups.map((group) => ({
    ...group,
    playerIds: Array.from(
      new Set(
        (Array.isArray(group.playerIds) ? group.playerIds : [])
          .map((id) => remapId(id, idMap))
          .filter((id): id is string => Boolean(id))
      )
    ),
  }));
}

function mergeGroupArrays(existing: StoreGroup[], incoming: StoreGroup[]): StoreGroup[] {
  const byId = new Map<string, StoreGroup>();
  for (const group of [...existing, ...incoming]) {
    const id = normalizeName(group?.id);
    const name = normalizeName(group?.name);
    if (!id || !name) continue;
    const current = byId.get(id);
    byId.set(id, {
      ...(current ?? {}),
      ...group,
      id,
      name,
      playerIds: Array.from(new Set([...(current?.playerIds ?? []), ...(group.playerIds ?? [])].filter(Boolean))),
      createdAt: asNumber(group.createdAt) || asNumber(current?.createdAt) || Date.now(),
      objectiveStatsEligible:
        typeof group.objectiveStatsEligible === 'boolean'
          ? group.objectiveStatsEligible
          : current?.objectiveStatsEligible,
    });
  }
  return Array.from(byId.values());
}

function mergeGameArrays(existing: StoreGame[], incoming: StoreGame[]): StoreGame[] {
  const byId = new Map<string, StoreGame>();

  const upsert = (raw: StoreGame) => {
    const game = normalizeGameShape(raw);
    if (!game) return;

    const current = byId.get(game.id);
    if (!current) {
      byId.set(game.id, game);
      return;
    }

    const players = buildCanonicalPlayers(
      (current.players ?? []).map((player) => normalizeStorePlayer(player)).filter((player): player is StorePlayer => Boolean(player)),
      (game.players ?? []).map((player) => normalizeStorePlayer(player)).filter((player): player is StorePlayer => Boolean(player))
    );

    const remappedCurrent = remapGame(current, players.idMap);
    const remappedIncoming = remapGame(game, players.idMap);

    const mergedTotals = new Map<string, StoreTotals>();
    for (const [playerId, totals] of Object.entries(remappedCurrent.totals ?? {})) {
      mergedTotals.set(playerId, normalizeTotalsEntry(totals));
    }
    for (const [playerId, totals] of Object.entries(remappedIncoming.totals ?? {})) {
      mergedTotals.set(playerId, mergeTotals(mergedTotals.get(playerId), normalizeTotalsEntry(totals)));
    }

    byId.set(game.id, {
      ...remappedCurrent,
      ...remappedIncoming,
      players: players.players,
      totals: Object.fromEntries(mergedTotals),
      rounds: remappedIncoming.rounds?.length ? remappedIncoming.rounds : remappedCurrent.rounds ?? [],
      timeline:
        remappedIncoming.timeline?.length
          ? remappedIncoming.timeline
          : remappedIncoming.rounds?.length
            ? remappedIncoming.rounds
            : remappedCurrent.timeline ?? remappedCurrent.rounds ?? [],
      winnerId: remappedIncoming.winnerId ?? remappedCurrent.winnerId,
      selectedWinnerId: remappedIncoming.selectedWinnerId ?? remappedCurrent.selectedWinnerId,
      manualWinnerId: remappedIncoming.manualWinnerId ?? remappedCurrent.manualWinnerId,
      roundCount:
        remappedIncoming.roundCount ||
        remappedCurrent.roundCount ||
        remappedIncoming.rounds?.length ||
        remappedCurrent.rounds?.length ||
        remappedIncoming.timeline?.length ||
        remappedCurrent.timeline?.length ||
        0,
      createdAt: remappedIncoming.createdAt ?? remappedCurrent.createdAt ?? Date.now(),
      objectiveStatsEligible:
        typeof remappedIncoming.objectiveStatsEligible === 'boolean'
          ? remappedIncoming.objectiveStatsEligible
          : Boolean(remappedCurrent.objectiveStatsEligible),
    });
  };

  for (const game of existing) upsert(game);
  for (const game of incoming) upsert(game);

  return Array.from(byId.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

function parseCsvRows(rows: HybridCsvRow[], existingState: any) {
  const existingPlayers: StorePlayer[] = Array.isArray(existingState.players) ? existingState.players : [];
  const existingGroups: StoreGroup[] = Array.isArray(existingState.groups) ? existingState.groups : [];
  const existingGames: StoreGame[] = Array.isArray(existingState.games) ? existingState.games : [];

  const csvPlayers: StorePlayer[] = [];
  const csvGroups: StoreGroup[] = [];
  const csvGames = new Map<string, StoreGame>();

  for (const row of rows) {
    const rowType = asString(row.rowType).trim().toLowerCase();

    if (rowType === 'group') {
      const groupId = normalizeName(row.groupId);
      const groupName = normalizeName(row.groupName);
      if (groupId && groupName) {
        csvGroups.push({
          id: groupId,
          name: groupName,
          playerIds: parseLooseJson<string[]>(row.groupPlayerIdsJson, []).map((id) => normalizeName(id)).filter(Boolean),
          createdAt: parseDateToTimestamp(row.groupCreatedAt),
          objectiveStatsEligible: deriveWinnerFlag(row.objectiveStatsEligible),
        });
      }
      continue;
    }

    const gameId = normalizeName(row.gameId);
    if (!gameId) continue;

    const profile = parseLooseJson<Partial<StorePlayer>>(row.playerProfile, {});
    const player = normalizeStorePlayer({
      ...profile,
      id: normalizeName(row.playerId) || normalizeName(profile.id) || createId(),
      name: normalizeName(row.playerName || row.player) || normalizeName(profile.name) || 'Unknown Player',
      initials: normalizeName(row.initials) || normalizeName(profile.initials) || undefined,
      color: normalizeName(row.color) || normalizeName(profile.color) || undefined,
      startOrder:
        row.startOrder !== '' && row.startOrder != null
          ? asNumber(row.startOrder)
          : typeof profile.startOrder === 'number' && Number.isFinite(profile.startOrder)
            ? profile.startOrder
            : undefined,
    });
    if (!player) continue;
    csvPlayers.push(player);

    if (!csvGames.has(gameId)) {
      const rounds = parseRounds(row.roundsJson);
      const timeline = parseRounds(row.timelineJson);
      csvGames.set(gameId, {
        id: gameId,
        players: [],
        totals: {},
        winnerId: undefined,
        selectedWinnerId: undefined,
        manualWinnerId: undefined,
        rounds,
        timeline: timeline.length ? timeline : rounds,
        roundCount: asNumber(row.roundCount) || rounds.length || timeline.length,
        groupId: normalizeName(row.groupId) || undefined,
        groupName: normalizeName(row.groupName) || undefined,
        createdAt: parseDateToTimestamp(row.date),
        objectiveStatsEligible: deriveWinnerFlag(row.objectiveStatsEligible),
      });
    }

    const game = csvGames.get(gameId)!;
    if (!game.players!.some((entry) => entry.id === player.id)) {
      game.players!.push(player);
    }

    game.totals![player.id] = normalizeTotalsEntry({
      score: row.score,
      prestige: row.prestige,
      totalPrestige: row.totalPrestige,
      directPrestige: row.directPrestige,
      assistPrestigeReceived: row.assistPrestigeReceived,
      assistPrestigeSent: row.assistPrestigeSent,
      assistPrestigeBySource: parseLooseJson(row.assistPrestigeBySource, {}),
      objectivePrestige: row.objectivePrestige,
      assists: row.assists,
      failures: row.failures,
      contracts: row.contracts,
      performance: row.performance,
      efficiency: row.efficiency,
      assistedEfficiency: row.assistedEfficiency,
    });

    if (deriveWinnerFlag(row.winner)) game.winnerId = player.id;
    if (deriveWinnerFlag(row.selectedWinner)) game.selectedWinnerId = player.id;
    if (deriveWinnerFlag(row.manualWinner)) game.manualWinnerId = player.id;
  }

  const { players, idMap } = buildCanonicalPlayers(existingPlayers, csvPlayers);
  const groups = mergeGroupArrays(remapGroups(existingGroups, idMap), remapGroups(csvGroups, idMap));
  const games = mergeGameArrays(
    existingGames.map((game) => remapGame(normalizeGameShape(game) ?? game, idMap)),
    Array.from(csvGames.values()).map((game) => remapGame(normalizeGameShape(game) ?? game, idMap))
  );

  return { players, groups, games };
}

function collectPlayersFromGames(games: StoreGame[]): StorePlayer[] {
  const players: StorePlayer[] = [];
  for (const game of games) {
    for (const player of Array.isArray(game.players) ? game.players : []) {
      const normalized = normalizeStorePlayer(player);
      if (normalized) players.push(normalized);
    }
  }
  return players;
}

function normalizePayload(payload: AutoBackupHybridPayload | null): AutoBackupHybridPayload | null {
  if (!payload || payload.format !== 'moonrakers-hybrid') return null;

  const players = (Array.isArray(payload.players) ? payload.players : [])
    .map((player) => normalizeStorePlayer(player))
    .filter((player): player is StorePlayer => Boolean(player));

  const groups = (Array.isArray(payload.groups) ? payload.groups : []).map((group) => ({
    ...group,
    id: normalizeName(group?.id),
    name: normalizeName(group?.name),
    playerIds: (Array.isArray(group?.playerIds) ? group.playerIds : []).map((id) => normalizeName(id)).filter(Boolean),
    createdAt: asNumber(group?.createdAt) || Date.now(),
    objectiveStatsEligible: Boolean(group?.objectiveStatsEligible),
  })).filter((group) => group.id && group.name);

  const games = (Array.isArray(payload.games) ? payload.games : [])
    .map((game) => normalizeGameShape(game))
    .filter((game): game is StoreGame => Boolean(game));

  const csvRows = Array.isArray(payload.csvRows) ? payload.csvRows : [];
  const csvText = typeof payload.csvText === 'string' ? payload.csvText : Papa.unparse(csvRows);

  return {
    version: 2,
    format: 'moonrakers-hybrid',
    exportedAt: asNumber(payload.exportedAt) || Date.now(),
    players,
    groups,
    games,
    csvRows,
    csvText,
  };
}

export async function restoreFromAutoBackup(useStoreHook: any): Promise<{
  restored: boolean;
  count: number;
}> {
  try {
    const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!baseDir) {
      return { restored: false, count: 0 };
    }

    const hybridUri = `${baseDir}${AUTO_BACKUP_JSON_FILE}`;
    const hybridInfo = await FileSystem.getInfoAsync(hybridUri);

    if (hybridInfo.exists) {
      const text = await FileSystem.readAsStringAsync(hybridUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const payload = normalizePayload(parseLooseJson<AutoBackupHybridPayload | null>(text, null));
      if (payload) {
        const currentState = useStoreHook.getState();
        const incomingPlayers = [...payload.players, ...collectPlayersFromGames(payload.games)];
        const { players, idMap } = buildCanonicalPlayers(
          Array.isArray(currentState.players) ? currentState.players : [],
          incomingPlayers
        );

        const groups = mergeGroupArrays(
          remapGroups(Array.isArray(currentState.groups) ? currentState.groups : [], idMap),
          remapGroups(payload.groups, idMap)
        );

        const games = mergeGameArrays(
          (Array.isArray(currentState.games) ? currentState.games : []).map((game) => remapGame(normalizeGameShape(game) ?? game, idMap)),
          payload.games.map((game) => remapGame(game, idMap))
        );

        if (typeof currentState.setPlayers === 'function') {
          currentState.setPlayers(players);
        } else {
          useStoreHook.setState({ players });
        }

        if (typeof currentState.setGroups === 'function') {
          currentState.setGroups(groups);
        } else {
          useStoreHook.setState({ groups });
        }

        const latestState = useStoreHook.getState();
        if (typeof latestState.setGames === 'function') {
          latestState.setGames(games);
        } else if (typeof latestState.mergeImportedGames === 'function') {
          latestState.mergeImportedGames(games);
        } else {
          useStoreHook.setState({ games });
        }

        return {
          restored: true,
          count: payload.games.length,
        };
      }
    }

    const legacyCsvUri = `${baseDir}${LEGACY_AUTO_BACKUP_CSV_FILE}`;
    const legacyCsvInfo = await FileSystem.getInfoAsync(legacyCsvUri);
    if (!legacyCsvInfo.exists) {
      return { restored: false, count: 0 };
    }

    const legacyCsvText = await FileSystem.readAsStringAsync(legacyCsvUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = Papa.parse<HybridCsvRow>(legacyCsvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    if (!rows.length) {
      return { restored: false, count: 0 };
    }

    const nextState = parseCsvRows(rows, useStoreHook.getState());

    const currentState = useStoreHook.getState();
    if (typeof currentState.setPlayers === 'function') {
      currentState.setPlayers(nextState.players);
    } else {
      useStoreHook.setState({ players: nextState.players });
    }

    if (typeof currentState.setGroups === 'function') {
      currentState.setGroups(nextState.groups);
    } else {
      useStoreHook.setState({ groups: nextState.groups });
    }

    const latestState = useStoreHook.getState();
    if (typeof latestState.setGames === 'function') {
      latestState.setGames(nextState.games);
    } else if (typeof latestState.mergeImportedGames === 'function') {
      latestState.mergeImportedGames(nextState.games);
    } else {
      useStoreHook.setState({ games: nextState.games });
    }

    return {
      restored: true,
      count: nextState.games.length,
    };
  } catch (error) {
    console.error('restoreFromAutoBackup failed:', error);
    return { restored: false, count: 0 };
  }
}
