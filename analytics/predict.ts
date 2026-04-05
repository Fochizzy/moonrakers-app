import { clamp } from './utils';

export function predictWinProbability({
  player,
  players,
}: any) {
  const myElo = player.elo || 1000;

  const opponentElos = players
    .filter((p: any) => p.id !== player.id)
    .map((p: any) => p.elo || 1000);

  const avgOpp =
    opponentElos.reduce((a: number, b: number) => a + b, 0) /
    (opponentElos.length || 1);

  ////////////////////////////////////////////////////////////////////////////
  // 🎯 ELO EXPECTATION
  ////////////////////////////////////////////////////////////////////////////
  const expected =
    1 / (1 + Math.pow(10, (avgOpp - myElo) / 400));

  ////////////////////////////////////////////////////////////////////////////
  // 👥 MULTI-PLAYER ADJUSTMENT
  ////////////////////////////////////////////////////////////////////////////
  const playerCountFactor = 1 / players.length;

  const probability = expected * playerCountFactor * players.length;

  return clamp(probability, 0, 1);
}
