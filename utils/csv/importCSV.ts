import {
  buildPlayerMetrics,
  type SourcePlayerLike,
} from '@/components/charts/core/metricSchema';

export type SourceGroupLike = {
  id?: string;
  name?: string;
  color?: string;
  members?: string[];
  playerIds?: string[];
  score?: number;
  totalPrestige?: number;
  createdAt?: number;
  [key: string]: unknown;
};

export type ImportedBackup = {
  players: SourcePlayerLike[];
  groups: SourceGroupLike[];
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry)).filter(Boolean);
        }
      } catch {
        // fall through to comma-split
      }
    }

    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePlayer(raw: any): SourcePlayerLike {
  const player: SourcePlayerLike = {
    id: raw?.id,
    name: raw?.name,
    initials: raw?.initials,
    color: raw?.color,
    score: toNumberOrUndefined(raw?.score),
    totalPrestige: toNumberOrUndefined(raw?.totalPrestige),
    prestige: toNumberOrUndefined(raw?.prestige),
    directPrestige: toNumberOrUndefined(raw?.directPrestige),
    assistPrestigeReceived: toNumberOrUndefined(raw?.assistPrestigeReceived),
    assists: toNumberOrUndefined(raw?.assists),
    contracts: toNumberOrUndefined(raw?.contracts),
    failures: toNumberOrUndefined(raw?.failures),
    turnsAtBase: toNumberOrUndefined(raw?.turnsAtBase),
    turns: toNumberOrUndefined(raw?.turns),
    turnsPlayed: toNumberOrUndefined(raw?.turnsPlayed),
    roundsPlayed: toNumberOrUndefined(raw?.roundsPlayed),
    totalTurns: toNumberOrUndefined(raw?.totalTurns),
  };

  return {
    ...player,
    metrics: buildPlayerMetrics(player),
  };
}

function normalizeGroup(raw: any): SourceGroupLike {
  const members = toStringArray(raw?.members);
  const playerIds = toStringArray(raw?.playerIds);

  return {
    ...raw,
    id: raw?.id,
    name: raw?.name,
    color: raw?.color,
    members,
    playerIds: playerIds.length > 0 ? playerIds : members,
    score: toNumberOrUndefined(raw?.score),
    totalPrestige: toNumberOrUndefined(raw?.totalPrestige),
    createdAt: toNumberOrUndefined(raw?.createdAt),
  };
}

export function importPlayersCsv(csvText: string): SourcePlayerLike[] {
  if (typeof csvText !== 'string') {
    throw new Error(
      'CSV import expected text content but received a non-string value.'
    );
  }

  const trimmed = csvText.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const raw = headers.reduce<Record<string, string>>(
      (accumulator, header, index) => {
        accumulator[header] = cells[index] ?? '';
        return accumulator;
      },
      {}
    );

    return normalizePlayer(raw);
  });
}

export function importBackupJson(jsonText: string): ImportedBackup {
  if (typeof jsonText !== 'string') {
    throw new Error(
      'JSON import expected text content but received a non-string value.'
    );
  }

  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { players: [], groups: [] };
  }

  let parsed: any;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('The selected JSON backup is not valid JSON.');
  }

  const playersRaw = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.players)
      ? parsed.players
      : Array.isArray(parsed?.data?.players)
        ? parsed.data.players
        : [];

  const groupsRaw = Array.isArray(parsed?.groups)
    ? parsed.groups
    : Array.isArray(parsed?.data?.groups)
      ? parsed.data.groups
      : [];

  return {
    players: playersRaw.map((player) => normalizePlayer(player)),
    groups: groupsRaw.map((group) => normalizeGroup(group)),
  };
}

export function importBackupText(
  text: string,
  fileName?: string
): ImportedBackup {
  if (typeof text !== 'string') {
    throw new Error('Import failed: file contents were not loaded as text.');
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { players: [], groups: [] };
  }

  const lowerName = (fileName ?? '').toLowerCase();

  if (lowerName.endsWith('.json')) {
    return importBackupJson(trimmed);
  }

  if (lowerName.endsWith('.csv')) {
    return {
      players: importPlayersCsv(trimmed),
      groups: [],
    };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return importBackupJson(trimmed);
  }

  return {
    players: importPlayersCsv(trimmed),
    groups: [],
  };
}

export function importAndMergeBackup(
  existingPlayers: SourcePlayerLike[] = [],
  existingGroups: SourceGroupLike[] = [],
  importedText: string,
  fileName?: string
): ImportedBackup {
  const imported = importBackupText(importedText, fileName);

  const playerMap = new Map<string, SourcePlayerLike>();
  const groupMap = new Map<string, SourceGroupLike>();

  const safeExistingPlayers = Array.isArray(existingPlayers)
    ? existingPlayers
    : [];
  const safeExistingGroups = Array.isArray(existingGroups)
    ? existingGroups
    : [];

  for (const player of safeExistingPlayers) {
    const key = String(player?.id ?? player?.name ?? '');
    if (!key) continue;

    playerMap.set(key, {
      ...player,
      metrics: buildPlayerMetrics(player),
    });
  }

  for (const importedPlayer of imported.players) {
    const key = String(importedPlayer?.id ?? importedPlayer?.name ?? '');
    if (!key) continue;

    const existing = playerMap.get(key);
    const merged = {
      ...(existing ?? {}),
      ...importedPlayer,
    };

    playerMap.set(key, {
      ...merged,
      metrics: buildPlayerMetrics(merged),
    });
  }

  for (const group of safeExistingGroups) {
    const key = String(group?.id ?? group?.name ?? '');
    if (!key) continue;
    groupMap.set(key, group);
  }

  for (const importedGroup of imported.groups) {
    const key = String(importedGroup?.id ?? importedGroup?.name ?? '');
    if (!key) continue;

    const existing = groupMap.get(key);

    const mergedMembers =
      importedGroup.members?.length
        ? importedGroup.members
        : existing?.members?.length
          ? existing.members
          : [];

    const mergedPlayerIds =
      importedGroup.playerIds?.length
        ? importedGroup.playerIds
        : existing?.playerIds?.length
          ? existing.playerIds
          : mergedMembers;

    groupMap.set(key, {
      ...(existing ?? {}),
      ...importedGroup,
      members: mergedMembers,
      playerIds: mergedPlayerIds,
    });
  }

  return {
    players: Array.from(playerMap.values()),
    groups: Array.from(groupMap.values()),
  };
}