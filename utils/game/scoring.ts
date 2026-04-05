export type TurnScoringInput = {
  directPrestige?: number;
  contracts?: number;
  failures?: number;
  didAssist?: boolean | number;
  assistPrestigeReceived?: number;
};

export type PlayerScoringInput = {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
};

export type ScoreBreakdown = {
  totalPrestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  score: number;
  contracts: number;
  assists: number;
  failures: number;
  performance: number;
  efficiency: number;
  assistedEfficiency: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function getScoreForAssist(assistValue: number): number {
  return assistValue > 0 ? 3 : 0;
}

export function getScoreForContracts(contracts: number): number {
  return Math.max(0, toNumber(contracts)) * 5;
}

export function getScoreForFailures(failures: number): number {
  return Math.max(0, toNumber(failures)) * 4;
}

export function getTotalPrestige(input?: Partial<PlayerScoringInput> | null): number {
  if (!input) return 0;

  if (typeof input.totalPrestige === 'number' && Number.isFinite(input.totalPrestige)) {
    return input.totalPrestige;
  }

  if (typeof input.prestige === 'number' && Number.isFinite(input.prestige)) {
    return input.prestige;
  }

  return toNumber(input.directPrestige) + toNumber(input.assistPrestigeReceived);
}

export function calculateTurnScore(input: TurnScoringInput = {}): number {
  const directPrestige = toNumber(input.directPrestige);
  const contracts = Math.max(0, toNumber(input.contracts));
  const failures = Math.max(0, toNumber(input.failures));
  const didAssist = input.didAssist ? 1 : 0;
  const assistPrestigeReceived = toNumber(input.assistPrestigeReceived);
  const totalPrestige = directPrestige + assistPrestigeReceived;

  return (
    totalPrestige +
    getScoreForContracts(contracts) +
    getScoreForAssist(didAssist) -
    getScoreForFailures(failures)
  );
}

export function calculatePlayerBreakdown(
  input: PlayerScoringInput = {}
): ScoreBreakdown {
  const directPrestige = toNumber(input.directPrestige);
  const assistPrestigeReceived = toNumber(input.assistPrestigeReceived);
  const totalPrestige = getTotalPrestige(input);
  const contracts = Math.max(0, toNumber(input.contracts));
  const assists = Math.max(0, toNumber(input.assists));
  const failures = Math.max(0, toNumber(input.failures));
  const score =
    totalPrestige +
    getScoreForContracts(contracts) +
    getScoreForAssist(assists) -
    getScoreForFailures(failures);
  const performance = totalPrestige - failures;
  const efficiency = contracts > 0 ? totalPrestige / contracts : totalPrestige;
  const assistedDenominator = contracts + assists;
  const assistedEfficiency =
    assistedDenominator > 0
      ? totalPrestige / assistedDenominator
      : totalPrestige;

  return {
    totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    score,
    contracts,
    assists,
    failures,
    performance,
    efficiency,
    assistedEfficiency,
  };
}

export function comparePlayersByWinnerRule(
  a: PlayerScoringInput,
  b: PlayerScoringInput
): number {
  const aBreakdown = calculatePlayerBreakdown(a);
  const bBreakdown = calculatePlayerBreakdown(b);

  if (aBreakdown.totalPrestige !== bBreakdown.totalPrestige) {
    return bBreakdown.totalPrestige - aBreakdown.totalPrestige;
  }

  // Total prestige ties are intentionally unresolved here.
  // The user selects the tie-break winner only when ending the game.
  return 0;
}
