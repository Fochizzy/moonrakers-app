import {
  getObjectiveCountFromTotals,
  getWinnerIdFromGame,
  normalizeTotals,
  toNumber,
} from '@/utils/gameTotals';
import { isPlayableTurnMetaType } from '@/utils/headToHeadMission';
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

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function getRounds(game: Game): unknown[] {
  const source = asRecord(game);

  if (Array.isArray(source.rounds)) {
    return source.rounds;
  }

  if (Array.isArray(source.timeline)) {
    return source.timeline;
  }

  return [];
}

function isBonusRound(round: unknown) {
  return !isPlayableTurnMetaType(
    asRecord(round).metaType as string | null | undefined
  );
}

function getStayAtBaseTurnsForRound(round: unknown) {
  if (isBonusRound(round)) return 0;
  const source = asRecord(round);
  return toNumber(source.contracts) === 0 && toNumber(source.failures) === 0 ? 1 : 0;
}

function getObjectivePointsForPlayer(
  playerId: string,
  rounds: unknown[],
  totals: unknown
): number {
  const roundSum = rounds
    .filter((round) => asRecord(round).playerId === playerId)
    .reduce((sum: number, round) => {
      const source = asRecord(round);
      const objective = Math.max(
        0,
        Math.floor(toNumber(source.objectiveCount ?? source.objectivePrestige))
      );

      return sum + objective;
    }, 0);

  if (roundSum > 0) {
    return roundSum;
  }

  return getObjectiveCountFromTotals(totals);
}

function getAssistsGivenForPlayer(playerId: string, rounds: unknown[]) {
  return rounds
    .filter((round) => asRecord(round).playerId === playerId && !isBonusRound(round))
    .reduce((sum: number, round) => {
      const recipients = (asRecord(round).assistRecipients ?? {}) as UnknownRecord;
      const assistCount = Object.values(recipients).reduce(
        (inner: number, value) => inner + toNumber(value),
        0
      );

      return sum + assistCount;
    }, 0);
}

function getAssistsReceivedForPlayer(playerId: string, rounds: unknown[]) {
  return rounds.reduce((sum: number, round) => {
    if (isBonusRound(round)) {
      return sum;
    }

    const recipients = asRecord(round).assistRecipients as UnknownRecord | undefined;
    return sum + toNumber(recipients?.[playerId]);
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
        (round) => asRecord(round).playerId === playerId && !isBonusRound(round)
      );
      const roundsStayAtBaseTurns = playerRounds.reduce(
        (sum: number, round) => sum + getStayAtBaseTurnsForRound(round),
        0
      );
      const importedStayAtBaseTurns = Math.max(0, toNumber(asRecord(rawTotals).turnsAtBase));
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
        playerName:
          player?.name ?? (asRecord(gamePlayer).name as string | undefined) ?? 'Player',
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
