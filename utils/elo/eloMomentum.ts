import { sum, lastN } from "./eloMath";

export function eloChangeLastN(deltas: number[], n: number): number {
  return sum(lastN(deltas, n));
}

export function eloMomentum(deltas: number[]): number {
  const recent = lastN(deltas, 10);

  return recent.reduce((acc, val, i) => {
    const weight = (i + 1) / recent.length;
    return acc + val * weight;
  }, 0);
}
