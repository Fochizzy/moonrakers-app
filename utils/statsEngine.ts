export type Player = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
};

export type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistCountBySource?: Record<string, number>;
  contracts?: number;
  assists?: number;
  failures?: number;
  score?: number;
};

export type GamePlayer = {
  id: string;
  startOrder?: number;
  turnOrder?: number;
  position?: number;
};

export type Game = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, Totals>;
  players?: GamePlayer[];
};

export type PlayerStats = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assistCountBySource: number;
  score: number;
  assists: number;
  contracts: number;
  failures: number;
  games: number;
  wins: number;
  avgPrestigePerGame: number;
  avgScorePerGame: number;
  allContractsEfficiency: number;
  assistanceEfficiency: number;
  directEfficiency: number;
  contractFailureRatio: number;
  winRate: number;
  failureRate: number;
  assistShareOfPrestige: number;
  assistPrestigePerGame: number;
  assistPrestigePerAssist: number;
  closeGames: number;
  closeGameRate: number;
  bestPrestigeMargin: number;
  avgPrestigeMarginPerGame: number;
  avgStartSeat: number;
  turnOrderWinCorrelation: number;
};

export type LeagueSummary = {
  totalPrestige: number;
  totalScore: number;
  totalAssistSent: number;
  totalAssistReceived: number;
  avgWinnerSeat: number;
  turnOrderWinCorrelation: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

export function getTotalPrestige(stats?: Totals) {
  const explicit = stats?.totalPrestige ?? stats?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }
  return toNumber(stats?.directPrestige) + toNumber(stats?.assistPrestigeReceived);
}

export function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

export function getRecordedSeat(player?: GamePlayer): number | null {
  if (!player) return null;

  const raw =
    typeof player.startOrder === 'number' && Number.isFinite(player.startOrder)
      ? player.startOrder
      : typeof player.turnOrder === 'number' && Number.isFinite(player.turnOrder)
        ? player.turnOrder
        : typeof player.position === 'number' && Number.isFinite(player.position)
          ? player.position
          : null;

  return raw === null ? null : raw + 1;
}

