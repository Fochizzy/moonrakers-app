export function toChartNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

export function getChartMetricValue(entry: any, statKey: string): number {
  if (!entry) return 0;
  if (typeof entry === 'number') return toChartNumber(entry);

  const directPrestige =
    toChartNumber(entry?.directPrestige) ||
    toChartNumber(entry?.selfPrestige) ||
    toChartNumber(entry?.prestigeFromSelf);

  const assistPrestigeReceived =
    toChartNumber(entry?.assistPrestigeReceived) ||
    toChartNumber(entry?.assistsReceived) ||
    toChartNumber(entry?.assistIn);

  const objectivePrestige =
    toChartNumber(entry?.objectivePrestige) ||
    toChartNumber(entry?.objectiveCount);

  const contracts =
    toChartNumber(entry?.contracts) ||
    toChartNumber(entry?.successes) ||
    toChartNumber(entry?.contractSuccesses) ||
    toChartNumber(entry?.successfulContracts);

  const failures =
    toChartNumber(entry?.failures) ||
    toChartNumber(entry?.contractFailures) ||
    toChartNumber(entry?.failedContracts);

  const assists =
    toChartNumber(entry?.assists) ||
    toChartNumber(entry?.assistsGiven) ||
    toChartNumber(entry?.assistGiven);

  const turns =
    toChartNumber(entry?.turns) ||
    toChartNumber(entry?.turnCount) ||
    1;

  const totalPrestige =
    toChartNumber(entry?.totalPrestige) ||
    toChartNumber(entry?.prestige) ||
    directPrestige + assistPrestigeReceived + objectivePrestige;

  const score = toChartNumber(entry?.score) || totalPrestige;

  switch (statKey) {
    case 'score':
      return score;
    case 'totalPrestige':
      return totalPrestige;
    case 'prestige':
      return toChartNumber(entry?.prestige) || totalPrestige;
    case 'directPrestige':
      return directPrestige;
    case 'assistPrestigeReceived':
      return assistPrestigeReceived;
    case 'objectivePrestige':
      return objectivePrestige;
    case 'assists':
      return assists;
    case 'contracts':
      return contracts;
    case 'failures':
      return failures;
    case 'turns':
      return turns;
    case 'efficiency':
      return toChartNumber(entry?.efficiency) || (turns > 0 ? score / turns : 0);
    case 'assistEfficiency':
      return toChartNumber(entry?.assistEfficiency) || (turns > 0 ? assistPrestigeReceived / turns : 0);
    case 'directEfficiency':
      return toChartNumber(entry?.directEfficiency) || (turns > 0 ? directPrestige / turns : 0);
    case 'contractSuccessRate': {
      const attempts = contracts + failures;
      return attempts > 0 ? (contracts / attempts) * 100 : 0;
    }
    case 'netPrestige':
      return directPrestige + assistPrestigeReceived + objectivePrestige;
    case 'supportBalance':
      return assistPrestigeReceived - directPrestige;
    default:
      return toChartNumber(entry?.[statKey]);
  }
}
