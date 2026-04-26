export type HeatmapMode =
  | 'raw'
  | 'relativeToLobby'
  | 'relativeToPlayerAverage'
  | 'rank'
  | 'swing';

export type MatrixCell = {
  round: number;
  rawValue: number;
  displayValue: number;
  fill: string;
  intensity: number;
  text?: string;
  textColor?: string;
};

export type MatrixSummary = {
  average: number;
  peak: number;
  latest: number;
  consistency: number;
};

export type MatrixRow = {
  id: string;
  name?: string;
  label?: string;
  shortLabel?: string;
  colorValue?: string;
  color?: string;
  averageRaw?: number;
  peakRaw?: number;
  latestRaw?: number;
  summary?: MatrixSummary;
  cells: MatrixCell[];
};

export type ResolvedHeatmapGridRow = {
  id: string;
  name: string;
  colorValue: string;
  averageRaw: number;
  peakRaw: number;
  latestRaw: number;
  cells: MatrixCell[];
};

export type SelectedCell = {
  playerId: string;
  playerName: string;
  round: number;
  rawValue: number;
  displayValue: number;
  color: string;
  mode: HeatmapMode;
  text?: string;
};

export const HEATMAP_LAYOUT = {
  NAME_W: 112,
  SUMMARY_W: 156,
  CELL_W: 44,
  CELL_H: 34,
  HEADER_H: 34,
  PAD: 12,
} as const;

export function formatDisplayValue(value: number, mode: HeatmapMode): string {
  if (mode === 'rank') return `${Math.round(value)}`;
  if (Math.abs(value) >= 100) return `${value > 0 && mode !== 'raw' ? '+' : ''}${value.toFixed(0)}`;
  return `${value > 0 && mode !== 'raw' ? '+' : ''}${value.toFixed(1)}`;
}

export function getCellTextColor(intensity: number): string {
  return intensity > 0.58 ? '#ffffff' : '#dbe7ff';
}

export function truncateLabel(value: string, max = 14): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function resolveHeatmapGridRow(
  row: MatrixRow | null | undefined,
  fallbackColor: string,
  fallbackId = 'row'
): ResolvedHeatmapGridRow {
  const summary = row?.summary;

  return {
    id: safeText(row?.id) || fallbackId,
    name:
      safeText(row?.name) ||
      safeText(row?.label) ||
      safeText(row?.shortLabel) ||
      'Unknown',
    colorValue: safeText(row?.colorValue) || safeText(row?.color) || fallbackColor,
    averageRaw: safeNumber(row?.averageRaw, safeNumber(summary?.average, 0)),
    peakRaw: safeNumber(row?.peakRaw, safeNumber(summary?.peak, 0)),
    latestRaw: safeNumber(row?.latestRaw, safeNumber(summary?.latest, 0)),
    cells: Array.isArray(row?.cells) ? row.cells : [],
  };
}
