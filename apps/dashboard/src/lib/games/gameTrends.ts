import type { ArchiveGame } from "@/lib/data/gameArchiveTypes";

export type TrendSeatRow = {
  assistPrestigeReceived: number;
  color: string | null;
  directPrestige: number;
  id: string;
  isWinner: boolean;
  name: string;
  score: number;
  seat: number;
  totalPrestige: number;
};

export type TrendContractRow = {
  attempts: number;
  color: string | null;
  contracts: number;
  failures: number;
  id: string;
  name: string;
  successRate: number;
};

export type TrendPrestigePoint = {
  leaderId: string | null;
  round: number;
  values: Record<string, number>;
};

export type TrendPredictionRow = {
  correct: boolean;
  margin: number;
  projectedWinnerId: string | null;
  projectedWinnerName: string;
  projectedTotal: number;
  round: number;
};

export type GameTrends = {
  contractRows: TrendContractRow[];
  predictionAccuracy: number;
  predictionRows: TrendPredictionRow[];
  prestigeTrend: TrendPrestigePoint[];
  seatRows: TrendSeatRow[];
};

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function orderPlayersBySeat(game: ArchiveGame) {
  return [...game.players].sort((left, right) => {
    const leftSeat = Number.isFinite(left.startOrder) ? left.startOrder : 999;
    const rightSeat = Number.isFinite(right.startOrder) ? right.startOrder : 999;
    return leftSeat - rightSeat;
  });
}

/**
 * Postgame reads for one saved game: seat-by-seat production, contract
 * reliability, the running prestige race, and how early the eventual winner
 * was already leading.
 */
export function buildGameTrends(game: ArchiveGame): GameTrends {
  const orderedPlayers = orderPlayersBySeat(game);

  const seatRows: TrendSeatRow[] = orderedPlayers.map((player, index) => {
    const totals = game.totals[player.id];

    return {
      assistPrestigeReceived: totals?.assistPrestigeReceived ?? 0,
      color: player.color,
      directPrestige: totals?.directPrestige ?? 0,
      id: player.id,
      isWinner: Boolean(game.winnerId && game.winnerId === player.id),
      name: player.name,
      score: totals?.score ?? 0,
      seat: Number.isFinite(player.startOrder) ? player.startOrder + 1 : index + 1,
      totalPrestige: totals?.totalPrestige ?? 0,
    };
  });

  // Seat rows carry a "Seat N" label so they stay in turn order. These rows show
  // bare names, so they read as arbitrary unless sorted by name.
  const contractRows: TrendContractRow[] = orderedPlayers
    .map((player) => {
      const totals = game.totals[player.id];
      const contracts = totals?.contracts ?? 0;
      const failures = totals?.failures ?? 0;
      const attempts = contracts + failures;

      return {
        attempts,
        color: player.color,
        contracts,
        failures,
        id: player.id,
        name: player.name,
        successRate: safeDivide(contracts, attempts),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const running: Record<string, number> = Object.fromEntries(
    game.players.map((player) => [player.id, 0]),
  );
  const prestigeTrend: TrendPrestigePoint[] = [];
  const predictionRows: TrendPredictionRow[] = [];

  game.rounds.forEach((round, index) => {
    running[round.playerId] = (running[round.playerId] ?? 0) + round.prestige;

    const ranked = game.players
      .map((player) => ({
        id: player.id,
        name: player.name,
        total: running[player.id] ?? 0,
      }))
      .sort((left, right) => right.total - left.total);

    const leader = ranked[0] ?? null;
    const runnerUp = ranked[1] ?? null;

    prestigeTrend.push({
      leaderId: leader?.id ?? null,
      round: index + 1,
      values: { ...running },
    });

    predictionRows.push({
      correct: Boolean(leader && game.winnerId && leader.id === game.winnerId),
      margin: leader && runnerUp ? leader.total - runnerUp.total : leader?.total ?? 0,
      projectedTotal: leader?.total ?? 0,
      projectedWinnerId: leader?.id ?? null,
      projectedWinnerName: leader?.name ?? "—",
      round: index + 1,
    });
  });

  return {
    contractRows,
    predictionAccuracy: safeDivide(
      predictionRows.filter((row) => row.correct).length,
      predictionRows.length,
    ),
    predictionRows,
    prestigeTrend,
    seatRows,
  };
}
