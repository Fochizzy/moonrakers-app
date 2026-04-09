// utils/chartAnalytics.ts

type GenericPlayer = {
  id: string;
  name?: string;
  color?: string;
};

type TotalsLike = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeGiven?: number;
  score?: number;
  assists?: number;
  assistsGiven?: number;
  assistsReceived?: number;
  failures?: number;
  contracts?: number;
  opportunities?: number;
};

type RoundLike = {
  leaderId?: string;
  winnerId?: string;
  scores?: Record<string, number>;
  prestige?: Record<string, number>;
  prestigeDelta?: Record<string, number>;
};

type GameLike = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: GenericPlayer[];
  totals?: Record<string, TotalsLike>;
  rounds?: RoundLike[];
  history?: RoundLike[];
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function getWinnerId(game: GameLike): string | undefined {
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getGamePlayers(game: GameLike): GenericPlayer[] {
  return Array.isArray(game.players) ? game.players : [];
}

function getTotals(game: GameLike, playerId: string): TotalsLike {
  return game.totals?.[playerId] ?? {};
}

function getTotalPrestige(totals?: TotalsLike): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
}

function getDirectPrestige(totals?: TotalsLike): number {
  return toNumber(totals?.directPrestige);
}

function getAssistPrestigeReceived(totals?: TotalsLike): number {
  return toNumber(totals?.assistPrestigeReceived);
}

function getAssistsGiven(totals?: TotalsLike): number {
  return toNumber(totals?.assistsGiven ?? totals?.assists);
}

function getAssistsReceived(totals?: TotalsLike): number {
  const explicit = totals?.assistsReceived;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(totals?.assistPrestigeReceived);
}

function getContracts(totals?: TotalsLike): number {
  return toNumber(totals?.contracts);
}

function getFailures(totals?: TotalsLike): number {
  return toNumber(totals?.failures);
}

function getScore(totals?: TotalsLike): number {
  return toNumber(totals?.score);
}

function getOpportunities(totals?: TotalsLike): number {
  const explicit = totals?.opportunities;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return getContracts(totals) + getFailures(totals) + getAssistsGiven(totals);
}

function getRounds(game: GameLike): RoundLike[] {
  if (Array.isArray(game.rounds) && game.rounds.length > 0) return game.rounds;
  if (Array.isArray(game.history) && game.history.length > 0) return game.history;
  return [];
}

function getRoundLeader(round: RoundLike): string | undefined {
  if (round.leaderId) return round.leaderId;

  const scores = round.scores ?? round.prestige;
  if (!scores) return undefined;

  let bestId: string | undefined;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const [playerId, value] of Object.entries(scores)) {
    const numeric = toNumber(value);
    if (numeric > bestValue) {
      bestValue = numeric;
      bestId = playerId;
    }
  }

  return bestId;
}

function getFirstRoundLeader(game: GameLike): string | undefined {
  const rounds = getRounds(game);
  if (rounds.length === 0) return undefined;
  return getRoundLeader(rounds[0]);
}

function getTopPlayerByFinalPrestige(game: GameLike): string | undefined {
  const players = getGamePlayers(game);

  let bestId: string | undefined;
  let bestPrestige = Number.NEGATIVE_INFINITY;

  for (const player of players) {
    const prestige = getTotalPrestige(getTotals(game, player.id));
    if (prestige > bestPrestige) {
      bestPrestige = prestige;
      bestId = player.id;
    }
  }

  return bestId;
}

function getSecondHighestPrestige(game: GameLike, excludePlayerId?: string): number {
  const players = getGamePlayers(game);

  let second = Number.NEGATIVE_INFINITY;

  for (const player of players) {
    if (player.id === excludePlayerId) continue;
    const prestige = getTotalPrestige(getTotals(game, player.id));
    if (prestige > second) second = prestige;
  }

  return Number.isFinite(second) ? second : 0;
}

function getRoundCount(game: GameLike): number {
  const rounds = getRounds(game);
  return rounds.length > 0 ? rounds.length : 1;
}

