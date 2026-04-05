export type ObjectiveAwareTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectiveCount?: number;
  objectivePrestige?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistCountBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

export type ObjectiveAwareGame = {
  objectiveStatsEligible?: boolean;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: Array<{ id: string; startOrder?: number }>;
};

export function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function getObjectiveCount(totals?: ObjectiveAwareTotals): number {
  return Math.max(
    0,
    Math.floor(toNumber(totals?.objectiveCount ?? totals?.objectivePrestige))
  );
}

export function getObjectivePrestige(totals?: ObjectiveAwareTotals): number {
  return getObjectiveCount(totals);
}

export function getTotalPrestige(totals?: ObjectiveAwareTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    toNumber(totals?.directPrestige) +
    toNumber(totals?.assistPrestigeReceived) +
    getObjectivePrestige(totals)
  );
}

export function isObjectiveTrackedGame(game?: ObjectiveAwareGame): boolean {
  return game?.objectiveStatsEligible === true;
}

export function getWinnerId(game?: ObjectiveAwareGame): string | undefined {
  return game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId;
}

export function getHumanSeat(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value + 1;
}

export function getPearsonCorrelation(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (const point of points) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  if (sumX === 0 || sumY === 0) return 0;
  return numerator / Math.sqrt(sumX * sumY);
}

export function buildObjectiveCorrelationPoint(
  totals: ObjectiveAwareTotals | undefined,
  game: ObjectiveAwareGame | undefined,
  playerId: string
): { x: number; y: number } | null {
  if (!isObjectiveTrackedGame(game)) return null;
  return {
    x: getObjectivePrestige(totals),
    y: getWinnerId(game) === playerId ? 1 : 0,
  };
}

export function buildSeatWinPoint(
  game: ObjectiveAwareGame | undefined,
  playerId: string,
  startOrder: unknown
): { x: number; y: number } | null {
  const seat = getHumanSeat(startOrder);
  if (seat === null) return null;

  return {
    x: seat,
    y: getWinnerId(game) === playerId ? 1 : 0,
  };
}
