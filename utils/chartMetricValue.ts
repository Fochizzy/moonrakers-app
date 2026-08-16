type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

export function toChartNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

export function getChartMetricValue(entry: unknown, statKey: string): number {
  if (!entry) return 0;
  if (typeof entry === 'number') return toChartNumber(entry);

  const source = asRecord(entry);

  const directPrestige =
    toChartNumber(source.directPrestige) ||
    toChartNumber(source.selfPrestige) ||
    toChartNumber(source.prestigeFromSelf);

  const assistPrestigeReceived =
    toChartNumber(source.assistPrestigeReceived) ||
    toChartNumber(source.assistsReceived) ||
    toChartNumber(source.assistIn);

  const objectivePrestige =
    toChartNumber(source.objectivePrestige) ||
    toChartNumber(source.objectiveCount);

  const contracts =
    toChartNumber(source.contracts) ||
    toChartNumber(source.successes) ||
    toChartNumber(source.contractSuccesses) ||
    toChartNumber(source.successfulContracts);

  const failures =
    toChartNumber(source.failures) ||
    toChartNumber(source.contractFailures) ||
    toChartNumber(source.failedContracts);

  const assists =
    toChartNumber(source.assists) ||
    toChartNumber(source.assistsGiven) ||
    toChartNumber(source.assistGiven);

  const turns =
    toChartNumber(source.turns) ||
    toChartNumber(source.turnCount) ||
    1;

  const totalPrestige =
    toChartNumber(source.totalPrestige) ||
    toChartNumber(source.prestige) ||
    directPrestige + assistPrestigeReceived + objectivePrestige;

  const score = toChartNumber(source.score) || totalPrestige;

  switch (statKey) {
    case 'score':
      return score;
    case 'totalPrestige':
      return totalPrestige;
    case 'prestige':
      return toChartNumber(source.prestige) || totalPrestige;
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
      return toChartNumber(source.efficiency) || (turns > 0 ? score / turns : 0);
    case 'assistEfficiency':
      return toChartNumber(source.assistEfficiency) || (turns > 0 ? assistPrestigeReceived / turns : 0);
    case 'directEfficiency':
      return toChartNumber(source.directEfficiency) || (turns > 0 ? directPrestige / turns : 0);
    case 'contractSuccessRate': {
      const attempts = contracts + failures;
      return attempts > 0 ? (contracts / attempts) * 100 : 0;
    }
    case 'netPrestige':
      return directPrestige + assistPrestigeReceived + objectivePrestige;
    case 'supportBalance':
      return assistPrestigeReceived - directPrestige;
    default:
      return toChartNumber(source[statKey]);
  }
}