export type PlayerAggregateMetric = {
  playerId: string;
  playerName: string;
  color?: string;
  gamesPlayed: number;
  roundsPlayed: number;
  wins: number;
  winRate: number;

  totalPrestige: number;
  avgPrestigePerGame: number;
  avgPrestigePerRound: number;

  directPrestigeTotal: number;
  assistPrestigeReceivedTotal: number;
  directPrestigeShare: number;
  assistPrestigeShare: number;

  totalScore: number;
  avgScorePerGame: number;

  contracts: number;
  failures: number;
  opportunities: number;
  contractFailureRatio: number;
  failureRate: number;

  assistsGiven: number;
  assistsReceived: number;
  avgAssistsGivenPerGame: number;
  avgAssistsReceivedPerGame: number;

  efficiency: number;
  assistedEfficiency: number;
  directEfficiency: number;
  prestigePerContract: number;
  prestigePerOpportunity: number;

  earlyLeadGames: number;
  earlyLeadRate: number;
  earlyLeadConvertedWins: number;
  leadConversionRate: number;

  comebackWins: number;
  comebackRate: number;

  avgPrestigeMarginWhenWinning: number;
  avgPrestigeMarginOverall: number;
};

export function buildPlayerAggregateMetrics(
  games: GameLike[],
  players: GenericPlayer[]
): PlayerAggregateMetric[] {
  return players.map((player) => {
    const playerGames = games.filter((game) =>
      getGamePlayers(game).some((p) => p.id === player.id) ||
      Boolean(game.totals?.[player.id])
    );

    let roundsPlayed = 0;
    let wins = 0;

    let totalPrestige = 0;
    let directPrestigeTotal = 0;
    let assistPrestigeReceivedTotal = 0;
    let totalScore = 0;

    let contracts = 0;
    let failures = 0;
    let opportunities = 0;
    let assistsGiven = 0;
    let assistsReceived = 0;

    let earlyLeadGames = 0;
    let earlyLeadConvertedWins = 0;
    let comebackWins = 0;

    let totalPrestigeMarginWhenWinning = 0;
    let winningMarginSamples = 0;

    let totalPrestigeMarginOverall = 0;

    for (const game of playerGames) {
      const totals = getTotals(game, player.id);
      const playerPrestige = getTotalPrestige(totals);
      const winnerId = getWinnerId(game);
      const firstLeaderId = getFirstRoundLeader(game);
      const topFinalId = getTopPlayerByFinalPrestige(game);

      roundsPlayed += getRoundCount(game);

      totalPrestige += playerPrestige;
      directPrestigeTotal += getDirectPrestige(totals);
      assistPrestigeReceivedTotal += getAssistPrestigeReceived(totals);
      totalScore += getScore(totals);

      contracts += getContracts(totals);
      failures += getFailures(totals);
      assistsGiven += getAssistsGiven(totals);
      assistsReceived += getAssistsReceived(totals);
      opportunities += getOpportunities(totals);

      if (winnerId === player.id) {
        wins += 1;
      }

      if (firstLeaderId === player.id) {
        earlyLeadGames += 1;
        if (winnerId === player.id) {
          earlyLeadConvertedWins += 1;
        }
      }

      if (winnerId === player.id && firstLeaderId && firstLeaderId !== player.id) {
        comebackWins += 1;
      }

      const otherBestPrestige = getSecondHighestPrestige(game, player.id);
      const prestigeMargin = playerPrestige - otherBestPrestige;
      totalPrestigeMarginOverall += prestigeMargin;

      if (winnerId === player.id || topFinalId === player.id) {
        totalPrestigeMarginWhenWinning += prestigeMargin;
        winningMarginSamples += 1;
      }
    }

    const gamesPlayed = playerGames.length;

    const avgPrestigePerGame = safeDivide(totalPrestige, gamesPlayed);
    const avgPrestigePerRound = safeDivide(totalPrestige, roundsPlayed);
    const avgScorePerGame = safeDivide(totalScore, gamesPlayed);

    const contractFailureRatio = safeDivide(contracts, Math.max(1, failures));
    const failureRate = safeDivide(failures, Math.max(1, contracts + failures));
    const avgAssistsGivenPerGame = safeDivide(assistsGiven, gamesPlayed);
    const avgAssistsReceivedPerGame = safeDivide(assistsReceived, gamesPlayed);

    const prestigePerContract = safeDivide(totalPrestige, Math.max(1, contracts));
    const prestigePerOpportunity = safeDivide(totalPrestige, Math.max(1, opportunities));
    const efficiency = safeDivide(directPrestigeTotal + assistPrestigeReceivedTotal, Math.max(1, contracts + assistsGiven));
    const assistedEfficiency = safeDivide(assistPrestigeReceivedTotal, Math.max(1, assistsGiven));
    const directEfficiency = safeDivide(directPrestigeTotal, Math.max(1, contracts));

    const directPrestigeShare = safeDivide(directPrestigeTotal, Math.max(1, totalPrestige));
    const assistPrestigeShare = safeDivide(assistPrestigeReceivedTotal, Math.max(1, totalPrestige));

    const winRate = safeDivide(wins, gamesPlayed);
    const earlyLeadRate = safeDivide(earlyLeadGames, gamesPlayed);
    const leadConversionRate = safeDivide(earlyLeadConvertedWins, Math.max(1, earlyLeadGames));
    const comebackRate = safeDivide(comebackWins, gamesPlayed);

    const avgPrestigeMarginWhenWinning = safeDivide(
      totalPrestigeMarginWhenWinning,
      Math.max(1, winningMarginSamples)
    );

    const avgPrestigeMarginOverall = safeDivide(totalPrestigeMarginOverall, Math.max(1, gamesPlayed));

    return {
      playerId: player.id,
      playerName: player.name ?? player.id,
      color: player.color,
      gamesPlayed,
      roundsPlayed,
      wins,
      winRate,

      totalPrestige,
      avgPrestigePerGame,
      avgPrestigePerRound,

      directPrestigeTotal,
      assistPrestigeReceivedTotal,
      directPrestigeShare,
      assistPrestigeShare,

      totalScore,
      avgScorePerGame,

      contracts,
      failures,
      opportunities,
      contractFailureRatio,
      failureRate,

      assistsGiven,
      assistsReceived,
      avgAssistsGivenPerGame,
      avgAssistsReceivedPerGame,

      efficiency,
      assistedEfficiency,
      directEfficiency,
      prestigePerContract,
      prestigePerOpportunity,

      earlyLeadGames,
      earlyLeadRate,
      earlyLeadConvertedWins,
      leadConversionRate,

      comebackWins,
      comebackRate,

      avgPrestigeMarginWhenWinning,
      avgPrestigeMarginOverall,
    };
  });
}

