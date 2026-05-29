import { isPlayableTurnMetaType } from "../utils/headToHeadMission";

export type PlayerLike = {
  id: string;
  name: string;
  color?: string;
  startOrder?: number;
};

export type CurrentTurnStats = {
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  headToHeadFirstPlaceId?: string | null;
  headToHeadSecondPlaceId?: string | null;
};

export type Round = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  objectivePrestige: number;
  createdAt: number;
  metaType?: "main" | "bonusObjective" | "headToHeadFirstPlace" | "headToHeadSecondPlace";
  linkedTurnId?: string;
  headToHeadScoreBonus?: number;
};

export type PlayerTotals = {
  totalPrestige: number;
  directPrestige: number;
  objectiveCount: number;
  objectivePrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assistPrestigeBySource: Record<string, number>;
  assistCountBySource: Record<string, number>;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  headToHeadScoreBonus: number;

  // Clean metric set
  allContractsEfficiency: number;
  assistEfficiency: number;
  directEfficiency: number;
};

export type LeaderboardEntry = {
  playerId: string;
  id: string;
  player: PlayerLike;
  name: string;
  color?: string;
  totalPrestige: number;
  directPrestige: number;
  objectiveCount: number;
  objectivePrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  headToHeadScoreBonus: number;
  allContractsEfficiency: number;
  assistEfficiency: number;
  directEfficiency: number;
};

