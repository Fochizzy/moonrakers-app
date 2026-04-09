import { EloGameRecord } from "./eloTransforms";

export function getPlayerGames(
  rows: EloGameRecord[],
  playerId: string
) {
  return rows.filter(r => r.playerId === playerId);
}

export function getLastNGames(
  rows: EloGameRecord[],
  n: number
) {
  return rows.slice(-n);
}

export function getWins(rows: EloGameRecord[]) {
  return rows.filter(r => r.win === 1);
}

export function getLosses(rows: EloGameRecord[]) {
  return rows.filter(r => r.win === 0);
}
