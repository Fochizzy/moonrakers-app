import { chartColors } from '@/utils/chartTheme';

export const ELO_CHART_DIMENSIONS = {
  WIDTH: 340,
  HEIGHT: 282,
  PAD_L: 42,
  PAD_R: 16,
  PAD_T: 18,
  PAD_B: 36,
} as const;

export type EloSnapshotEntry = { elo?: number };
export type GamePlayer = { id?: string };

export type Game = {
  eloSnapshot?: Record<string, number | EloSnapshotEntry>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: GamePlayer[];
};

export type Player = {
  id: string;
  name?: string;
  color?: string;
};

export type EloMode =
  | 'elo'
  | 'eloDelta'
  | 'expectedVsActual'
  | 'performanceVsGap';

export type ModeOption = {
  key: EloMode;
  label: string;
  description: string;
};

export type StreakMarker = {
  index: number;
  actual: number;
  winStreak: number;
  lossStreak: number;
};

export type PlayerSeries = Player & {
  colorValue: string;
  eloValues: number[];
  eloDeltas: number[];
  expectedVsActual: number[];
  performanceVsGap: number[];
  streakMarkers: StreakMarker[];
  actualResults: number[];
  summary: {
    currentElo: number;
    peakElo: number;
    avgElo: number;
    hotStreaks: number;
  };
};

export type AnalyticsResult = {
  series: PlayerSeries[];
  maxValue: number;
  minValue: number;
};

export type ChartPoint = {
  x: number;
  y: number;
  value: number;
  index: number;
};

export type RenderSeries = PlayerSeries & {
  values: number[];
  points: ChartPoint[];
  path: string;
  isFocused: boolean;
  strokeWidth?: number;
  strokeOpacity?: number;
};