export function getPearsonCorrelation(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return 0;

  const meanX = average(points.map((point) => point.x));
  const meanY = average(points.map((point) => point.y));

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

export function buildLeaderboard(players: Player[], games: Game[]): PlayerStats[] {
  if (!players.length) return [];

  const totals: Record<string, PlayerStats> = {};
  const prestigeMarginsByPlayer: Record<string, number[]> = {};
  const seatsByPlayer: Record<string, number[]> = {};
  const seatWinPointsByPlayer: Record<string, Array<{ x: number; y: number }>> = {};

  players.forEach((player) => {
    totals[player.id] = {
      id: player.id,
      name: player.name,
      initials: player.initials,
      color: player.color,
      totalPrestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      assistPrestigeSent: 0,
      assistCountBySource: 0,
      score: 0,
      assists: 0,
      contracts: 0,
      failures: 0,
      games: 0,
      wins: 0,
      avgPrestigePerGame: 0,
      avgScorePerGame: 0,
      allContractsEfficiency: 0,
      assistanceEfficiency: 0,
      directEfficiency: 0,
      contractFailureRatio: 0,
      winRate: 0,
      failureRate: 0,
      assistShareOfPrestige: 0,
      assistPrestigePerGame: 0,
      assistPrestigePerAssist: 0,
      closeGames: 0,
      closeGameRate: 0,
      bestPrestigeMargin: 0,
      avgPrestigeMarginPerGame: 0,
      avgStartSeat: 0,
      turnOrderWinCorrelation: 0,
    };
    prestigeMarginsByPlayer[player.id] = [];
    seatsByPlayer[player.id] = [];
    seatWinPointsByPlayer[player.id] = [];
  });

  games.forEach((game) => {
    const gameTotals = game.totals;
    if (!gameTotals) return;

    const gamePrestigeRows = Object.entries(gameTotals).map(([playerId, stats]) => ({
      playerId,
      totalPrestige: getTotalPrestige(stats ?? {}),
    }));
    gamePrestigeRows.sort((a, b) => b.totalPrestige - a.totalPrestige);

    const leaderPrestige = gamePrestigeRows[0]?.totalPrestige ?? 0;
    const runnerUpPrestige = gamePrestigeRows[1]?.totalPrestige ?? leaderPrestige;
    const isCloseGame = Math.abs(leaderPrestige - runnerUpPrestige) <= 3;

    Object.entries(gameTotals).forEach(([playerId, rawStats]) => {
      const player = totals[playerId];
      if (!player) return;

      const stats = rawStats ?? {};
      const totalPrestige = getTotalPrestige(stats);
      const directPrestige = toNumber(stats.directPrestige);
      const assistPrestigeReceived =
        typeof stats.assistPrestigeReceived === 'number'
          ? toNumber(stats.assistPrestigeReceived)
          : Math.max(0, totalPrestige - directPrestige);

      player.games += 1;
      player.totalPrestige += totalPrestige;
      player.directPrestige += directPrestige;
      player.assistPrestigeReceived += assistPrestigeReceived;
      player.score += toNumber(stats.score);
      player.assists += toNumber(stats.assists);
      player.contracts += toNumber(stats.contracts);
      player.failures += toNumber(stats.failures);

      const assistCountBySource = stats.assistCountBySource ?? {};
      player.assistCountBySource += Object.values(assistCountBySource).reduce(
        (sum, value) => sum + toNumber(value),
        0
      );

      const gamePlayer = (game.players ?? []).find((entry) => entry.id === playerId);
      const seat = getRecordedSeat(gamePlayer);
      const won = getWinnerId(game) === playerId;

      if (won) {
        player.wins += 1;
      }

      if (seat !== null) {
        seatsByPlayer[playerId].push(seat);
        seatWinPointsByPlayer[playerId].push({ x: seat, y: won ? 1 : 0 });
      }

      if (isCloseGame) {
        player.closeGames += 1;
      }

      prestigeMarginsByPlayer[playerId].push(totalPrestige - runnerUpPrestige);
    });

    Object.entries(gameTotals).forEach(([receiverId, receiverStats]) => {
      const bySource = receiverStats?.assistPrestigeBySource ?? {};
      Object.entries(bySource).forEach(([sourceId, value]) => {
        if (!totals[sourceId]) return;
        totals[sourceId].assistPrestigeSent += toNumber(value);
      });
    });
  });

  Object.values(totals).forEach((player) => {
    const attempts = player.contracts + player.failures;
    const prestigeMargins = prestigeMarginsByPlayer[player.id];

    player.avgPrestigePerGame = safeDivide(player.totalPrestige, player.games);
    player.avgScorePerGame = safeDivide(player.score, player.games);
    player.allContractsEfficiency = safeDivide(
      player.directPrestige + player.assistPrestigeReceived,
      player.contracts + player.assists
    );
    player.assistanceEfficiency = safeDivide(
      player.assistPrestigeReceived,
      player.assists
    );
    player.directEfficiency = safeDivide(
      player.directPrestige,
      player.contracts
    );
    player.contractFailureRatio = safeDivide(player.contracts, Math.max(1, player.failures));
    player.winRate = safeDivide(player.wins, player.games);
    player.failureRate = safeDivide(player.failures, attempts);
    player.assistShareOfPrestige = safeDivide(player.assistPrestigeReceived, player.totalPrestige);
    player.assistPrestigePerGame = safeDivide(player.assistPrestigeReceived, player.games);
    player.assistPrestigePerAssist = safeDivide(player.assistPrestigeReceived, Math.max(1, player.assists));
    player.closeGameRate = safeDivide(player.closeGames, player.games);
    player.bestPrestigeMargin = prestigeMargins.length ? Math.max(...prestigeMargins) : 0;
    player.avgPrestigeMarginPerGame = prestigeMargins.length
      ? prestigeMargins.reduce((sum, value) => sum + value, 0) / prestigeMargins.length
      : 0;
    player.avgStartSeat = average(seatsByPlayer[player.id]);
    player.turnOrderWinCorrelation = getPearsonCorrelation(
      seatWinPointsByPlayer[player.id]
    );
  });

  return Object.values(totals).sort((a, b) => {
    if (b.totalPrestige !== a.totalPrestige) return b.totalPrestige - a.totalPrestige;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
}

export function buildLeagueSummary(leaderboard: PlayerStats[], games: Game[]): LeagueSummary {
  const totalPrestige = leaderboard.reduce((sum, player) => sum + player.totalPrestige, 0);
  const totalScore = leaderboard.reduce((sum, player) => sum + player.score, 0);
  const totalAssistSent = leaderboard.reduce((sum, player) => sum + player.assistPrestigeSent, 0);
  const totalAssistReceived = leaderboard.reduce((sum, player) => sum + player.assistPrestigeReceived, 0);

  const globalSeatPoints: Array<{ x: number; y: number }> = [];
  const winnerSeats: number[] = [];

  for (const game of games) {
    const winnerId = getWinnerId(game);

    for (const gamePlayer of game.players ?? []) {
      const seat = getRecordedSeat(gamePlayer);
      if (seat === null) continue;

      const won = winnerId === gamePlayer.id;
      globalSeatPoints.push({ x: seat, y: won ? 1 : 0 });

      if (won) {
        winnerSeats.push(seat);
      }
    }
  }

  return {
    totalPrestige,
    totalScore,
    totalAssistSent,
    totalAssistReceived,
    avgWinnerSeat: average(winnerSeats),
    turnOrderWinCorrelation: getPearsonCorrelation(globalSeatPoints),
  };
}
