import {
  getObjectiveCountFromTotals,
  getWinnerIdFromGame,
  normalizeTotals,
  toNumber,
} from '@/utils/gameTotals';
import {
  getRecordedSeat,
  type Game,
  type Player,
} from '@/utils/statsEngine';

export type PlaystyleSample = {
  gameId: string;
  playerId: string;
  playerName: string;
  tableSize: number;
  seat: number | null;
  winFlag: 0 | 1;
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  objectivePoints: number;
  assistsGiven: number;
  assistsReceived: number;
  stayAtBaseTurns: number;
  playableTurns: number;
  stayAtBaseRate: number | null;
};

function getRounds(game: Game): any[] {
  if (Array.isArray((game as any)?.rounds)) {
    return (game as any).rounds;
  }

  if (Array.isArray((game as any)?.timeline)) {
    return (game as any).timeline;
  }

  return [];
}

function isBonusRound(round: any) {
  return round?.metaType === 'bonusObjective';
}

function getStayAtBaseTurnsForRound(round: any) {
  if (isBonusRound(round)) return 0;
  return toNumber(round?.contracts) === 0 && toNumber(round?.failures) === 0 ? 1 : 0;
}

function getObjectivePointsForPlayer(
  playerId: string,
  rounds: any[],
  totals: any
): number {
  const roundSum = rounds
    .filter((round) => round?.playerId === playerId)
    .reduce((sum, round) => {
      const objective = Math.max(
        0,
        Math.floor(toNumber(round?.objectiveCount ?? round?.objectivePrestige))
      );

      return sum + objective;
    }, 0);

  if (roundSum > 0) {
    return roundSum;
  }

  return getObjectiveCountFromTotals(totals);
}

function getAssistsGivenForPlayer(playerId: string, rounds: any[]) {
  return rounds
    .filter((round) => round?.playerId === playerId && !isBonusRound(round))
    .reduce((sum, round) => {
      const assistCount = Object.values(round?.assistRecipients ?? {}).reduce(
        (inner: number, value) => inner + toNumber(value),
        0
      );

      return sum + assistCount;
    }, 0);
}

function getAssistsReceivedForPlayer(playerId: string, rounds: any[]) {
  return rounds.reduce((sum, round) => {
    if (isBonusRound(round)) {
      return sum;
    }

    return sum + toNumber(round?.assistRecipients?.[playerId]);
  }, 0);
}

export function buildPlaystyleSamples(
  players: Player[],
  games: Game[]
): PlaystyleSample[] {
  const playerMap = new Map(players.map((player) => [player.id, player]));

  return games.flatMap((game) => {
    const totals = game?.totals ?? {};
    const rounds = getRounds(game);
    const winnerId = getWinnerIdFromGame(game);
    const tableSize = Array.isArray(game?.players)
      ? game.players.length
      : Object.keys(totals).length;

    return Object.entries(totals).map(([playerId, rawTotals]) => {
      const normalizedTotals = normalizeTotals(rawTotals);
      const gamePlayer = (game.players ?? []).find((entry) => entry.id === playerId);
      const playerRounds = rounds.filter(
        (round) => round?.playerId === playerId && !isBonusRound(round)
      );
      const roundsStayAtBaseTurns = playerRounds.reduce(
        (sum, round) => sum + getStayAtBaseTurnsForRound(round),
        0
      );
      const importedStayAtBaseTurns = Math.max(0, toNumber((rawTotals as any)?.turnsAtBase));
      const stayAtBaseTurns =
        playerRounds.length > 0 ? roundsStayAtBaseTurns : importedStayAtBaseTurns;
      const playableTurns =
        playerRounds.length > 0
          ? playerRounds.length
          : Math.max(
              0,
              normalizedTotals.contracts + normalizedTotals.failures + stayAtBaseTurns
            );
      const player = playerMap.get(playerId);

      return {
        gameId: String(game?.id ?? ''),
        playerId,
        playerName: player?.name ?? (gamePlayer as any)?.name ?? 'Player',
        tableSize,
        seat: getRecordedSeat(gamePlayer),
        winFlag: winnerId === playerId ? 1 : 0,
        totalPrestige: normalizedTotals.totalPrestige,
        directPrestige: normalizedTotals.directPrestige,
        assistPrestigeReceived: normalizedTotals.assistPrestigeReceived,
        objectivePoints: getObjectivePointsForPlayer(playerId, rounds, normalizedTotals),
        assistsGiven: getAssistsGivenForPlayer(playerId, rounds),
        assistsReceived: getAssistsReceivedForPlayer(playerId, rounds),
        stayAtBaseTurns,
        playableTurns,
        stayAtBaseRate: playableTurns > 0 ? stayAtBaseTurns / playableTurns : null,
      };
    });
  });
}
