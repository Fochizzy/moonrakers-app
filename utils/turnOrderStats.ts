// utils/turnOrderStats.ts
type PlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type GamePlayer = {
  id: string;
  name?: string;
  startOrder?: number;
};

type Game = {
  id: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: GamePlayer[];
  totals?: Record<string, PlayerTotals>;
};

export type TurnOrderStatRow = {
  seat: number;
  label: string;
  games: number;
  wins: number;
  winRate: number;
  avgPrestige: number;
  avgScore: number;
};

export type TurnOrderByPlayerCount = {
  playerCount: number;
  rows: TurnOrderStatRow[];
};

function safeNum(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function ratio(wins: number, games: number): number {
  return games > 0 ? wins / games : 0;
}

function avg(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}

function getWinnerId(game: Game): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getTotalPrestige(totals?: PlayerTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    safeNum(totals?.directPrestige) +
    safeNum(totals?.assistPrestigeReceived) +
    safeNum(totals?.objectivePrestige)
  );
}

type Bucket = {
  games: number;
  wins: number;
  prestige: number;
  score: number;
};

function makeBucket(): Bucket {
  return {
    games: 0,
    wins: 0,
    prestige: 0,
    score: 0,
  };
}

function toRows(record: Record<number, Bucket>): TurnOrderStatRow[] {
  return Object.entries(record)
    .map(([seat, bucket]) => ({
      seat: Number(seat),
      label: `Seat ${Number(seat) + 1}`,
      games: bucket.games,
      wins: bucket.wins,
      winRate: ratio(bucket.wins, bucket.games),
      avgPrestige: avg(bucket.prestige, bucket.games),
      avgScore: avg(bucket.score, bucket.games),
    }))
    .sort((a, b) => a.seat - b.seat);
}

export function buildTurnOrderOverallStats(games: Game[] = []): TurnOrderStatRow[] {
  const buckets: Record<number, Bucket> = {};

  for (const game of games) {
    const players = Array.isArray(game.players) ? game.players : [];
    const totals = game.totals ?? {};
    const winnerId = getWinnerId(game);

    for (const player of players) {
      if (typeof player.startOrder !== 'number') continue;

      const seat = player.startOrder;
      const playerTotals = totals[player.id];

      buckets[seat] ??= makeBucket();
      buckets[seat].games += 1;
      buckets[seat].prestige += getTotalPrestige(playerTotals);
      buckets[seat].score += safeNum(playerTotals?.score);

      if (winnerId === player.id) {
        buckets[seat].wins += 1;
      }
    }
  }

  return toRows(buckets);
}

export function buildTurnOrderByPlayerCountStats(
  games: Game[] = []
): TurnOrderByPlayerCount[] {
  const grouped: Record<number, Record<number, Bucket>> = {};

  for (const game of games) {
    const players = Array.isArray(game.players) ? game.players : [];
    const totals = game.totals ?? {};
    const playerCount = players.length;
    const winnerId = getWinnerId(game);

    if (!playerCount) continue;
    grouped[playerCount] ??= {};

    for (const player of players) {
      if (typeof player.startOrder !== 'number') continue;

      const seat = player.startOrder;
      const playerTotals = totals[player.id];

      grouped[playerCount][seat] ??= makeBucket();
      grouped[playerCount][seat].games += 1;
      grouped[playerCount][seat].prestige += getTotalPrestige(playerTotals);
      grouped[playerCount][seat].score += safeNum(playerTotals?.score);

      if (winnerId === player.id) {
        grouped[playerCount][seat].wins += 1;
      }
    }
  }

  return Object.entries(grouped)
    .map(([playerCount, seatBuckets]) => ({
      playerCount: Number(playerCount),
      rows: toRows(seatBuckets),
    }))
    .sort((a, b) => a.playerCount - b.playerCount);
}
