export function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getScoreForAssist(assists: number): number {
  return Math.max(0, toNumber(assists)) * 3;
}

export function getScoreForContracts(contracts: number): number {
  return Math.max(0, toNumber(contracts)) * 5;
}

export function getScoreForFailures(failures: number): number {
  return Math.max(0, toNumber(failures)) * 4;
}

export function calculateScore(input: {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
}): number {
  const totalPrestige =
    typeof input.totalPrestige === 'number' && Number.isFinite(input.totalPrestige)
      ? input.totalPrestige
      : typeof input.prestige === 'number' && Number.isFinite(input.prestige)
        ? input.prestige
        : toNumber(input.directPrestige) +
          toNumber(input.assistPrestigeReceived) +
          toNumber(input.objectivePrestige);

  return (
    totalPrestige +
    getScoreForContracts(toNumber(input.contracts)) +
    getScoreForAssist(toNumber(input.assists)) -
    getScoreForFailures(toNumber(input.failures))
  );
}
