import type { MetricContext, MetricKey, SnapshotRecord } from './replayChart.types';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function toNumber(value: unknown): number {
  if (isFiniteNumber(value)) return value;

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function getTotalPrestige(playerSnapshot?: SnapshotRecord): number {
  if (!playerSnapshot) return 0;

  const explicit = playerSnapshot.totalPrestige ?? playerSnapshot.prestige;
  if (isFiniteNumber(explicit)) return explicit;

  return (
    toNumber(playerSnapshot.directPrestige) +
    toNumber(playerSnapshot.assistPrestigeReceived) +
    toNumber(playerSnapshot.objectivePrestige)
  );
}

type MetricResolver = (context: MetricContext) => number;

export const metricResolvers: Record<MetricKey, MetricResolver> = {
  totalPrestige: ({ playerSnapshot }) => getTotalPrestige(playerSnapshot),
  directPrestige: ({ playerSnapshot }) => toNumber(playerSnapshot?.directPrestige),
  assistPrestigeReceived: ({ playerSnapshot }) =>
    toNumber(playerSnapshot?.assistPrestigeReceived),
  objectivePrestige: ({ playerSnapshot }) =>
    toNumber(playerSnapshot?.objectivePrestige),
  score: ({ playerSnapshot }) => toNumber(playerSnapshot?.score),
  contracts: ({ playerSnapshot }) => toNumber(playerSnapshot?.contracts),
  failures: ({ playerSnapshot }) => toNumber(playerSnapshot?.failures),
  efficiency: ({ playerSnapshot }) => {
    const contracts = toNumber(playerSnapshot?.contracts);
    return contracts > 0 ? getTotalPrestige(playerSnapshot) / contracts : 0;
  },
  prestigeDelta: ({ playerSnapshot, previousPlayerSnapshot }) =>
    getTotalPrestige(playerSnapshot) - getTotalPrestige(previousPlayerSnapshot),
};
