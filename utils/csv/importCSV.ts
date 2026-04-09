import {
  buildPlayerMetrics,
  type SourcePlayerLike,
} from '@/utils/playerMetrics';
import { normalizeGameWithComputedTotals } from '@/utils/gameTotals';
import {
  pickUniqueCardArtIndexForColor,
  isValidPlayerCardArtIndex,
} from '@/utils/playerCards';

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
  games: any[];
  meta?: Record<string, unknown>;
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

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function normalizeText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function normalizeLooseName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ');
}

function ensureArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function ensureObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry ?? '').trim()).filter(Boolean);
        }
      } catch {}
    }

    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeAssistMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [String(k).trim(), toNumber(v)])
      .filter(([k]) => Boolean(k))
  );
}

function getSingleInitialFromName(name?: unknown): string {
  const safe = typeof name === 'string' ? name.trim() : '';
  if (!safe) return '?';
  return safe.charAt(0).toUpperCase() || '?';
}

function fallbackCardArtIndexFromStableKey(key?: unknown): number {
  const text = String(key ?? '').trim();
  if (!text) return 0;

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash % 30;
}

function pickColorMatchedCardArtIndex(
  color: unknown,
  stableKey: unknown,
  usedArtIndices: Set<number>
): number {
  const preferred = pickUniqueCardArtIndexForColor(
    typeof color === 'string' ? color : undefined,
    usedArtIndices
  );

  const finalIndex =
    typeof preferred === 'number' && Number.isFinite(preferred)
      ? preferred
      : fallbackCardArtIndexFromStableKey(stableKey);

  usedArtIndices.add(finalIndex);
  return finalIndex;
}

function normalizePlayer(
  raw: any,
  usedArtIndices: Set<number> = new Set()
): SourcePlayerLike {
  const source = ensureObject(raw);

  const id = normalizeId(source.id);
  const name = normalizeText(source.name) ?? 'Unknown Player';
  const color = normalizeText(source.color);

  const initials =
    typeof source.initials === 'string' && source.initials.trim()
      ? source.initials.trim().charAt(0).toUpperCase()
      : getSingleInitialFromName(name);

  const assignedCardArtIndex = pickColorMatchedCardArtIndex(
    color,
    id ?? name,
    usedArtIndices
  );

  const player: SourcePlayerLike = {
    id,
    name,
    initials,
    color,
    score: toNumberOrUndefined(source.score),
    totalPrestige: toNumberOrUndefined(source.totalPrestige ?? source.prestige),
    prestige: toNumberOrUndefined(source.prestige),
    objectivePrestige: toNumberOrUndefined(source.objectivePrestige),
    directPrestige: toNumberOrUndefined(source.directPrestige),
    assistPrestigeReceived: toNumberOrUndefined(
      source.assistPrestigeReceived ?? source.assistedPrestige
    ),
    assists: toNumberOrUndefined(source.assists),
    contracts: toNumberOrUndefined(source.contracts),
    failures: toNumberOrUndefined(source.failures),
    turnsAtBase: toNumberOrUndefined(source.turnsAtBase),
    turns: toNumberOrUndefined(source.turns),
    turnsPlayed: toNumberOrUndefined(source.turnsPlayed),
    roundsPlayed: toNumberOrUndefined(source.roundsPlayed),
    totalTurns: toNumberOrUndefined(source.totalTurns),
  };

  return {
    ...source,
    ...player,
    id,
    name,
    initials,
    color,
    assignedCardArtIndex,
    artIndex: assignedCardArtIndex,
    metrics: buildPlayerMetrics(player),
  };
}

function normalizeRound(raw: any) {
  const playerId = normalizeId(raw?.playerId);
  if (!playerId) return null;

  const objectiveCount = Math.max(
    0,
    Math.floor(toNumber(raw?.objectiveCount ?? raw?.objectivePrestige))
  );

  return {
    id:
      normalizeId(raw?.id) ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    prestige: toNumber(raw?.prestige ?? raw?.directPrestige),
    contracts: toNumber(raw?.contracts),
    failures: toNumber(raw?.failures),
    assistRecipients: normalizeAssistMap(raw?.assistRecipients),
    assistPrestigeRecipients: normalizeAssistMap(raw?.assistPrestigeRecipients),
    objectiveCount,
    objectivePrestige: objectiveCount,
    createdAt: toNumber(raw?.createdAt) || Date.now(),
  };
}

function parseRoundArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(normalizeRound).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(normalizeRound).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseTurnByTurnData(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((row) =>
        normalizeRound({
          id: row?.id,
          playerId: row?.playerId,
          prestige: row?.directPrestige ?? row?.prestige,
          contracts: row?.contracts,
          failures: row?.failures,
          objectiveCount: row?.objectiveCount ?? row?.objectivePrestige,
          objectivePrestige: row?.objectivePrestige ?? row?.objectiveCount,
          assistRecipients: row?.assistRecipients,
          assistPrestigeRecipients:
            row?.assistPrestigeRecipients ?? row?.assistPrestigeByRecipient,
          createdAt: row?.createdAt,
        })
      )
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseTurnByTurnData(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeGroup(raw: any): SourceGroupLike {
  const source = ensureObject(raw);
  const members = toStringArray(source.members);
  const playerIds = toStringArray(source.playerIds);

  return {
    ...source,
    id: normalizeId(source.id),
    name: normalizeText(source.name),
    color: normalizeText(source.color),
    members,
    playerIds: playerIds.length > 0 ? playerIds : members,
    score: toNumberOrUndefined(source.score),
    totalPrestige: toNumberOrUndefined(source.totalPrestige),
    createdAt: toNumberOrUndefined(source.createdAt),
  };
}

function normalizeRawTotals(rawTotals: unknown): Record<string, any> {
  const totals = ensureObject(rawTotals);

  return Object.fromEntries(
    Object.entries(totals)
      .map(([playerId, raw]) => {
        const t = ensureObject(raw);
        const objectiveCount = Math.max(
          0,
          Math.floor(toNumber(t.objectiveCount ?? t.objectivePrestige))
        );

        const totalPrestige =
          toNumber(t.totalPrestige ?? t.prestige) ||
          toNumber(t.directPrestige) +
            toNumber(t.assistPrestigeReceived ?? t.assistedPrestige) +
            objectiveCount;

        const assistMap =
          normalizeAssistMap(t.assistPrestigeBySource);

        return [
          String(playerId).trim(),
          {
            ...t,
            prestige: totalPrestige,
            totalPrestige,
            directPrestige: toNumber(t.directPrestige),
            assistPrestigeReceived: toNumber(
              t.assistPrestigeReceived ?? t.assistedPrestige
            ),
            assistPrestigeSent: toNumber(t.assistPrestigeSent),
            objectiveCount,
            objectivePrestige: objectiveCount,
            score: toNumber(t.score),
            assists: toNumber(t.assists),
            contracts: toNumber(t.contracts),
            failures: toNumber(t.failures),
            performance: toNumber(t.performance),
            efficiency: toNumber(t.efficiency),
            assistedEfficiency: toNumber(t.assistedEfficiency),
            directEfficiency: toNumber(t.directEfficiency),
            assistPrestigeBySource: assistMap,
            assistPrestigeByPlayer: assistMap,
            assistPrestigeFromPlayers: assistMap,
            assistSources: assistMap,
          },
        ];
      })
      .filter(([playerId]) => Boolean(playerId))
  );
}

function normalizeImportedGame(raw: any) {
  const source = ensureObject(raw);

  const players = ensureArray(source.players)
    .map((player: any, index: number) => ({
      ...player,
      id: normalizeId(player?.id ?? player?.playerId),
      name: normalizeText(player?.name ?? player?.playerName) ?? 'Unknown Player',
      initials:
        typeof player?.initials === 'string' && player.initials.trim()
          ? player.initials.trim().charAt(0).toUpperCase()
          : getSingleInitialFromName(player?.name ?? player?.playerName),
      color: normalizeText(player?.color),
      assignedCardArtIndex: isValidPlayerCardArtIndex(player?.assignedCardArtIndex)
        ? player.assignedCardArtIndex
        : undefined,
      artIndex: isValidPlayerCardArtIndex(player?.artIndex)
        ? player.artIndex
        : undefined,
      startOrder:
        typeof player?.startOrder === 'number' && Number.isFinite(player.startOrder)
          ? player.startOrder
          : index,
    }))
    .filter((player: any) => player.id);

  const rounds = parseRoundArray(source.rounds);
  const timeline = parseRoundArray(source.timeline);
  const turnByTurnRounds = parseTurnByTurnData(source.turnByTurnData);
  const totals = normalizeRawTotals(source.totals);

  const finalRounds =
    rounds.length > 0 ? rounds : timeline.length > 0 ? timeline : turnByTurnRounds;

  const normalized = normalizeGameWithComputedTotals({
    ...source,
    id:
      normalizeId(source.id) ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    players,
    totals,
    rounds: finalRounds,
    timeline: timeline.length ? timeline : finalRounds,
    roundCount:
      typeof source.roundCount === 'number' && Number.isFinite(source.roundCount)
        ? source.roundCount
        : finalRounds.length || timeline.length || turnByTurnRounds.length,
    winnerId: normalizeId(source.winnerId ?? source.winner),
    selectedWinnerId: normalizeId(source.selectedWinnerId),
    manualWinnerId: normalizeId(source.manualWinnerId),
    groupId: normalizeId(source.groupId),
    groupName: normalizeText(source.groupName),
    createdAt: toNumber(source.createdAt) || Date.now(),
    objectiveStatsEligible: source.objectiveStatsEligible === true,
  });

  const normalizedRounds = ensureArray(normalized.rounds);
  const normalizedTimeline = ensureArray(normalized.timeline).length
    ? ensureArray(normalized.timeline)
    : normalizedRounds;

  return {
    ...normalized,
    winnerId:
      normalizeId(source.winnerId ?? source.winner) ??
      normalizeId(normalized.winnerId) ??
      undefined,
    selectedWinnerId:
      normalizeId(source.selectedWinnerId) ??
      normalizeId(source.winnerId ?? source.winner) ??
      normalizeId(normalized.selectedWinnerId) ??
      normalizeId(normalized.winnerId) ??
      undefined,
    manualWinnerId:
      normalizeId(source.manualWinnerId) ??
      normalizeId(normalized.manualWinnerId) ??
      undefined,
    rounds: normalizedRounds,
    timeline: normalizedTimeline,
    roundCount:
      typeof normalized.roundCount === 'number' && Number.isFinite(normalized.roundCount)
        ? normalized.roundCount
        : normalizedRounds.length || normalizedTimeline.length,
  };
}

function mergeTotals(a: any = {}, b: any = {}) {
  const objectiveCount =
    Object.prototype.hasOwnProperty.call(b, 'objectiveCount') ||
    Object.prototype.hasOwnProperty.call(b, 'objectivePrestige')
      ? Math.max(0, Math.floor(toNumber(b.objectiveCount ?? b.objectivePrestige)))
      : Math.max(0, Math.floor(toNumber(a.objectiveCount ?? a.objectivePrestige)));

  const directPrestige =
    Object.prototype.hasOwnProperty.call(b, 'directPrestige')
      ? toNumber(b.directPrestige)
      : toNumber(a.directPrestige);

  const assistPrestigeReceived =
    Object.prototype.hasOwnProperty.call(b, 'assistPrestigeReceived')
      ? toNumber(b.assistPrestigeReceived)
      : toNumber(a.assistPrestigeReceived);

  const assistPrestigeSent =
    Object.prototype.hasOwnProperty.call(b, 'assistPrestigeSent')
      ? toNumber(b.assistPrestigeSent)
      : toNumber(a.assistPrestigeSent);

  const totalPrestige =
    Object.prototype.hasOwnProperty.call(b, 'totalPrestige') ||
    Object.prototype.hasOwnProperty.call(b, 'prestige')
      ? toNumber(b.totalPrestige ?? b.prestige)
      : Object.prototype.hasOwnProperty.call(a, 'totalPrestige') ||
        Object.prototype.hasOwnProperty.call(a, 'prestige')
        ? toNumber(a.totalPrestige ?? a.prestige)
        : directPrestige + assistPrestigeReceived + objectiveCount;

  const assistMap = {
    ...normalizeAssistMap(a.assistPrestigeBySource),
    ...normalizeAssistMap(b.assistPrestigeBySource),
  };

  return {
    ...a,
    ...b,
    prestige: totalPrestige,
    totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent,
    objectiveCount,
    objectivePrestige: objectiveCount,
    score: Object.prototype.hasOwnProperty.call(b, 'score') ? toNumber(b.score) : toNumber(a.score),
    assists: Object.prototype.hasOwnProperty.call(b, 'assists') ? toNumber(b.assists) : toNumber(a.assists),
    contracts: Object.prototype.hasOwnProperty.call(b, 'contracts') ? toNumber(b.contracts) : toNumber(a.contracts),
    failures: Object.prototype.hasOwnProperty.call(b, 'failures') ? toNumber(b.failures) : toNumber(a.failures),
    performance: Object.prototype.hasOwnProperty.call(b, 'performance') ? toNumber(b.performance) : toNumber(a.performance),
    efficiency: Object.prototype.hasOwnProperty.call(b, 'efficiency') ? toNumber(b.efficiency) : toNumber(a.efficiency),
    assistedEfficiency: Object.prototype.hasOwnProperty.call(b, 'assistedEfficiency') ? toNumber(b.assistedEfficiency) : toNumber(a.assistedEfficiency),
    directEfficiency: Object.prototype.hasOwnProperty.call(b, 'directEfficiency') ? toNumber(b.directEfficiency) : toNumber(a.directEfficiency),
    assistPrestigeBySource: assistMap,
    assistPrestigeByPlayer: assistMap,
    assistPrestigeFromPlayers: assistMap,
    assistSources: assistMap,
  };
}

function buildExistingPlayerIndexes(existingPlayers: SourcePlayerLike[]) {
  const byId = new Map<string, SourcePlayerLike>();
  const byName = new Map<string, SourcePlayerLike>();

  for (const player of existingPlayers) {
    const id = normalizeId((player as any)?.id);
    const nameKey = normalizeLooseName((player as any)?.name);
    if (id) byId.set(id, player);
    if (nameKey) byName.set(nameKey, player);
  }

  return { byId, byName };
}

function findCanonicalPlayer(
  rawPlayer: any,
  indexes: ReturnType<typeof buildExistingPlayerIndexes>
): SourcePlayerLike | undefined {
  const rawId = normalizeId(rawPlayer?.id ?? rawPlayer?.playerId);
  if (rawId && indexes.byId.has(rawId)) {
    return indexes.byId.get(rawId);
  }

  const nameKey = normalizeLooseName(rawPlayer?.name ?? rawPlayer?.playerName);
  if (nameKey && indexes.byName.has(nameKey)) {
    return indexes.byName.get(nameKey);
  }

  return undefined;
}

function canonicalizeGameAgainstPlayers(
  game: any,
  mergedPlayers: SourcePlayerLike[]
) {
  const indexes = buildExistingPlayerIndexes(mergedPlayers);
  const source = ensureObject(game);
  const rawPlayers = ensureArray(source.players);
  const rawTotals = ensureObject(source.totals);
  const rawRounds = ensureArray(source.rounds);
  const rawTimeline = ensureArray(source.timeline);

  const idMap: Record<string, string> = {};

  for (const player of rawPlayers) {
    const rawId = normalizeId(player?.id ?? player?.playerId);
    const canonical = findCanonicalPlayer(player, indexes);
    if (rawId && canonical?.id) {
      idMap[rawId] = String(canonical.id);
    }
  }

  for (const rawId of Object.keys(rawTotals)) {
    const trimmed = String(rawId).trim();
    if (idMap[trimmed]) continue;

    const canonicalById = indexes.byId.get(trimmed);
    if (canonicalById?.id) {
      idMap[trimmed] = String(canonicalById.id);
      continue;
    }

    const entry = ensureObject(rawTotals[rawId]);
    const nameKey = normalizeLooseName(entry?.name ?? entry?.playerName);
    const canonicalByName = nameKey ? indexes.byName.get(nameKey) : undefined;
    if (canonicalByName?.id) {
      idMap[trimmed] = String(canonicalByName.id);
    }
  }

  const usedArtIndices = new Set<number>();
  const canonicalPlayers = rawPlayers
    .map((rawPlayer: any, index: number) => {
      const canonical = findCanonicalPlayer(rawPlayer, indexes);
      if (canonical?.id) {
        const canonicalId = String(canonical.id);
        const assigned =
          typeof (canonical as any)?.assignedCardArtIndex === 'number'
            ? (canonical as any).assignedCardArtIndex
            : pickColorMatchedCardArtIndex(
                canonical.color,
                canonicalId,
                usedArtIndices
              );

        usedArtIndices.add(assigned);

        return {
          ...rawPlayer,
          ...canonical,
          id: canonicalId,
          playerId: canonicalId,
          name: canonical.name ?? rawPlayer?.name ?? rawPlayer?.playerName ?? 'Unknown Player',
          initials:
            (canonical as any)?.initials ??
            getSingleInitialFromName(canonical.name ?? rawPlayer?.name),
          color: canonical.color ?? rawPlayer?.color,
          assignedCardArtIndex: assigned,
          artIndex: assigned,
          startOrder:
            typeof rawPlayer?.startOrder === 'number' && Number.isFinite(rawPlayer.startOrder)
              ? rawPlayer.startOrder
              : index,
        };
      }

      const id =
        normalizeId(rawPlayer?.id ?? rawPlayer?.playerId) ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const name =
        normalizeText(rawPlayer?.name ?? rawPlayer?.playerName) ?? 'Unknown Player';
      const color = normalizeText(rawPlayer?.color);
      const assigned = pickColorMatchedCardArtIndex(color, id, usedArtIndices);

      return {
        ...rawPlayer,
        id,
        playerId: id,
        name,
        initials:
          typeof rawPlayer?.initials === 'string' && rawPlayer.initials.trim()
            ? rawPlayer.initials.trim().charAt(0).toUpperCase()
            : getSingleInitialFromName(name),
        color,
        assignedCardArtIndex: assigned,
        artIndex: assigned,
        startOrder:
          typeof rawPlayer?.startOrder === 'number' && Number.isFinite(rawPlayer.startOrder)
            ? rawPlayer.startOrder
            : index,
      };
    })
    .filter((player) => Boolean(player?.id));

  const canonicalTotals: Record<string, any> = {};
  for (const [rawId, rawEntry] of Object.entries(rawTotals)) {
    const canonicalId = idMap[String(rawId).trim()] ?? String(rawId).trim();
    if (!canonicalId) continue;

    const entry = ensureObject(rawEntry);
    const remappedAssist = Object.fromEntries(
      Object.entries(normalizeAssistMap(entry.assistPrestigeBySource)).map(([sourceId, value]) => [
        idMap[sourceId] ?? sourceId,
        value,
      ])
    );

    canonicalTotals[canonicalId] = mergeTotals(canonicalTotals[canonicalId], {
      ...entry,
      assistPrestigeBySource: remappedAssist,
    });
  }

  const canonicalizeRoundPlayerIds = (rows: any[]) =>
    rows
      .map((row: any) => {
        const rawPlayerId = normalizeId(row?.playerId);
        if (!rawPlayerId) return null;
        return {
          ...row,
          playerId: idMap[rawPlayerId] ?? rawPlayerId,
          assistPrestigeRecipients: Object.fromEntries(
            Object.entries(normalizeAssistMap(row?.assistPrestigeRecipients)).map(
              ([targetId, value]) => [idMap[targetId] ?? targetId, value]
            )
          ),
          assistRecipients: Object.fromEntries(
            Object.entries(normalizeAssistMap(row?.assistRecipients)).map(
              ([targetId, value]) => [idMap[targetId] ?? targetId, value]
            )
          ),
        };
      })
      .filter(Boolean);

  const rounds = canonicalizeRoundPlayerIds(rawRounds);
  const timeline = canonicalizeRoundPlayerIds(rawTimeline.length ? rawTimeline : rawRounds);

  const winnerIdRaw =
    normalizeId(source.winnerId ?? source.selectedWinnerId ?? source.manualWinnerId) ??
    undefined;

  const canonicalized = normalizeGameWithComputedTotals({
    ...source,
    players: canonicalPlayers,
    totals: canonicalTotals,
    rounds,
    timeline,
    winnerId: winnerIdRaw ? idMap[winnerIdRaw] ?? winnerIdRaw : undefined,
    selectedWinnerId: normalizeId(source.selectedWinnerId)
      ? idMap[String(source.selectedWinnerId).trim()] ?? String(source.selectedWinnerId).trim()
      : undefined,
    manualWinnerId: normalizeId(source.manualWinnerId)
      ? idMap[String(source.manualWinnerId).trim()] ?? String(source.manualWinnerId).trim()
      : undefined,
  });

  const normalizedTotals = ensureObject(canonicalized.totals);
  for (const canonicalPlayer of canonicalPlayers) {
    const id = String(canonicalPlayer.id);
    const existing = ensureObject(normalizedTotals[id]);
    const assistMap = normalizeAssistMap(existing.assistPrestigeBySource);
    normalizedTotals[id] = {
      ...existing,
      assistPrestigeBySource: assistMap,
      assistPrestigeByPlayer: assistMap,
      assistPrestigeFromPlayers: assistMap,
      assistSources: assistMap,
    };
  }

  return {
    ...canonicalized,
    players: canonicalPlayers,
    totals: normalizedTotals,
    rounds: ensureArray(canonicalized.rounds),
    timeline: ensureArray(canonicalized.timeline).length
      ? ensureArray(canonicalized.timeline)
      : ensureArray(canonicalized.rounds),
    roundCount:
      typeof canonicalized.roundCount === 'number' && Number.isFinite(canonicalized.roundCount)
        ? canonicalized.roundCount
        : ensureArray(canonicalized.rounds).length,
  };
}

export function importPlayersCsv(csvText: string): SourcePlayerLike[] {
  if (typeof csvText !== 'string') {
    throw new Error('CSV import expected text content but received a non-string value.');
  }

  const trimmed = csvText.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const usedArtIndices = new Set<number>();

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const raw = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
    return normalizePlayer(raw, usedArtIndices);
  });
}

