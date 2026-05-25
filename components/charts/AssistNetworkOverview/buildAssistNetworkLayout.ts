export type AssistNetworkMode =
  | "assistCount"
  | "assistPrestige"
  | "assistEfficiency"
  | "supportBalance";

export type AssistNetworkNode = {
  id: string;
  label: string;
  value: number;
  involvementFrequencyPerGame: number;
  supportBalance: number;
};

export type AssistNetworkLink = {
  id: string;
  source: string;
  target: string;
  value: number;
  assistCount: number;
  assistPrestige: number;
  assistEfficiency: number;
  assistFrequencyPerGame: number;
  labelText: string;
  sourceLabel: string;
  targetLabel: string;
};

export type AssistNetworkLayout = {
  nodes: AssistNetworkNode[];
  links: AssistNetworkLink[];
  minValue: number;
  maxValue: number;
};

export type Relationships = Record<string, Record<string, number>>;

export type RelationshipEdge = {
  source?: string;
  target?: string;
  fromId?: string;
  toId?: string;
  sourceId?: string;
  targetId?: string;
  value?: number;
  weight?: number;
  assistCount?: number;
  assistPrestige?: number;
  assistEfficiency?: number;
  assistFrequencyPerGame?: number;
};

type NormalizedRelationshipEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  assistCount: number;
  assistPrestige: number;
  assistEfficiency: number;
  assistFrequencyPerGame: number;
  hasExplicitAssistEfficiency: boolean;
};

type WorkingAssistNetworkNode = {
  id: string;
  label: string;
  incomingPrestige: number;
  outgoingPrestige: number;
  incomingFrequency: number;
  outgoingFrequency: number;
};

export type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function getAssistEfficiencyWeight(
  assistCount: number,
  assistPrestige: number,
  assistEfficiency: number
): number {
  if (assistCount > 0) return assistCount;
  return assistPrestige > 0 || assistEfficiency > 0 ? 1 : 0;
}

function getNodeLabel(playerId: string, playersById: Map<string, PlayerLike>): string {
  return playersById.get(playerId)?.name?.trim() || playerId;
}

function normalizeRelationships(
  input: Relationships | RelationshipEdge[] | undefined
): NormalizedRelationshipEdge[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    const out: NormalizedRelationshipEdge[] = [];
    for (const raw of input) {
      const sourceId = String(
        raw.sourceId ?? raw.source ?? raw.fromId ?? ""
      ).trim();
      const targetId = String(
        raw.targetId ?? raw.target ?? raw.toId ?? ""
      ).trim();
      if (!sourceId || !targetId || sourceId === targetId) continue;

      const assistCount = clampMin(toNumber(raw.assistCount), 0);
      const assistPrestige = clampMin(
        toNumber(raw.assistPrestige ?? raw.value ?? raw.weight),
        0
      );
      const explicitAssistEfficiency = clampMin(
        toNumber(raw.assistEfficiency),
        0
      );
      const hasExplicitAssistCount =
        raw.assistCount !== undefined && raw.assistCount !== null;
      const hasExplicitAssistEfficiency =
        raw.assistEfficiency !== undefined && raw.assistEfficiency !== null;
      const assistEfficiency =
        hasExplicitAssistEfficiency
          ? explicitAssistEfficiency
          : assistCount > 0
          ? assistPrestige / assistCount
          : clampMin(toNumber(raw.assistEfficiency), 0);
      const assistFrequencyPerGame = clampMin(
        toNumber(
          raw.assistFrequencyPerGame ??
            (assistCount > 0 ? assistCount : raw.weight ?? raw.value)
        ),
        0
      );

      if (
        assistCount <= 0 &&
        assistPrestige <= 0 &&
        assistEfficiency <= 0 &&
        assistFrequencyPerGame <= 0
      ) {
        continue;
      }

      out.push({
        id: `${sourceId}__${targetId}`,
        sourceId,
        targetId,
        assistCount:
          assistCount > 0 || hasExplicitAssistCount || assistPrestige <= 0 ? assistCount : 1,
        assistPrestige,
        assistEfficiency:
          hasExplicitAssistEfficiency
            ? explicitAssistEfficiency
            : assistCount > 0 || hasExplicitAssistCount || assistPrestige <= 0
            ? assistEfficiency
            : assistPrestige,
        assistFrequencyPerGame,
        hasExplicitAssistEfficiency,
      });
    }
    return out;
  }

  const out: NormalizedRelationshipEdge[] = [];

  for (const [sourceIdRaw, nested] of Object.entries(input ?? {})) {
    const sourceId = String(sourceIdRaw).trim();
    if (!sourceId) continue;

    for (const [targetIdRaw, rawWeight] of Object.entries(nested ?? {})) {
      const targetId = String(targetIdRaw).trim();
      if (!targetId || targetId === sourceId) continue;

      const assistPrestige = clampMin(toNumber(rawWeight), 0);
      if (assistPrestige <= 0) continue;

      out.push({
        id: `${sourceId}__${targetId}`,
        sourceId,
        targetId,
        assistCount: 1,
        assistPrestige,
        assistEfficiency: assistPrestige,
        assistFrequencyPerGame: assistPrestige,
        hasExplicitAssistEfficiency: false,
      });
    }
  }

  return out;
}

