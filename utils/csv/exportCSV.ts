import { File, Paths } from 'expo-file-system';
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

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
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
      player?.id ?? '',
      player?.name ?? '',
      player?.color ?? '',
      ...CSV_COLUMNS.map((column) => metrics[column] ?? 0),
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

function getAssistPrestigeSent(
  totalsEntry: Record<string, unknown>,
  allTotals: Record<string, unknown>,
  playerId: string
): number {
  if (
    typeof totalsEntry.assistPrestigeSent === 'number' &&
    Number.isFinite(totalsEntry.assistPrestigeSent)
  ) {
    return totalsEntry.assistPrestigeSent;
  }

  let sent = 0;
  for (const [targetId, targetTotals] of Object.entries(allTotals || {})) {
    if (targetId === playerId) continue;
    const bySource = asRecord(asRecord(targetTotals).assistPrestigeBySource);

    sent += toNumber(bySource[playerId]);
  }

  return sent;
}

function buildTurnByTurnData(game: unknown) {
  const source = asRecord(game);
  const timeline = asArray(source.timeline).length
    ? asArray(source.timeline)
    : asArray(source.rounds);

  return timeline.map((rawRound, index: number) => {
    const round = asRecord(rawRound);

    return {
      turnIndex: index + 1,
      id: normalizeId(round.id),
      playerId: normalizeId(round.playerId),
      directPrestige: toNumber(round.prestige),
      contracts: toNumber(round.contracts),
      failures: toNumber(round.failures),
      objectiveCount: toNumber(round.objectiveCount ?? round.objectivePrestige),
      objectivePrestige: toNumber(
        round.objectivePrestige ?? round.objectiveCount
      ),
      assistRecipients: Object.fromEntries(
        Object.entries(asRecord(round.assistRecipients)).map(([k, v]) => [
          String(k),
          toNumber(v),
        ])
      ),
      assistPrestigeRecipients: Object.fromEntries(
        Object.entries(asRecord(round.assistPrestigeRecipients)).map(
          ([k, v]) => [String(k), toNumber(v)]
        )
      ),
      assistedPrestige: Object.values(
        asRecord(round.assistPrestigeRecipients)
      ).reduce((sum: number, value) => sum + toNumber(value), 0),
      createdAt: toNumber(round.createdAt),
    };
  });
}

function normalizeExportGame(raw: unknown) {
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
          assistPrestigeBySource: Object.fromEntries(
            Object.entries(asRecord(entry.assistPrestigeBySource)).map(
              ([k, v]) => [String(k), toNumber(v)]
            )
          ),
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
  const trimmedName = String(fileName ?? '').trim();
  const normalizedFileName = trimmedName
    ? trimmedName.toLowerCase().endsWith('.json')
      ? trimmedName
      : `${trimmedName}.json`
    : 'MoonrakersBackup.json';

  const file = new File(Paths.cache, normalizedFileName);
  const payload = buildHybridExportPayload(input);

  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Choose where to export your backup',
      UTI: 'public.json',
    });
  }

  return file.uri;
}