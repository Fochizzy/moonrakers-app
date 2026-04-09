import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  buildPlayerMetrics,
  type MetricKey,
  type SourcePlayerLike,
} from '@/utils/playerMetrics';
import {
  normalizeGameWithComputedTotals,
  getWinnerIdFromGame,
  getTotalPrestigeFromTotals,
} from '@/utils/gameTotals';

const CSV_COLUMNS: MetricKey[] = [
  'score',
  'totalPrestige',
  'directPrestige',
  'assistPrestigeReceived',
  'assists',
  'contracts',
  'failures',
  'turnsAtBase',
  'turns',
  'allContractsEfficiency',
  'assistEfficiency',
  'directEfficiency',
  'contractSuccessRate',
];

type ExportInput = {
  players: SourcePlayerLike[];
  groups?: unknown[];
  games?: unknown[];
  meta?: Record<string, unknown>;
};

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value ?? '');
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

export function buildPlayersCsv(players: SourcePlayerLike[]): string {
  const safePlayers = Array.isArray(players) ? players : [];
  const header = ['id', 'name', 'color', ...CSV_COLUMNS];

  const rows = safePlayers.map((player) => {
    const metrics = buildPlayerMetrics(player);

    return [
      (player as any)?.id ?? '',
      (player as any)?.name ?? '',
      (player as any)?.color ?? '',
      ...CSV_COLUMNS.map((column) => (metrics as any)?.[column] ?? 0),
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

function getAssistPrestigeSent(
  totalsEntry: Record<string, any>,
  allTotals: Record<string, any>,
  playerId: string
): number {
  if (
    typeof totalsEntry?.assistPrestigeSent === 'number' &&
    Number.isFinite(totalsEntry.assistPrestigeSent)
  ) {
    return totalsEntry.assistPrestigeSent;
  }

  let sent = 0;
  for (const [targetId, targetTotals] of Object.entries(allTotals || {})) {
    if (targetId === playerId) continue;
    const bySource =
      targetTotals &&
      typeof targetTotals === 'object' &&
      !Array.isArray(targetTotals) &&
      (targetTotals as any).assistPrestigeBySource &&
      typeof (targetTotals as any).assistPrestigeBySource === 'object' &&
      !Array.isArray((targetTotals as any).assistPrestigeBySource)
        ? (targetTotals as any).assistPrestigeBySource
        : {};

    sent += toNumber((bySource as any)[playerId]);
  }

  return sent;
}

function buildTurnByTurnData(game: any) {
  const timeline = asArray(game?.timeline).length
    ? asArray(game?.timeline)
    : asArray(game?.rounds);

  return timeline.map((round: any, index: number) => ({
    turnIndex: index + 1,
    id: normalizeId(round?.id),
    playerId: normalizeId(round?.playerId),
    directPrestige: toNumber(round?.prestige),
    contracts: toNumber(round?.contracts),
    failures: toNumber(round?.failures),
    objectiveCount: toNumber(round?.objectiveCount ?? round?.objectivePrestige),
    objectivePrestige: toNumber(
      round?.objectivePrestige ?? round?.objectiveCount
    ),
    assistRecipients:
      round?.assistRecipients &&
      typeof round.assistRecipients === 'object' &&
      !Array.isArray(round.assistRecipients)
        ? Object.fromEntries(
            Object.entries(round.assistRecipients).map(([k, v]) => [
              String(k),
              toNumber(v),
            ])
          )
        : {},
    assistPrestigeRecipients:
      round?.assistPrestigeRecipients &&
      typeof round.assistPrestigeRecipients === 'object' &&
      !Array.isArray(round.assistPrestigeRecipients)
        ? Object.fromEntries(
            Object.entries(round.assistPrestigeRecipients).map(([k, v]) => [
              String(k),
              toNumber(v),
            ])
          )
        : {},
    assistedPrestige: Object.values(
      round?.assistPrestigeRecipients &&
        typeof round.assistPrestigeRecipients === 'object' &&
        !Array.isArray(round.assistPrestigeRecipients)
        ? round.assistPrestigeRecipients
        : {}
    ).reduce((sum: number, value: any) => sum + toNumber(value), 0),
    createdAt: toNumber(round?.createdAt),
  }));
}

function normalizeExportGame(raw: any) {
  const game = normalizeGameWithComputedTotals(raw);
  const totals = asRecord(game?.totals);
  const rounds = asArray(game?.rounds);
  const timeline = asArray(game?.timeline).length
    ? asArray(game?.timeline)
    : rounds;
  const winnerId = normalizeId(getWinnerIdFromGame(game));

  const normalizedTotals = Object.fromEntries(
    Object.entries(totals).map(([playerId, t]) => {
      const entry = asRecord(t);
      const totalPrestige = toNumber(
        entry.totalPrestige ?? entry.prestige ?? getTotalPrestigeFromTotals(entry)
      );

      return [
        playerId,
        {
          score: toNumber(entry.score),
          prestige: totalPrestige,
          totalPrestige,
          directPrestige: toNumber(entry.directPrestige),
          assistPrestigeReceived: toNumber(entry.assistPrestigeReceived),
          assistPrestigeSent: getAssistPrestigeSent(entry, totals, playerId),
          assistedPrestige: toNumber(entry.assistPrestigeReceived),
          objectiveCount: toNumber(entry.objectiveCount ?? entry.objectivePrestige),
          objectivePrestige: toNumber(
            entry.objectivePrestige ?? entry.objectiveCount
          ),
          assists: toNumber(entry.assists),
          failures: toNumber(entry.failures),
          contracts: toNumber(entry.contracts),
          performance: toNumber(entry.performance),
          efficiency: toNumber(entry.efficiency),
          assistedEfficiency: toNumber(entry.assistedEfficiency),
          directEfficiency: toNumber(entry.directEfficiency),
          assistPrestigeBySource:
            entry.assistPrestigeBySource &&
            typeof entry.assistPrestigeBySource === 'object' &&
            !Array.isArray(entry.assistPrestigeBySource)
              ? Object.fromEntries(
                  Object.entries(entry.assistPrestigeBySource).map(([k, v]) => [
                    String(k),
                    toNumber(v),
                  ])
                )
              : {},
        },
      ];
    })
  );

  return {
    id: normalizeId(game?.id),
    createdAt: toNumber(game?.createdAt) || Date.now(),
    winnerId: winnerId ?? undefined,
    selectedWinnerId: normalizeId(game?.selectedWinnerId) ?? winnerId ?? undefined,
    manualWinnerId: normalizeId(game?.manualWinnerId) ?? undefined,
    winner: winnerId ?? undefined,
    groupId: normalizeId(game?.groupId) ?? undefined,
    groupName: typeof game?.groupName === 'string' ? game.groupName : undefined,
    objectiveStatsEligible: game?.objectiveStatsEligible === true,
    players: asArray(game?.players),
    totals: normalizedTotals,
    rounds,
    timeline,
    roundCount:
      typeof game?.roundCount === 'number' && Number.isFinite(game.roundCount)
        ? game.roundCount
        : rounds.length || timeline.length,
    turnOrder: buildTurnByTurnData({ rounds, timeline })
      .map((row) => row.playerId)
      .filter(Boolean),
    turnByTurnData: buildTurnByTurnData({ rounds, timeline }),
  };
}

export function buildHybridExportPayload(input: ExportInput) {
  const safePlayers = Array.isArray(input.players) ? input.players : [];
  const safeGroups = Array.isArray(input.groups) ? input.groups : [];
  const safeGames = Array.isArray(input.games) ? input.games : [];

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    meta: input.meta ?? {},
    players: safePlayers.map((player) => ({
      ...player,
      metrics: buildPlayerMetrics(player),
    })),
    groups: safeGroups,
    games: safeGames.map((game) => normalizeExportGame(game)),
  };
}

export async function exportGamesToCSV(
  input: ExportInput,
  fileName = 'MoonrakersBackup.json'
): Promise<string> {
  const writableDir =
    FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!writableDir) {
    throw new Error('No writable local directory is available.');
  }

  const trimmedName = String(fileName ?? '').trim();
  const normalizedFileName = trimmedName
    ? trimmedName.toLowerCase().endsWith('.json')
      ? trimmedName
      : `${trimmedName}.json`
    : 'MoonrakersBackup.json';

  const fileUri = `${writableDir}${normalizedFileName}`;
  const payload = buildHybridExportPayload(input);

  await FileSystem.writeAsStringAsync(
    fileUri,
    JSON.stringify(payload, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Choose where to export your backup',
      UTI: 'public.json',
    });
  }

  return fileUri;
}