export function importBackupJson(jsonText: string): ImportedBackup {
  if (typeof jsonText !== 'string') {
    throw new Error('JSON import expected text content but received a non-string value.');
  }

  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { players: [], groups: [], games: [], meta: {} };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('The selected JSON backup is not valid JSON.');
  }

  const playersRaw = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.playerProfiles)
      ? parsed.playerProfiles
      : Array.isArray(parsed?.players)
        ? parsed.players
        : Array.isArray(parsed?.data?.playerProfiles)
          ? parsed.data.playerProfiles
          : Array.isArray(parsed?.data?.players)
            ? parsed.data.players
            : [];

  const groupsRaw = Array.isArray(parsed?.groupProfiles)
    ? parsed.groupProfiles
    : Array.isArray(parsed?.groups)
      ? parsed.groups
      : Array.isArray(parsed?.data?.groupProfiles)
        ? parsed.data.groupProfiles
        : Array.isArray(parsed?.data?.groups)
          ? parsed.data.groups
          : [];

  const gamesRaw = Array.isArray(parsed?.games)
    ? parsed.games
    : Array.isArray(parsed?.data?.games)
      ? parsed.data.games
      : [];

  const usedArtIndices = new Set<number>();

  return {
    players: playersRaw.map((player) => normalizePlayer(player, usedArtIndices)),
    groups: groupsRaw.map((group) => normalizeGroup(group)),
    games: gamesRaw.map((game) => normalizeImportedGame(game)),
    meta: ensureObject(parsed?.meta ?? parsed?.data?.meta),
  };
}

