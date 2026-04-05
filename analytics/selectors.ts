import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { buildPlayerInsights } from '@/utils/playerInsights';

export type Insight = {
  id: string;
  title: string;
  description: string;
};

export type PlayerLookup = {
  id: string;
  name: string;
};

export type Relationships = Record<string, Record<string, number>>;

type StoredGame = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  objectiveStatsEligible?: boolean;
  totals?: Record<string, unknown>;
};

type StoreShape = {
  games?: unknown;
  players?: unknown;
  relationships?: unknown;
};

const EMPTY_GAMES: readonly StoredGame[] = [];
const EMPTY_PLAYERS: readonly PlayerLookup[] = [];
const EMPTY_RELATIONSHIPS: Relationships = {};

function isStoredGame(value: unknown): value is StoredGame {
  return !!value && typeof value === 'object';
}

function isPlayerLookup(value: unknown): value is PlayerLookup {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.name === 'string';
}

function isRelationships(value: unknown): value is Relationships {
  if (!value || typeof value !== 'object') return false;

  return Object.values(value as Record<string, unknown>).every((targets) => {
    if (!targets || typeof targets !== 'object') return false;

    return Object.values(targets as Record<string, unknown>).every(
      (score) => typeof score === 'number' && Number.isFinite(score)
    );
  });
}

function selectGames(state: StoreShape): readonly StoredGame[] {
  if (!Array.isArray(state.games)) return EMPTY_GAMES;
  return state.games.filter(isStoredGame);
}

function selectPlayers(state: StoreShape): readonly PlayerLookup[] {
  if (!Array.isArray(state.players)) return EMPTY_PLAYERS;
  return state.players.filter(isPlayerLookup);
}

function selectRelationships(state: StoreShape): Relationships {
  return isRelationships(state.relationships)
    ? state.relationships
    : EMPTY_RELATIONSHIPS;
}

function titleFromInsight(text: string): string {
  const normalized = text.trim();

  if (!normalized) return 'Insight';

  if (normalized.includes(':')) {
    const [prefix] = normalized.split(':');
    const trimmedPrefix = prefix.trim();
    if (trimmedPrefix) return trimmedPrefix;
  }

  const words = normalized.split(/\s+/).slice(0, 4);
  return words.join(' ');
}

export function normalizeInsights(
  playerId: string,
  rawInsights: readonly string[]
): Insight[] {
  return rawInsights.map((description, index) => ({
    id: `${playerId}-insight-${index}`,
    title: titleFromInsight(description),
    description,
  }));
}

export function useInsights(playerId?: string): Insight[] {
  const games = useStore(selectGames);
  const players = useStore(selectPlayers);
  const relationships = useStore(selectRelationships);

  return useMemo(() => {
    if (!playerId) return [];

    const rawInsights = buildPlayerInsights(
      [...games],
      playerId,
      [...players],
      relationships
    );

    return normalizeInsights(playerId, rawInsights);
  }, [games, playerId, players, relationships]);
}
