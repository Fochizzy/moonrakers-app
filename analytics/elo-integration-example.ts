import { useMemo } from 'react';

import { buildAnalyticsSnapshot } from '../selectors';
import type { RelationshipMap, StoredGame, PlayerLike, SortMode, TimeFilter } from '../types';
import { calculateElo, buildPlayerEloSeries } from '@/utils/elo';

export function useEloAnalytics(params: {
  players: readonly PlayerLike[];
  games: readonly StoredGame[];
  relationships: RelationshipMap;
  timeFilter: TimeFilter;
  sortMode: SortMode;
  selectedPlayerId: string | null;
}) {
  const { players, games, relationships, timeFilter, sortMode, selectedPlayerId } = params;

  return useMemo(
    () =>
      buildAnalyticsSnapshot({
        players,
        games,
        relationships,
        calculateElo,
        buildPlayerEloSeries,
        timeFilter,
        sortMode,
        selectedPlayerId,
      }),
    [players, games, relationships, timeFilter, sortMode, selectedPlayerId]
  );
}
