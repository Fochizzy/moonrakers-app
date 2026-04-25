import type { NormalizedGame } from "../../../utils/charts";

export type AssistNetworkDatasetEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  assistCount: number;
  assistPrestige: number;
  assistEfficiency: number;
};

export type AssistNetworkDataset = {
  includedGameIds: string[];
  gameCount: number;
  exactScopeApplied: boolean;
  edges: AssistNetworkDatasetEdge[];
  nodes: Array<{
    id: string;
    incomingCount: number;
    outgoingCount: number;
    incomingPrestige: number;
    outgoingPrestige: number;
    supportBalance: number;
  }>;
};

type AssistNetworkNode = AssistNetworkDataset["nodes"][number];

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlayerId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeScopedPlayerIds(scopedPlayerIds?: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawId of scopedPlayerIds ?? []) {
    const id = normalizePlayerId(rawId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function normalizeAssistMap(
  input: Record<string, unknown> | undefined
): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [targetIdRaw, rawValue] of Object.entries(input ?? {})) {
    const targetId = normalizePlayerId(targetIdRaw);
    if (!targetId) continue;
    normalized[targetId] = toNumber(rawValue);
  }

  return normalized;
}

function matchesExactPlayerScope(game: NormalizedGame, scopedPlayerIds: string[]) {
  const gameIds = new Set(
    (game.players ?? [])
      .map((player) => normalizePlayerId(player?.id))
      .filter(Boolean)
  );
  if (gameIds.size !== scopedPlayerIds.length) return false;
  return scopedPlayerIds.every((id) => gameIds.has(normalizePlayerId(id)));
}

export function buildAssistNetworkDataset({
  games,
  scopedPlayerIds,
}: {
  games: NormalizedGame[];
  scopedPlayerIds?: string[];
}): AssistNetworkDataset {
  const normalizedGames = Array.isArray(games) ? games : [];
  const normalizedScopeIds = normalizeScopedPlayerIds(scopedPlayerIds);
  const exactScopeApplied = normalizedScopeIds.length >= 2;
  const includedGames = exactScopeApplied
    ? normalizedGames.filter((game) => matchesExactPlayerScope(game, normalizedScopeIds))
    : normalizedGames;

  const nodeMap = new Map<string, AssistNetworkNode>();
  const edgeMap = new Map<string, AssistNetworkDatasetEdge>();

  const ensureNode = (playerIdRaw: unknown) => {
    const playerId = normalizePlayerId(playerIdRaw);
    if (!playerId) return null;

    if (!nodeMap.has(playerId)) {
      nodeMap.set(playerId, {
        id: playerId,
        incomingCount: 0,
        outgoingCount: 0,
        incomingPrestige: 0,
        outgoingPrestige: 0,
        supportBalance: 0,
      });
    }

    return nodeMap.get(playerId)!;
  };

  for (const game of includedGames) {
    for (const player of game.players ?? []) {
      ensureNode(player?.id);
    }

    for (const round of game.rounds ?? []) {
      const sourceId = normalizePlayerId(round?.playerId);
      if (!sourceId) continue;

      const assistRecipients = round?.assistRecipients ?? {};
      const assistPrestigeRecipients = normalizeAssistMap(
        round?.assistPrestigeRecipients as Record<string, unknown> | undefined
      );

      for (const [targetIdRaw, rawAssist] of Object.entries(assistRecipients)) {
        const targetId = normalizePlayerId(targetIdRaw);
        if (!targetId || targetId === sourceId) continue;
        if (toNumber(rawAssist) <= 0) continue;

        const assistPrestige = Math.max(
          0,
          toNumber(assistPrestigeRecipients[targetId])
        );
        const linkId = `${sourceId}__${targetId}`;

        const sourceNode = ensureNode(sourceId);
        const targetNode = ensureNode(targetId);
        if (!sourceNode || !targetNode) continue;

        sourceNode.outgoingCount += 1;
        sourceNode.outgoingPrestige += assistPrestige;

        targetNode.incomingCount += 1;
        targetNode.incomingPrestige += assistPrestige;

        const existingEdge = edgeMap.get(linkId);
        if (existingEdge) {
          existingEdge.assistCount += 1;
          existingEdge.assistPrestige += assistPrestige;
          existingEdge.assistEfficiency =
            existingEdge.assistCount > 0
              ? existingEdge.assistPrestige / existingEdge.assistCount
              : 0;
          continue;
        }

        edgeMap.set(linkId, {
          id: linkId,
          sourceId,
          targetId,
          assistCount: 1,
          assistPrestige,
          assistEfficiency: assistPrestige,
        });
      }
    }
  }

  const nodes = Array.from(nodeMap.values()).map((node) => ({
    ...node,
    supportBalance: node.incomingPrestige - node.outgoingPrestige,
  }));

  const edges = Array.from(edgeMap.values()).sort((a, b) => {
    if (b.assistCount !== a.assistCount) return b.assistCount - a.assistCount;
    if (b.assistPrestige !== a.assistPrestige) return b.assistPrestige - a.assistPrestige;
    return a.id.localeCompare(b.id);
  });

  return {
    includedGameIds: includedGames.map((game) => String(game.id)),
    gameCount: includedGames.length,
    exactScopeApplied,
    edges,
    nodes,
  };
}

export default buildAssistNetworkDataset;
