import type { ArchiveGame } from "@/lib/data/gameArchiveTypes";

export type GameStandingRow = {
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assists: number;
  color: string | null;
  contracts: number;
  directPrestige: number;
  failures: number;
  id: string;
  isWinner: boolean;
  name: string;
  objectivePrestige: number;
  rank: number;
  score: number;
  totalPrestige: number;
};

export type GameReplayRow = {
  assistPrestigeSent: number;
  assistsGiven: number;
  color: string | null;
  playerId: string;
  contracts: number;
  failures: number;
  key: string;
  objectivePrestige: number;
  playerName: string;
  prestige: number;
  step: number;
};

export type GameHighlight = {
  detail: string;
  label: string;
  name: string;
};

export type GameSummary = {
  createdAt: number;
  groupName: string | null;
  /**
   * False when the game saved no winner. History labels those "No winner
   * recorded", so the summary must not crown the top-prestige player instead.
   */
  hasRecordedWinner: boolean;
  highlights: GameHighlight[];
  playerCount: number;
  replayRows: GameReplayRow[];
  roundCount: number;
  standings: GameStandingRow[];
  topPrestige: number | null;
  winnerName: string | null;
};

function sumValues(record: Record<string, number>) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function pickLeader(
  standings: GameStandingRow[],
  read: (row: GameStandingRow) => number,
) {
  return [...standings].sort((left, right) => read(right) - read(left))[0] ?? null;
}

export function buildGameStandings(game: ArchiveGame): GameStandingRow[] {
  return game.players
    .map((player) => {
      const totals = game.totals[player.id];

      return {
        assistPrestigeReceived: totals?.assistPrestigeReceived ?? 0,
        assistPrestigeSent: totals?.assistPrestigeSent ?? 0,
        assists: totals?.assists ?? 0,
        color: player.color,
        contracts: totals?.contracts ?? 0,
        directPrestige: totals?.directPrestige ?? 0,
        failures: totals?.failures ?? 0,
        id: player.id,
        isWinner: Boolean(game.winnerId && game.winnerId === player.id),
        name: player.name,
        objectivePrestige: totals?.objectivePrestige ?? 0,
        rank: 0,
        score: totals?.score ?? 0,
        totalPrestige: totals?.totalPrestige ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.totalPrestige !== left.totalPrestige) {
        return right.totalPrestige - left.totalPrestige;
      }
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.name.localeCompare(right.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildGameReplayRows(game: ArchiveGame): GameReplayRow[] {
  const playersById = new Map(game.players.map((player) => [player.id, player]));

  return game.rounds.map((round, index) => {
    const player = playersById.get(round.playerId);

    return {
      assistPrestigeSent: sumValues(round.assistPrestigeRecipients),
      assistsGiven: sumValues(round.assistRecipients),
      color: player?.color ?? null,
      contracts: round.contracts,
      failures: round.failures,
      key: round.id || `turn-${index}`,
      objectivePrestige: round.objectivePrestige,
      playerId: round.playerId,
      playerName: player?.name ?? "Unknown",
      prestige: round.prestige,
      step: index + 1,
    };
  });
}

export function buildGameSummary(game: ArchiveGame): GameSummary {
  const standings = buildGameStandings(game);
  const topPrestige = standings[0] ?? null;
  const recordedWinner = standings.find((row) => row.isWinner) ?? null;
  const mostContracts = pickLeader(standings, (row) => row.contracts);
  const mostAssists = pickLeader(standings, (row) => row.assists);

  return {
    createdAt: game.createdAt,
    groupName: game.groupName,
    highlights: [
      {
        label: "Top Prestige",
        name: topPrestige?.name ?? "—",
        detail: topPrestige ? `${topPrestige.totalPrestige} prestige` : "No data",
      },
      {
        label: "Most Contracts",
        name: mostContracts?.name ?? "—",
        detail: mostContracts ? `${mostContracts.contracts} contracts` : "No data",
      },
      {
        label: "Most Assists",
        name: mostAssists?.name ?? "—",
        detail: mostAssists ? `${mostAssists.assists} assists` : "No data",
      },
    ],
    hasRecordedWinner: recordedWinner !== null,
    playerCount: game.players.length,
    replayRows: buildGameReplayRows(game),
    roundCount: game.roundCount,
    standings,
    topPrestige: topPrestige?.totalPrestige ?? null,
    winnerName: recordedWinner?.name ?? topPrestige?.name ?? null,
  };
}