export type HeadToHeadStats = {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  gamesTogether: number;
  playerAWins: number;
  playerBWins: number;
  tieWins: number;
  playerAWinRate: number;
  playerBWinRate: number;
  avgPrestigeMargin: number;
  avgScoreMargin: number;
  avgPrestigeA: number;
  avgPrestigeB: number;
  avgScoreA: number;
  avgScoreB: number;
  recentFiveMeetings: Array<{
    winnerId?: string;
    prestigeA: number;
    prestigeB: number;
    scoreA: number;
    scoreB: number;
    firstLeaderId?: string;
    finalWinnerId?: string;
  }>;
  earlyLeaderWasFinalWinnerRate: number;
  playerAEarlyLeadCount: number;
  playerBEarlyLeadCount: number;
  playerALeadConversions: number;
  playerBLeadConversions: number;
  playerALeadConversionRate: number;
  playerBLeadConversionRate: number;
  playerAAssistsGivenPerMeeting: number;
  playerBAssistsGivenPerMeeting: number;
  playerAAssistsReceivedPerMeeting: number;
  playerBAssistsReceivedPerMeeting: number;
};

export function buildHeadToHeadStats(
  games: GameLike[],
  playerAId: string,
  playerBId: string,
  players?: GenericPlayer[]
): HeadToHeadStats {
  const playerAName =
    players?.find((p) => p.id === playerAId)?.name ?? playerAId;
  const playerBName =
    players?.find((p) => p.id === playerBId)?.name ?? playerBId;

  const meetings = games.filter((game) => {
    const ids = new Set(getGamePlayers(game).map((p) => p.id));
    return ids.has(playerAId) && ids.has(playerBId);
  });

  let playerAWins = 0;
  let playerBWins = 0;
  let tieWins = 0;

  let totalPrestigeMargin = 0;
  let totalScoreMargin = 0;

  let totalPrestigeA = 0;
  let totalPrestigeB = 0;
  let totalScoreA = 0;
  let totalScoreB = 0;

  let earlyLeaderWasFinalWinnerCount = 0;
  let earlyLeaderKnownCount = 0;

  let playerAEarlyLeadCount = 0;
  let playerBEarlyLeadCount = 0;
  let playerALeadConversions = 0;
  let playerBLeadConversions = 0;

  let playerAAssistsGiven = 0;
  let playerBAssistsGiven = 0;
  let playerAAssistsReceived = 0;
  let playerBAssistsReceived = 0;

  const recentFiveMeetings = meetings.slice(-5).map((game) => {
    const totalsA = getTotals(game, playerAId);
    const totalsB = getTotals(game, playerBId);

    return {
      winnerId: getWinnerId(game),
      prestigeA: getTotalPrestige(totalsA),
      prestigeB: getTotalPrestige(totalsB),
      scoreA: getScore(totalsA),
      scoreB: getScore(totalsB),
      firstLeaderId: getFirstRoundLeader(game),
      finalWinnerId: getWinnerId(game),
    };
  });

  for (const game of meetings) {
    const totalsA = getTotals(game, playerAId);
    const totalsB = getTotals(game, playerBId);

    const prestigeA = getTotalPrestige(totalsA);
    const prestigeB = getTotalPrestige(totalsB);
    const scoreA = getScore(totalsA);
    const scoreB = getScore(totalsB);

    totalPrestigeA += prestigeA;
    totalPrestigeB += prestigeB;
    totalScoreA += scoreA;
    totalScoreB += scoreB;

    totalPrestigeMargin += prestigeA - prestigeB;
    totalScoreMargin += scoreA - scoreB;

    playerAAssistsGiven += getAssistsGiven(totalsA);
    playerBAssistsGiven += getAssistsGiven(totalsB);
    playerAAssistsReceived += getAssistsReceived(totalsA);
    playerBAssistsReceived += getAssistsReceived(totalsB);

    const winnerId = getWinnerId(game);

    if (winnerId === playerAId) playerAWins += 1;
    else if (winnerId === playerBId) playerBWins += 1;
    else tieWins += 1;

    const firstLeaderId = getFirstRoundLeader(game);
    if (firstLeaderId) {
      earlyLeaderKnownCount += 1;

      if (winnerId && firstLeaderId === winnerId) {
        earlyLeaderWasFinalWinnerCount += 1;
      }

      if (firstLeaderId === playerAId) {
        playerAEarlyLeadCount += 1;
        if (winnerId === playerAId) playerALeadConversions += 1;
      }

      if (firstLeaderId === playerBId) {
        playerBEarlyLeadCount += 1;
        if (winnerId === playerBId) playerBLeadConversions += 1;
      }
    }
  }

  const gamesTogether = meetings.length;

  return {
    playerAId,
    playerAName,
    playerBId,
    playerBName,
    gamesTogether,
    playerAWins,
    playerBWins,
    tieWins,
    playerAWinRate: safeDivide(playerAWins, gamesTogether),
    playerBWinRate: safeDivide(playerBWins, gamesTogether),
    avgPrestigeMargin: safeDivide(totalPrestigeMargin, Math.max(1, gamesTogether)),
    avgScoreMargin: safeDivide(totalScoreMargin, Math.max(1, gamesTogether)),
    avgPrestigeA: safeDivide(totalPrestigeA, Math.max(1, gamesTogether)),
    avgPrestigeB: safeDivide(totalPrestigeB, Math.max(1, gamesTogether)),
    avgScoreA: safeDivide(totalScoreA, Math.max(1, gamesTogether)),
    avgScoreB: safeDivide(totalScoreB, Math.max(1, gamesTogether)),
    recentFiveMeetings,
    earlyLeaderWasFinalWinnerRate: safeDivide(
      earlyLeaderWasFinalWinnerCount,
      Math.max(1, earlyLeaderKnownCount)
    ),
    playerAEarlyLeadCount,
    playerBEarlyLeadCount,
    playerALeadConversions,
    playerBLeadConversions,
    playerALeadConversionRate: safeDivide(
      playerALeadConversions,
      Math.max(1, playerAEarlyLeadCount)
    ),
    playerBLeadConversionRate: safeDivide(
      playerBLeadConversions,
      Math.max(1, playerBEarlyLeadCount)
    ),
    playerAAssistsGivenPerMeeting: safeDivide(playerAAssistsGiven, Math.max(1, gamesTogether)),
    playerBAssistsGivenPerMeeting: safeDivide(playerBAssistsGiven, Math.max(1, gamesTogether)),
    playerAAssistsReceivedPerMeeting: safeDivide(playerAAssistsReceived, Math.max(1, gamesTogether)),
    playerBAssistsReceivedPerMeeting: safeDivide(playerBAssistsReceived, Math.max(1, gamesTogether)),
  };
}

