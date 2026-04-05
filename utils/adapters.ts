// utils/adapters.ts

import { Game } from '@/store/useStore';

export type GamePlayerWithRounds = {
  id: string;
  name: string;
  color: string;
  rounds: any[];
};

// -----------------------------
// 🔁 Convert Game → Players with rounds
// -----------------------------
export function gameToPlayersWithRounds(
  game: Game
): GamePlayerWithRounds[] {
  const map: Record<string, GamePlayerWithRounds> =
    Object.create(null);

  // init players
  game.players.forEach((p: any) => {
    map[p.id] = {
      id: p.id,
      name: p.name,
      color: p.color,
      rounds: [],
    };
  });

  // assign rounds
  game.rounds.forEach((r: any) => {
    if (!map[r.playerId]) return;

    map[r.playerId].rounds.push(r.stats);
  });

  return Object.values(map);
}
