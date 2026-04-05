import * as FileSystem from 'expo-file-system/legacy';
import {
  buildPlayerMetrics,
  type MetricKey,
  type SourcePlayerLike,
} from '@/components/charts/core/metricSchema';

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

export function buildPlayersCsv(players: SourcePlayerLike[]): string {
  const safePlayers = Array.isArray(players) ? players : [];
  const header = ['id', 'name', 'color', ...CSV_COLUMNS];

  const rows = safePlayers.map((player) => {
    const metrics = buildPlayerMetrics(player);

    return [
      player.id ?? '',
      player.name ?? '',
      player.color ?? '',
      ...CSV_COLUMNS.map((column) => metrics[column] ?? 0),
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

export function buildHybridExportPayload(input: {
  players: SourcePlayerLike[];
  groups?: unknown[];
  games?: unknown[];
  meta?: Record<string, unknown>;
}) {
  const safePlayers = Array.isArray(input.players) ? input.players : [];

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    meta: input.meta ?? {},
    players: safePlayers.map((player) => ({
      ...player,
      metrics: buildPlayerMetrics(player),
    })),
    groups: Array.isArray(input.groups) ? input.groups : [],
    games: Array.isArray(input.games) ? input.games : [],
  };
}

export async function exportGamesToCSV(
  input: {
    players: SourcePlayerLike[];
    groups?: unknown[];
    games?: unknown[];
    meta?: Record<string, unknown>;
  },
  fileName = 'MoonrakersBackup.json'
): Promise<string> {
  const writableDir =
    FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

  if (!writableDir) {
    throw new Error('No writable local directory is available.');
  }

  const trimmedName = fileName.trim();
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
    {
      encoding: FileSystem.EncodingType.UTF8,
    }
  );

  return fileUri;
}