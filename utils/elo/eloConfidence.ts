import { stdDev, clamp } from "./eloMath";

export function calculateEloConfidence(
  gamesPlayed: number,
  eloDeltas: number[]
): number {
  const sampleFactor = Math.min(1, gamesPlayed / 20);
  const volatility = stdDev(eloDeltas);

  const stabilityFactor = 1 - clamp(volatility / 100, 0, 1);

  return clamp(sampleFactor * stabilityFactor, 0, 1);
}
