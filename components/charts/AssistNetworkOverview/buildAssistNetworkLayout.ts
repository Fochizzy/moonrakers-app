export type AssistNetworkMode =
  | 'assistCount'
  | 'assistPrestige'
  | 'assistEfficiency'
  | 'totalPrestige'
  | 'directPrestige'
  | 'contracts'
  | 'assists'
  | 'failures'
  | 'score';

export type AssistMetricsLike = {
  assistCount?: number | null;
  assistPrestige?: number | null;
  totalPrestige?: number | null;
  directPrestige?: number | null;
  contracts?: number | null;
  assists?: number | null;
  failures?: number | null;
  score?: number | null;
  [key: string]: unknown;
};

export type AssistLinkInput = {
  sourcePlayerId: string;
  sourcePlayerName?: string;
  targetPlayerId: string;
  targetPlayerName?: string;
  metrics?: AssistMetricsLike | null;
};

export type AssistNetworkNode = {
  id: string;
  label: string;
  value: number;
  incomingValue: number;
  outgoingValue: number;
  assistCount: number;
  assistPrestige: number;
};

export type AssistNetworkLink = {
  id: string;
  source: string;
  target: string;
  value: number;
  assistCount: number;
  assistPrestige: number;
  assistEfficiency: number;
  sourceLabel: string;
  targetLabel: string;
};

export type AssistNetworkLayout = {
  nodes: AssistNetworkNode[];
  links: AssistNetworkLink[];
  minValue: number;
  maxValue: number;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function getModeValue(
  inputMetrics: AssistMetricsLike | null | undefined,
  mode: AssistNetworkMode
): number {
  const m = inputMetrics ?? {};
  const assistPrestige = toNumber(m.assistPrestige);
  const assistCount = toNumber(m.assistCount) || toNumber(m.assists);
  const assistEfficiency = assistPrestige / Math.max(1, assistCount);

  if (mode === 'assistEfficiency') {
    return assistEfficiency;
  }

  return toNumber(m[mode] ?? 0);
}

function getNodeLabel(playerId: string, preferredName?: string): string {
  const trimmed = preferredName?.trim();
  return trimmed || playerId;
}

export function buildAssistNetworkLayout(
  rows: AssistLinkInput[] = [],
  mode: AssistNetworkMode = 'assistPrestige'
): AssistNetworkLayout {
  const nodeMap = new Map<string, AssistNetworkNode>();
  const linkMap = new Map<string, AssistNetworkLink>();

  for (const row of rows) {
    const sourceId = row?.sourcePlayerId?.trim();
    const targetId = row?.targetPlayerId?.trim();

    if (!sourceId || !targetId) continue;
    if (sourceId === targetId) continue;

    const rowMetrics = row.metrics ?? {};
    const sourceLabel = getNodeLabel(sourceId, row.sourcePlayerName);
    const targetLabel = getNodeLabel(targetId, row.targetPlayerName);

    const assistCount = clampMin(
      toNumber(rowMetrics.assistCount) || toNumber(rowMetrics.assists),
      0
    );
    const assistPrestige = clampMin(toNumber(rowMetrics.assistPrestige), 0);
    const value = clampMin(getModeValue(rowMetrics, mode), 0);

    if (!nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, {
        id: sourceId,
        label: sourceLabel,
        value: 0,
        incomingValue: 0,
        outgoingValue: 0,
        assistCount: 0,
        assistPrestige: 0,
      });
    }

    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, {
        id: targetId,
        label: targetLabel,
        value: 0,
        incomingValue: 0,
        outgoingValue: 0,
        assistCount: 0,
        assistPrestige: 0,
      });
    }

    const linkId = `${sourceId}__${targetId}`;
    const existing = linkMap.get(linkId);

    if (existing) {
      existing.value += value;
      existing.assistCount += assistCount;
      existing.assistPrestige += assistPrestige;
      existing.assistEfficiency =
        existing.assistPrestige / Math.max(1, existing.assistCount);
    } else {
      linkMap.set(linkId, {
        id: linkId,
        source: sourceId,
        target: targetId,
        value,
        assistCount,
        assistPrestige,
        assistEfficiency: assistPrestige / Math.max(1, assistCount),
        sourceLabel,
        targetLabel,
      });
    }

    const sourceNode = nodeMap.get(sourceId)!;
    const targetNode = nodeMap.get(targetId)!;

    sourceNode.outgoingValue += value;
    sourceNode.assistCount += assistCount;
    sourceNode.assistPrestige += assistPrestige;

    targetNode.incomingValue += value;
    targetNode.assistCount += assistCount;
    targetNode.assistPrestige += assistPrestige;
  }

  const nodes = Array.from(nodeMap.values())
    .map((node) => ({
      ...node,
      value: node.incomingValue + node.outgoingValue,
    }))
    .sort((a, b) => b.value - a.value);

  const links = Array.from(linkMap.values())
    .filter((link) => link.value > 0 || link.assistCount > 0 || link.assistPrestige > 0)
    .sort((a, b) => b.value - a.value);

  const allValues = [
    ...nodes.map((node) => node.value),
    ...links.map((link) => link.value),
  ].filter((value) => Number.isFinite(value));

  return {
    nodes,
    links,
    minValue: allValues.length ? Math.min(...allValues) : 0,
    maxValue: allValues.length ? Math.max(...allValues) : 0,
  };
}

export default buildAssistNetworkLayout;