export function importBackupText(text: string, fileName?: string): ImportedBackup {
  if (typeof text !== 'string') {
    throw new Error('Import failed: file contents were not loaded as text.');
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { players: [], groups: [], games: [], meta: {} };
  }

  const lowerName = (fileName ?? '').toLowerCase();

  if (lowerName.endsWith('.json')) {
    return importBackupJson(trimmed);
  }

  if (lowerName.endsWith('.csv')) {
    return {
      players: importPlayersCsv(trimmed),
      groups: [],
      games: [],
      meta: {},
    };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return importBackupJson(trimmed);
  }

  return {
    players: importPlayersCsv(trimmed),
    groups: [],
    games: [],
    meta: {},
  };
}

function mergePlayers(
  existingPlayers: SourcePlayerLike[],
  importedPlayers: SourcePlayerLike[]
): SourcePlayerLike[] {
  const merged = [...(Array.isArray(existingPlayers) ? existingPlayers : [])];
  const indexes = buildExistingPlayerIndexes(merged);
  const usedArtIndices = new Set<number>(
    merged
      .map((player: any) =>
        typeof player?.assignedCardArtIndex === 'number'
          ? player.assignedCardArtIndex
          : typeof player?.artIndex === 'number'
            ? player.artIndex
            : null
      )
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  );

  for (const imported of importedPlayers) {
    const canonical = findCanonicalPlayer(imported, indexes);

    if (canonical) {
      const updated = normalizePlayer(
        {
          ...canonical,
          ...imported,
          id: canonical.id ?? imported.id,
          name: canonical.name ?? imported.name,
          color: canonical.color ?? imported.color,
        },
        usedArtIndices
      );

      const index = merged.findIndex(
        (player) => player === canonical || normalizeId((player as any)?.id) === normalizeId((canonical as any)?.id)
      );
      if (index >= 0) {
        merged[index] = {
          ...merged[index],
          ...updated,
          id: canonical.id ?? updated.id,
          name: canonical.name ?? updated.name,
          color: canonical.color ?? updated.color,
          assignedCardArtIndex:
            typeof updated.assignedCardArtIndex === 'number'
              ? updated.assignedCardArtIndex
              : (merged[index] as any)?.assignedCardArtIndex,
          artIndex:
            typeof updated.artIndex === 'number'
              ? updated.artIndex
              : (merged[index] as any)?.artIndex,
          metrics: buildPlayerMetrics(updated),
        };
      }
    } else {
      const normalized = normalizePlayer(imported, usedArtIndices);
      merged.push(normalized);
    }
  }

  return merged;
}

