import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { buildPlayerInsights } from '@/utils/playerInsights';

type Insight = {
  id: string;
  title: string;
  description: string;
};

type PlayerLookup = {
  id: string;
  name: string;
};

type Relationships = Record<string, Record<string, number>>;

const EMPTY_GAMES: any[] = [];
const EMPTY_PLAYERS: PlayerLookup[] = [];
const EMPTY_RELATIONSHIPS: Relationships = {};

function titleFromInsight(text: string): string {
  const normalized = text.trim();

  if (!normalized) return 'Insight';

  if (normalized.includes(':')) {
    return normalized.split(':')[0].trim();
  }

  const words = normalized.split(/\s+/).slice(0, 4);
  return words.join(' ');
}

export function useInsights(playerId?: string): Insight[] {
  const rawGames = useStore((s: any) => s.games);
  const rawPlayers = useStore((s: any) => s.players);

  const games = Array.isArray(rawGames) ? rawGames : EMPTY_GAMES;
  const players = Array.isArray(rawPlayers)
    ? (rawPlayers as PlayerLookup[])
    : EMPTY_PLAYERS;

  const relationships = EMPTY_RELATIONSHIPS;

  return useMemo(() => {
    if (!playerId) return [];

    const rawInsights = buildPlayerInsights(
      games,
      playerId,
      players,
      relationships
    );

    return rawInsights.map((description, index) => ({
      id: `${playerId}-insight-${index}`,
      title: titleFromInsight(description),
      description,
    }));
  }, [games, playerId, players]);
}
