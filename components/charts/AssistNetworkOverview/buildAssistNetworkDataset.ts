import type { NormalizedGame } from "../../../utils/charts";

export type AssistNetworkDatasetEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  assistCount: number;
  assistPrestige: number;
  assistEfficiency: number;
  assistFrequencyPerGame: number;
};

export type AssistNetworkDatasetNode = {
  id: string;
  incomingCount: number;
  outgoingCount: number;
  incomingPrestige: number;
  outgoingPrestige: number;
  supportBalance: number;
  involvementFrequencyPerGame: number;
};

export type AssistNetworkDataset = {
  includedGameIds: string[];
  gameCount: number;
  exactScopeApplied: boolean;
  edges: AssistNetworkDatasetEdge[];
  nodes: AssistNetworkDatasetNode[];
};

type AssistNetworkNode = AssistNetworkDatasetNode;

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

function getAssistSourceMap(entry?: Record<string, unknown>): Record<string, number> {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return {};

  const candidates = [
    entry.assistPrestigeByPlayer,
    entry.assistPrestigeFromPlayers,
    entry.assistSources,
    entry.assistPrestigeBySource,
  ] as Array<Record<string, unknown> | undefined>;

  for (const candidate of candidates) {
    const normalized = normalizeAssistMap(candidate);
    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  return {};
}

function getAssistCountSourceMap(entry?: Record<string, unknown>): Record<string, number> {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return {};
  return normalizeAssistMap(
    entry.assistCountBySource as Record<string, unknown> | undefined
  );
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
  exactScopePlayerIds,
}: {
  games: NormalizedGame[];
  scopedPlayerIds?: string[];
  exactScopePlayerIds?: string[];
}): AssistNetworkDataset {
  const normalizedGames = Array.isArray(games) ? games : [];
  const normalizedVisibleScopeIds = normalizeScopedPlayerIds(scopedPlayerIds);
  const visibleScopeSet = normalizedVisibleScopeIds.length
    ? new Set(normalizedVisibleScopeIds)
    : null;
  const normalizedExactScopeIds = normalizeScopedPlayerIds(exactScopePlayerIds);
  const exactScopeApplied = normalizedExactScopeIds.length >= 2;
  const includedGames = exactScopeApplied
    ? normalizedGames.filter((game) =>
        matchesExactPlayerScope(game, normalizedExactScopeIds)
      )
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
        involvementFrequencyPerGame: 0,
      });
    }

    return nodeMap.get(playerId)!;
  };

  const addAssistEdge = (
    sourceId: string,
    targetId: string,
    assistPrestige: number,
    assistCount: number
  ) => {
    const linkId = `${sourceId}__${targetId}`;
    const sourceNode = ensureNode(sourceId);
    const targetNode = ensureNode(targetId);
    if (!sourceNode || !targetNode) return;

    sourceNode.outgoingCount += assistCount;
    sourceNode.outgoingPrestige += assistPrestige;

    targetNode.incomingCount += assistCount;
    targetNode.incomingPrestige += assistPrestige;

    const existingEdge = edgeMap.get(linkId);
    if (existingEdge) {
      existingEdge.assistCount += assistCount;
      existingEdge.assistPrestige += assistPrestige;
      existingEdge.assistEfficiency =
        existingEdge.assistCount > 0
          ? existingEdge.assistPrestige / existingEdge.assistCount
          : 0;
      return;
    }

    edgeMap.set(linkId, {
      id: linkId,
      sourceId,
      targetId,
      assistCount,
      assistPrestige,
      assistEfficiency: assistCount > 0 ? assistPrestige / assistCount : 0,
      assistFrequencyPerGame: 0,
    });
  };

  for (const game of includedGames) {
    const gameEdgeMap = new Map<
      string,
      {
        sourceId: string;
        targetId: string;
        assistCount: number;
        assistPrestige: number;
      }
    >();

    const accumulateGameEdge = (
      sourceId: string,
      targetId: string,
      assistCount: number,
      assistPrestige: number
    ) => {
      const linkId = `${sourceId}__${targetId}`;
      const existing = gameEdgeMap.get(linkId);

      if (!existing) {
        gameEdgeMap.set(linkId, {
          sourceId,
          targetId,
          assistCount,
          assistPrestige,
        });
        return;
      }

      existing.assistCount += assistCount;
      existing.assistPrestige += assistPrestige;
    };

    const reconcileGameEdgeTotals = (
      sourceId: string,
      targetId: string,
      assistCount: number,
      assistPrestige: number
    ) => {
      const linkId = `${sourceId}__${targetId}`;
      const existing = gameEdgeMap.get(linkId);

      if (!existing) {
        gameEdgeMap.set(linkId, {
          sourceId,
          targetId,
          assistCount,
          assistPrestige,
        });
        return;
      }

      existing.assistCount = Math.max(existing.assistCount, assistCount);
      existing.assistPrestige = Math.max(existing.assistPrestige, assistPrestige);
    };

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
        if (
          visibleScopeSet &&
          (!visibleScopeSet.has(sourceId) || !visibleScopeSet.has(targetId))
        ) {
          continue;
        }

        const assistPrestige = Math.max(
          0,
          toNumber(assistPrestigeRecipients[targetId])
        );
        accumulateGameEdge(sourceId, targetId, 1, assistPrestige);
      }
    }

    for (const [recipientIdRaw, rawTotals] of Object.entries(game.totals ?? {})) {
      const recipientId = normalizePlayerId(recipientIdRaw);
      if (!recipientId) continue;

      const assistSourceMap = getAssistSourceMap(
        rawTotals as Record<string, unknown>
      );
      const assistCountSourceMap = getAssistCountSourceMap(
        rawTotals as Record<string, unknown>
      );
      const assistSourceIds = new Set([
        ...Object.keys(assistSourceMap),
        ...Object.keys(assistCountSourceMap),
      ]);

      for (const sourceIdRaw of assistSourceIds) {
        const sourceId = normalizePlayerId(sourceIdRaw);
        if (!sourceId || sourceId === recipientId) continue;
        if (
          visibleScopeSet &&
          (!visibleScopeSet.has(sourceId) || !visibleScopeSet.has(recipientId))
        ) {
          continue;
        }

        const assistPrestige = Math.max(
          0,
          toNumber(assistSourceMap[sourceIdRaw])
        );
        const assistCount = Math.max(
          0,
          toNumber(assistCountSourceMap[sourceIdRaw])
        );
        const normalizedAssistCount =
          assistCount > 0 ? assistCount : assistPrestige > 0 ? 1 : 0;
        if (normalizedAssistCount <= 0 && assistPrestige <= 0) continue;

        reconcileGameEdgeTotals(
          sourceId,
          recipientId,
          normalizedAssistCount,
          assistPrestige
        );
      }
    }

    for (const edge of gameEdgeMap.values()) {
      addAssistEdge(
        edge.sourceId,
        edge.targetId,
        edge.assistPrestige,
        edge.assistCount
      );
    }
  }

  const sampleGames = Math.max(includedGames.length, 1);
  const nodes = Array.from(nodeMap.values()).map((node) => ({
    ...node,
    supportBalance: node.incomingPrestige - node.outgoingPrestige,
    involvementFrequencyPerGame:
      (node.incomingCount + node.outgoingCount) / sampleGames,
  }));

  const edges = Array.from(edgeMap.values())
    .map((edge) => ({
      ...edge,
      assistFrequencyPerGame: edge.assistCount / sampleGames,
    }))
    .sort((a, b) => {
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