function n(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function objectiveCount(value: unknown): number {
  return Math.max(0, Math.floor(n(value)));
}

function nonNegativeInt(value: unknown): number {
  return Math.max(0, Math.floor(n(value)));
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function emptyTotals(): PlayerTotals {
  return {
    totalPrestige: 0,
    directPrestige: 0,
    objectiveCount: 0,
    objectivePrestige: 0,
    assistPrestigeReceived: 0,
    assistPrestigeSent: 0,
    assistPrestigeBySource: {},
    assistCountBySource: {},
    score: 0,
    assists: 0,
    failures: 0,
    contracts: 0,
    headToHeadScoreBonus: 0,
    allContractsEfficiency: 0,
    assistEfficiency: 0,
    directEfficiency: 0,
  };
}

export function createRound(
  playerId: string,
  current: CurrentTurnStats
): Round {
  const count = objectiveCount(current.objectiveCount);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    prestige: n(current.prestige),
    contracts: Math.max(0, Math.min(1, n(current.contracts))),
    failures: Math.max(0, Math.min(1, n(current.failures))),
    assistRecipients: Object.fromEntries(
      Object.entries(current.assistRecipients ?? {}).filter(
        ([, value]) => n(value) > 0
      )
    ),
    assistPrestigeRecipients: Object.fromEntries(
      Object.entries(current.assistPrestigeRecipients ?? {}).filter(
        ([recipientId]) => n((current.assistRecipients ?? {})[recipientId]) > 0
      )
    ),
    objectiveCount: count,
    objectivePrestige: count,
    createdAt: Date.now(),
  };
}

export function getNextTurnIndex(
  currentIndex: number,
  playerCount: number
): number {
  if (playerCount <= 0) return 0;
  return (currentIndex + 1) % playerCount;
}

export function getTotalPrestigeFromTotals(
  totals?: Partial<PlayerTotals> | null
): number {
  return Math.max(
    0,
    n(totals?.directPrestige) +
      n(totals?.objectivePrestige) +
      n(totals?.assistPrestigeReceived)
  );
}

export function getScoreForAssist(assists: number): number {
  return Math.max(0, n(assists)) * 3;
}

export function getScoreForContracts(contracts: number): number {
  return Math.max(0, n(contracts)) * 5;
}

export function getScoreForFailures(failures: number): number {
  return Math.max(0, n(failures)) * 4;
}

export function buildTotals(
  rounds: Round[],
  players: PlayerLike[]
): Record<string, PlayerTotals> {
  const totals: Record<string, PlayerTotals> = {};

  for (const player of players) {
    totals[player.id] = emptyTotals();
  }

  for (const round of rounds) {
    if (!totals[round.playerId]) {
      totals[round.playerId] = emptyTotals();
    }

    const actorTotals = totals[round.playerId];
    const roundObjectiveCount = objectiveCount(
      round.objectiveCount ?? round.objectivePrestige
    );

    actorTotals.directPrestige += n(round.prestige);
    actorTotals.objectiveCount += roundObjectiveCount;
    actorTotals.objectivePrestige += roundObjectiveCount;
    actorTotals.contracts += Math.max(0, Math.min(1, n(round.contracts)));
    actorTotals.failures += Math.max(0, Math.min(1, n(round.failures)));
    actorTotals.headToHeadScoreBonus += n(round.headToHeadScoreBonus);

    if (isPlayableTurnMetaType(round.metaType)) {
      for (const rawAssist of Object.values(round.assistRecipients ?? {})) {
        if (n(rawAssist) > 0) {
          actorTotals.assists += 1;
        }
      }

      for (const [recipientId, rawAssistPrestige] of Object.entries(
        round.assistPrestigeRecipients ?? {}
      )) {
        if (!totals[recipientId]) {
          totals[recipientId] = emptyTotals();
        }

        const recipientTotals = totals[recipientId];
        const assistPrestige = n(rawAssistPrestige);
        const assistCountForRecipient =
          n((round.assistRecipients ?? {})[recipientId]) > 0 ? 1 : 0;

        if (assistPrestige === 0 && assistCountForRecipient === 0) continue;

        recipientTotals.assistPrestigeReceived += assistPrestige;
        recipientTotals.assistPrestigeBySource[round.playerId] =
          n(recipientTotals.assistPrestigeBySource[round.playerId]) +
          assistPrestige;

        recipientTotals.assistCountBySource[round.playerId] =
          n(recipientTotals.assistCountBySource[round.playerId]) +
          assistCountForRecipient;

        actorTotals.assistPrestigeSent += assistPrestige;
      }
    }
  }

  for (const playerId of Object.keys(totals)) {
    const totalsForPlayer = totals[playerId];

    totalsForPlayer.totalPrestige = getTotalPrestigeFromTotals(totalsForPlayer);

    totalsForPlayer.score =
      totalsForPlayer.totalPrestige +
      getScoreForContracts(totalsForPlayer.contracts) +
      getScoreForAssist(totalsForPlayer.assists) -
      getScoreForFailures(totalsForPlayer.failures) +
      n(totalsForPlayer.headToHeadScoreBonus);

    const allEffNumerator =
      n(totalsForPlayer.directPrestige) +
      n(totalsForPlayer.assistPrestigeReceived);
    const allEffDenominator =
      n(totalsForPlayer.contracts) + n(totalsForPlayer.assists);

    totalsForPlayer.allContractsEfficiency = safeDivide(
      allEffNumerator,
      allEffDenominator
    );

    totalsForPlayer.assistEfficiency = safeDivide(
      n(totalsForPlayer.assistPrestigeReceived),
      n(totalsForPlayer.assists)
    );

    totalsForPlayer.directEfficiency = safeDivide(
      n(totalsForPlayer.directPrestige),
      n(totalsForPlayer.contracts)
    );
  }

  return totals;
}

export function getLeaderboard(
  totals: Record<string, PlayerTotals>,
  players: PlayerLike[],
  _rounds: Round[] = []
): LeaderboardEntry[] {
  return players
    .map((player) => {
      const playerTotals = totals[player.id] ?? emptyTotals();

      return {
        playerId: player.id,
        id: player.id,
        player,
        name: player.name,
        color: player.color,
        totalPrestige: getTotalPrestigeFromTotals(playerTotals),
        directPrestige: n(playerTotals.directPrestige),
        objectiveCount: nonNegativeInt(playerTotals.objectiveCount),
        objectivePrestige: n(playerTotals.objectivePrestige),
        assistPrestigeReceived: n(playerTotals.assistPrestigeReceived),
        assistPrestigeSent: n(playerTotals.assistPrestigeSent),
        score: n(playerTotals.score),
        assists: nonNegativeInt(playerTotals.assists),
        failures: nonNegativeInt(playerTotals.failures),
        contracts: nonNegativeInt(playerTotals.contracts),
        headToHeadScoreBonus: n(playerTotals.headToHeadScoreBonus),
        allContractsEfficiency: n(playerTotals.allContractsEfficiency),
        assistEfficiency: n(playerTotals.assistEfficiency),
        directEfficiency: n(playerTotals.directEfficiency),
      };
    })
    .sort((a, b) => {
      if (b.totalPrestige !== a.totalPrestige) {
        return b.totalPrestige - a.totalPrestige;
      }
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
}

export function getLeadingPlayerIds(
  totals: Record<string, PlayerTotals>,
  players: PlayerLike[]
): string[] {
  const ranking = getLeaderboard(totals, players);
  if (!ranking.length) return [];
  const best = ranking[0].totalPrestige;
  return ranking
    .filter((entry) => entry.totalPrestige === best)
    .map((entry) => entry.id);
}
