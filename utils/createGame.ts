import type { Player } from '@/store/useStore';

type GamePlayer = Player & {
  startOrder?: number;
};

type GamePlayerTotals = {
  prestige: number;
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeBySource: Record<string, number>;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  performance: number;
  efficiency: number;
  assistedEfficiency: number;
};

type CreateGameOptions = {
  groupId?: string;
  groupName?: string;
};

function emptyTotals(): GamePlayerTotals {
  return {
    prestige: 0,
    totalPrestige: 0,
    directPrestige: 0,
    assistPrestigeReceived: 0,
    assistPrestigeBySource: {},
    score: 0,
    assists: 0,
    failures: 0,
    contracts: 0,
    performance: 0,
    efficiency: 0,
    assistedEfficiency: 0,
  };
}

export function createGame(
  players: GamePlayer[],
  options: CreateGameOptions = {}
) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new Error('At least 2 players required');
  }

  const orderedPlayers = players.map((player, index) => ({
    ...player,
    startOrder:
      typeof player.startOrder === 'number' ? player.startOrder : index,
    ...emptyTotals(),
  }));

  const totals = Object.fromEntries(
    orderedPlayers.map((player) => [player.id, emptyTotals()])
  );

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    players: orderedPlayers,
    rounds: [],
    roundCount: 0,
    totals,
    winnerId: undefined,
    selectedWinnerId: undefined,
    manualWinnerId: undefined,
    groupId: options.groupId,
    groupName: options.groupName,
    createdAt: Date.now(),
  };
}