export function buildAssistNetworkLayout(
  relationshipsInput: Relationships | RelationshipEdge[] = {},
  players: PlayerLike[] = [],
  _mode: AssistNetworkMode = "assistPrestige"
): AssistNetworkLayout {
  const relationships = normalizeRelationships(relationshipsInput);
  const playersById = new Map(players.map((player) => [String(player.id), player]));
  const nodeMap = new Map<string, WorkingAssistNetworkNode>();
  const linkMap = new Map<string, AssistNetworkLink>();

  const ensureNode = (playerId: string) => {
    if (!nodeMap.has(playerId)) {
      nodeMap.set(playerId, {
        id: playerId,
        label: getNodeLabel(playerId, playersById),
        incomingPrestige: 0,
        outgoingPrestige: 0,
        incomingFrequency: 0,
        outgoingFrequency: 0,
      });
    }
    return nodeMap.get(playerId)!;
  };

  for (const player of players) {
    ensureNode(String(player.id));
  }

  for (const raw of relationships) {
    const sourceId = String(raw.sourceId ?? "").trim();
    const targetId = String(raw.targetId ?? "").trim();
    if (!sourceId || !targetId || sourceId === targetId) continue;

    const assistCount = clampMin(toNumber(raw.assistCount), 0);
    const assistPrestige = clampMin(toNumber(raw.assistPrestige), 0);
    const assistEfficiency = raw.hasExplicitAssistEfficiency
      ? clampMin(toNumber(raw.assistEfficiency), 0)
      : assistCount > 0
        ? assistPrestige / assistCount
        : 0;
    const assistFrequencyPerGame = clampMin(
      toNumber(raw.assistFrequencyPerGame),
      0
    );

    if (
      assistCount <= 0 &&
      assistPrestige <= 0 &&
      assistEfficiency <= 0 &&
      assistFrequencyPerGame <= 0
    ) {
      continue;
    }

    const sourceNode = ensureNode(sourceId);
    const targetNode = ensureNode(targetId);

    sourceNode.outgoingPrestige += assistPrestige;
    sourceNode.outgoingFrequency += assistFrequencyPerGame;

    targetNode.incomingPrestige += assistPrestige;
    targetNode.incomingFrequency += assistFrequencyPerGame;

    const linkId = raw.id || `${sourceId}__${targetId}`;
    const existing = linkMap.get(linkId);

    if (existing) {
      const existingEfficiencyWeight = getAssistEfficiencyWeight(
        existing.assistCount,
        existing.assistPrestige,
        existing.assistEfficiency
      );
      const incomingEfficiencyWeight = getAssistEfficiencyWeight(
        assistCount,
        assistPrestige,
        assistEfficiency
      );

      existing.assistPrestige += assistPrestige;
      existing.assistCount += assistCount;
      existing.assistFrequencyPerGame += assistFrequencyPerGame;
      existing.assistEfficiency =
        existingEfficiencyWeight + incomingEfficiencyWeight > 0
          ? (
              existing.assistEfficiency * existingEfficiencyWeight +
              assistEfficiency * incomingEfficiencyWeight
            ) /
            (existingEfficiencyWeight + incomingEfficiencyWeight)
          : 0;
    } else {
      linkMap.set(linkId, {
        id: linkId,
        source: sourceId,
        target: targetId,
        value: 0,
        assistCount,
        assistPrestige,
        assistEfficiency,
        assistFrequencyPerGame,
        labelText: "",
        sourceLabel: sourceNode.label,
        targetLabel: targetNode.label,
      });
    }
  }

  const nodes = Array.from(nodeMap.values()).map((node) => {
    const supportBalance = node.incomingPrestige - node.outgoingPrestige;
    const involvementFrequencyPerGame =
      node.incomingFrequency + node.outgoingFrequency;

    return {
      id: node.id,
      label: node.label,
      value: involvementFrequencyPerGame,
      involvementFrequencyPerGame,
      supportBalance,
    };
  });

  const links = Array.from(linkMap.values()).map((link) => {
    const value = clampMin(link.assistFrequencyPerGame, 0);

    return {
      ...link,
      value,
      labelText: `${value.toFixed(1)}/game`,
    };
  });

  const filteredLinks = links
    .filter((link) => link.value > 0)
    .sort((a, b) => b.value - a.value);

  const values = [
    ...nodes.map((node) => node.value),
    ...filteredLinks.map((link) => link.value),
  ].filter((value) => Number.isFinite(value));

  return {
    nodes: nodes.sort((a, b) => b.value - a.value),
    links: filteredLinks,
    minValue: values.length ? Math.min(...values) : 0,
    maxValue: values.length ? Math.max(...values) : 0,
  };
}

export default buildAssistNetworkLayout;
