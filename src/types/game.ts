import { PlayerId } from './player';
import { RoundStats } from './stats';

// -----------------------------
// 🎯 Round
// -----------------------------
export type GameRound = {
  id: string;

  /**
   * Stats keyed by playerId
   * Partial allows flexibility during in-progress rounds
   */
  stats: Partial<Record<PlayerId, RoundStats>>;

  /**
   * Optional timestamp for ordering / analytics
   */
  createdAt?: number;
};

// -----------------------------
// 🎮 Game
// -----------------------------
export type Game = {
  id: string;

  /**
   * Ordered player list (important for turn-based games)
   */
  players: PlayerId[];

  /**
   * Game rounds
   */
  rounds: GameRound[];

  /**
   * Winner (optional until game ends)
   */
  winnerId?: PlayerId;

  /**
   * Creation timestamp
   */
  createdAt: number;

  /**
   * Optional grouping (league, session, etc.)
   */
  groupKey?: string;

  /**
   * Optional metadata for extensibility
   */
  meta?: Record<string, unknown>;
};