function mergeGroups(
  existingGroups: SourceGroupLike[],
  importedGroups: SourceGroupLike[],
  players: SourcePlayerLike[]
): SourceGroupLike[] {
  const playerIndexes = buildExistingPlayerIndexes(players);
  const merged = [...(Array.isArray(existingGroups) ? existingGroups : [])];
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();

  merged.forEach((group, index) => {
    const id = normalizeId(group.id);
    const nameKey = normalizeLooseName(group.name);
    if (id) byId.set(id, index);
    if (nameKey) byName.set(nameKey, index);
  });

  const canonicalizeMemberIds = (ids: string[]) =>
    ids
      .map((id) => {
        const trimmed = normalizeId(id);
        if (!trimmed) return undefined;
        const byIdPlayer = playerIndexes.byId.get(trimmed);
        if (byIdPlayer?.id) return String(byIdPlayer.id);
        return trimmed;
      })
      .filter((value): value is string => Boolean(value));

  for (const imported of importedGroups) {
    const normalized = normalizeGroup(imported);
    const canonicalIds = canonicalizeMemberIds(
      normalized.playerIds && normalized.playerIds.length
        ? normalized.playerIds
        : normalized.members ?? []
    );

    const keyId = normalizeId(normalized.id);
    const keyName = normalizeLooseName(normalized.name);
    const existingIndex =
      (keyId && byId.has(keyId) ? byId.get(keyId)! : undefined) ??
      (keyName && byName.has(keyName) ? byName.get(keyName)! : undefined);

    const finalGroup = {
      ...normalized,
      members: canonicalIds,
      playerIds: canonicalIds,
    };

    if (existingIndex !== undefined) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...finalGroup,
      };
    } else {
      merged.push(finalGroup);
      const newIndex = merged.length - 1;
      if (keyId) byId.set(keyId, newIndex);
      if (keyName) byName.set(keyName, newIndex);
    }
  }

  return merged;
}

