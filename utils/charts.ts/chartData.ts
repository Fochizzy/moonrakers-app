type Totals = {
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
};

type Game = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, Totals>;
};

type BuildChartInput = {
  games?: Game[];
};

export type ChartPoint = {
  x: number;
  y: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(totals?: Totals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
}

/**
 * Builds a simple cumulative prestige-based progression series.
 * This is aligned to the current rules:
 * - primary metric = total prestige
 * - score is secondary
 */
export function buildChartData(
  playerId: string,
  input: BuildChartInput
): ChartPoint[] {
  const games = Array.isArray(input?.games) ? input.games : [];
  const data: ChartPoint[] = [];

  let runningTotalPrestige = 0;

  for (const game of games) {
    const totals = game?.totals?.[playerId];
    if (!totals) continue;

    runningTotalPrestige += getTotalPrestige(totals);
    data.push({ x: data.length + 1, y: runningTotalPrestige });
  }

  return data;
}