export const MODE_OPTIONS: ModeOption[] = [
  {
    key: 'elo',
    label: 'ELO',
    description: 'Raw rating progression over time.',
  },
  {
    key: 'eloDelta',
    label: 'ELO Δ',
    description: 'Game-by-game rating change.',
  },
  {
    key: 'expectedVsActual',
    label: 'Exp vs Act',
    description: 'Actual result minus expected result.',
  },
  {
    key: 'performanceVsGap',
    label: 'vs Gap',
    description: 'Result compared to the rating-gap expectation.',
  },
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function fallbackChartColorFromId(id: string): string {
  const palette = [
    chartColors.purple,
    chartColors.blue,
    chartColors.cyan,
    chartColors.green,
    chartColors.yellow,
    chartColors.orange,
    chartColors.red,
    chartColors.pink,
  ].filter(Boolean) as string[];

  if (!palette.length) return '#8B5CF6';

  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  return palette[hash % palette.length];
}

export function getPlayerColor(
  playerOrColor?: string | Player,
  players?: Player[]
): string {
  if (!playerOrColor) return chartColors.purple ?? '#8B5CF6';

  if (typeof playerOrColor === 'object') {
    if (
      typeof playerOrColor.color === 'string' &&
      playerOrColor.color.trim().length
    ) {
      return playerOrColor.color;
    }
    return fallbackChartColorFromId(String(playerOrColor.id ?? 'player'));
  }

  const directString = playerOrColor.trim();
  if (!directString) return chartColors.purple ?? '#8B5CF6';

  if (
    directString.startsWith('#') ||
    directString.startsWith('rgb') ||
    directString.startsWith('hsl')
  ) {
    return directString;
  }

  const matchedPlayer = players?.find((player) => player.id === directString);
  if (matchedPlayer?.color?.trim()) return matchedPlayer.color;

  return fallbackChartColorFromId(directString);
}

export function getEloValue(value: unknown): number {
  if (isFiniteNumber(value)) return value;

  if (
    value &&
    typeof value === 'object' &&
    'elo' in (value as Record<string, unknown>)
  ) {
    const elo = (value as Record<string, unknown>).elo;
    return isFiniteNumber(elo) ? elo : 0;
  }

  return 0;
}

export function average(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length
    ? clean.reduce((sum, value) => sum + value, 0) / clean.length
    : 0;
}

export function getWinnerId(game: Game): string | null {
  return game.manualWinnerId ?? game.selectedWinnerId ?? game.winnerId ?? null;
}

export function formatValue(value: number, mode: EloMode): string {
  switch (mode) {
    case 'elo':
      return value.toFixed(0);
    case 'eloDelta':
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
    case 'expectedVsActual':
    case 'performanceVsGap':
    default:
      return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
  }
}

export function getModeValues(series: PlayerSeries, mode: EloMode): number[] {
  switch (mode) {
    case 'elo':
      return series.eloValues;
    case 'eloDelta':
      return series.eloDeltas;
    case 'expectedVsActual':
      return series.expectedVsActual;
    case 'performanceVsGap':
    default:
      return series.performanceVsGap;
  }
}

export function getGameParticipants(game: Game, players: Player[]): Player[] {
  const ids = game.players
    ?.map((player) => player.id)
    .filter(Boolean) as string[] | undefined;

  if (!ids?.length) return players;
  return players.filter((player) => ids.includes(player.id));
}

export function getExpectedResultForPlayer(
  game: Game,
  playerId: string,
  players: Player[]
): number {
  const participants = getGameParticipants(game, players);

  const participantElos = participants
    .map((player) => ({
      id: player.id,
      elo: getEloValue(game.eloSnapshot?.[player.id]),
    }))
    .filter((entry) => Number.isFinite(entry.elo));

  const self = participantElos.find((entry) => entry.id === playerId);
  const opponents = participantElos.filter((entry) => entry.id !== playerId);

  if (!self || !opponents.length) return 0;

  const opponentAvg = average(opponents.map((entry) => entry.elo));
  return 1 / (1 + Math.pow(10, (opponentAvg - self.elo) / 400));
}

export function getPerformanceVsGap(
  game: Game,
  playerId: string,
  players: Player[],
  expectedVsActualValue: number
): number {
  const participants = getGameParticipants(game, players);

  const participantElos = participants
    .map((player) => ({
      id: player.id,
      elo: getEloValue(game.eloSnapshot?.[player.id]),
    }))
    .filter((entry) => Number.isFinite(entry.elo));

  const self = participantElos.find((entry) => entry.id === playerId);
  const opponents = participantElos.filter((entry) => entry.id !== playerId);

  if (!self || !opponents.length) return 0;

  const opponentAvg = average(opponents.map((entry) => entry.elo));
  const eloGap = self.elo - opponentAvg;

  return expectedVsActualValue - (eloGap / 100) * 0.1;
}

export function buildAnalytics(
  games: Game[],
  players: Player[],
  selectedMode: EloMode
): AnalyticsResult {
  if (!games.length || !players.length) {
    return { series: [], maxValue: 1, minValue: 0 };
  }

  const series: PlayerSeries[] = players.map((player) => {
    const eloValues = games.map((game) =>
      getEloValue(game.eloSnapshot?.[player.id])
    );

    const eloDeltas = eloValues.map((elo, index) =>
      index === 0 ? 0 : elo - eloValues[index - 1]
    );

    const expectedResults = games.map((game) =>
      getExpectedResultForPlayer(game, player.id, players)
    );

    const actualResults = games.map((game) =>
      getWinnerId(game) === player.id ? 1 : 0
    );

    const expectedVsActual = actualResults.map(
      (actual, index) => actual - expectedResults[index]
    );

    const performanceVsGap = games.map((game, index) =>
      getPerformanceVsGap(game, player.id, players, expectedVsActual[index])
    );

    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let hotStreaks = 0;

    const streakMarkers: StreakMarker[] = actualResults.map((actual, index) => {
      if (actual >= 1) {
        currentWinStreak += 1;
        currentLossStreak = 0;
      } else {
        currentLossStreak += 1;
        currentWinStreak = 0;
      }

      if (
        (eloDeltas[index] ?? 0) > 0 &&
        (eloDeltas[index - 1] ?? 0) > 0 &&
        (eloDeltas[index - 2] ?? 0) > 0
      ) {
        hotStreaks += 1;
      }

      return {
        index,
        actual,
        winStreak: currentWinStreak,
        lossStreak: currentLossStreak,
      };
    });

    const currentElo = eloValues[eloValues.length - 1] ?? 0;
    const peakElo = eloValues.length ? Math.max(...eloValues) : 0;
    const avgElo = average(eloValues);

    return {
      ...player,
      colorValue: getPlayerColor(player, players),
      eloValues,
      eloDeltas,
      expectedVsActual,
      performanceVsGap,
      streakMarkers,
      actualResults,
      summary: {
        currentElo,
        peakElo,
        avgElo,
        hotStreaks,
      },
    };
  });

  const allModeValues = series.flatMap((row) => getModeValues(row, selectedMode));

  return {
    series,
    maxValue: Math.max(1, ...allModeValues),
    minValue: Math.min(0, ...allModeValues),
  };
}

export function createSmoothPath(points: ChartPoint[]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}