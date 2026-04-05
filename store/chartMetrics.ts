import { buildPlayerMetrics, SourcePlayerLike } from '@/components/charts/core/metricSchema';

export type GameLike = {
  id?: string;
  players?: Array<Partial<SourcePlayerLike> & { id?: string; name?: string }>;
  rounds?: Array<{
    turns?: Array<{
      playerId?: string;
      score?: number;
      totalPrestige?: number;
      directPrestige?: number;
      assistPrestigeReceived?: number;
      assists?: number;
      contracts?: number;
      failures?: number;
      turnsAtBase?: number;
    }>;
  }>;
};

export function applyMetricSchemaToPlayers(players: SourcePlayerLike[]): SourcePlayerLike[] {
  return players.map((player) => ({
    ...player,
    metrics: buildPlayerMetrics(player),
  }));
}

export function rebuildPlayerMetricsFromGames(players: SourcePlayerLike[], games: GameLike[]): SourcePlayerLike[] {
  const totals = new Map<string, SourcePlayerLike>();

  for (const player of players) {
    totals.set(String(player.id ?? player.name), {
      ...player,
      score: 0,
      totalPrestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      assists: 0,
      contracts: 0,
      failures: 0,
      turnsAtBase: 0,
      turns: 0,
    });
  }

  for (const game of games) {
    for (const round of game.rounds ?? []) {
      for (const turn of round.turns ?? []) {
        const key = String(turn.playerId ?? '');
        if (!key || !totals.has(key)) {
          continue;
        }
        const current = totals.get(key)!;
        current.score = (current.score ?? 0) + (turn.score ?? 0);
        current.totalPrestige = (current.totalPrestige ?? 0) + (turn.totalPrestige ?? 0);
        current.directPrestige = (current.directPrestige ?? 0) + (turn.directPrestige ?? 0);
        current.assistPrestigeReceived = (current.assistPrestigeReceived ?? 0) + (turn.assistPrestigeReceived ?? 0);
        current.assists = (current.assists ?? 0) + (turn.assists ?? 0);
        current.contracts = (current.contracts ?? 0) + (turn.contracts ?? 0);
        current.failures = (current.failures ?? 0) + (turn.failures ?? 0);
        current.turnsAtBase = (current.turnsAtBase ?? 0) + (turn.turnsAtBase ?? 0);
        current.turns = (current.turns ?? 0) + 1;
        totals.set(key, current);
      }
    }
  }

  return Array.from(totals.values()).map((player) => ({
    ...player,
    metrics: buildPlayerMetrics(player),
  }));
}

export function enforceMetricSchemaAtStoreLevel(state: {
  players: SourcePlayerLike[];
  games: GameLike[];
}) {
  return {
    ...state,
    players: rebuildPlayerMetricsFromGames(state.players ?? [], state.games ?? []),
  };
}