function mergeGames(existingGames: any[], importedGames: any[], mergedPlayers: SourcePlayerLike[]) {
  const merged = [...(Array.isArray(existingGames) ? existingGames : [])];
  const byId = new Map<string, number>();

  merged.forEach((game, index) => {
    const id = normalizeId(game?.id);
    if (id) byId.set(id, index);
  });

  for (const imported of importedGames) {
    const canonical = canonicalizeGameAgainstPlayers(imported, mergedPlayers);
    const id = normalizeId(canonical?.id);
    if (id && byId.has(id)) {
      merged[byId.get(id)!] = canonical;
    } else {
      merged.push(canonical);
      if (id) byId.set(id, merged.length - 1);
    }
  }

  return merged;
}

export function importAndMergeBackup(
  existingPlayers: SourcePlayerLike[],
  existingGroups: SourceGroupLike[],
  text: string,
  fileName?: string,
  existingGames: any[] = []
): ImportedBackup {
  const imported = importBackupText(text, fileName);

  const mergedPlayers = mergePlayers(existingPlayers ?? [], imported.players ?? []);
  const mergedGroups = mergeGroups(existingGroups ?? [], imported.groups ?? [], mergedPlayers);
  const mergedGames = mergeGames(existingGames ?? [], imported.games ?? [], mergedPlayers);

  return {
    players: mergedPlayers,
    groups: mergedGroups,
    games: mergedGames,
    meta: imported.meta ?? {},
  };
}
