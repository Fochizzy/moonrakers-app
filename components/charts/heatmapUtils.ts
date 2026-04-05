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
};

export type MatrixRow = {
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
