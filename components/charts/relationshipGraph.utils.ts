import { chartColors } from '@/utils/chartTheme';
import {
  EDGE_STROKE_RANGE,
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  GRAPH_RADIUS,
  MAX_SELECTED_EDGE_BONUS,
  MIN_EDGE_STROKE,
  MIN_NODE_RADIUS,
  NODE_RADIUS_RANGE,
} from './relationshipGraph.constants';
import type {
  GraphEdge,
  GraphLayout,
  GraphNode,
  NodeStats,
  Player,
  Relationships,
} from './relationshipGraph.types';

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export const getPlayerColor = (color?: string): string => {
  if (typeof color === 'string' && color.trim().length > 0) {
    return color;
  }

  return chartColors.purple;
};

export const buildNodeStats = (
  players: readonly Player[],
  relationships: Relationships
): Map<string, NodeStats> => {
  const stats = new Map<string, NodeStats>();

  for (const player of players) {
    stats.set(player.id, { sent: 0, received: 0, involvement: 0 });
  }

  for (const [fromId, nested] of Object.entries(relationships ?? {})) {
    for (const [toId, rawWeight] of Object.entries(nested ?? {})) {
      const weight = Math.max(0, toNumber(rawWeight));

      const fromStats = stats.get(fromId);
      if (fromStats) fromStats.sent += weight;

      const toStats = stats.get(toId);
      if (toStats) toStats.received += weight;
    }
  }

  for (const stat of stats.values()) {
    stat.involvement = stat.sent + stat.received;
  }

  return stats;
};

export const buildRelationshipGraphLayout = (
  players: readonly Player[],
  relationships: Relationships,
  maxItems: number
): GraphLayout => {
  const count = Math.max(players.length, 1);
  const stats = buildNodeStats(players, relationships);

  const maxInvolvement = Math.max(
    1,
    ...Array.from(stats.values(), (value) => value.involvement)
  );

  const nodes: GraphNode[] = players.map((player, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const nodeStats = stats.get(player.id) ?? {
      sent: 0,
      received: 0,
      involvement: 0,
    };

    return {
      ...player,
      ...nodeStats,
      x: GRAPH_CENTER_X + Math.cos(angle) * GRAPH_RADIUS,
      y: GRAPH_CENTER_Y + Math.sin(angle) * GRAPH_RADIUS,
      colorValue: getPlayerColor(player.color),
      radius:
        MIN_NODE_RADIUS +
        (nodeStats.involvement / maxInvolvement) * NODE_RADIUS_RANGE,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const rawEdges: Omit<GraphEdge, 'strokeWidth'>[] = [];
  let maxWeight = 1;

  for (const [fromId, nested] of Object.entries(relationships ?? {})) {
    for (const [toId, rawWeight] of Object.entries(nested ?? {})) {
      const weight = toNumber(rawWeight);
      if (weight <= 0) continue;

      const fromNode = nodeById.get(fromId);
      const toNode = nodeById.get(toId);

      if (!fromNode || !toNode) continue;

      rawEdges.push({
        key: `${fromId}-${toId}`,
        fromId,
        toId,
        weight,
        color: fromNode.colorValue,
        fromName: fromNode.name,
        toName: toNode.name,
        fromX: fromNode.x,
        fromY: fromNode.y,
        toX: toNode.x,
        toY: toNode.y,
      });

      maxWeight = Math.max(maxWeight, weight);
    }
  }

  rawEdges.sort((a, b) => b.weight - a.weight);

  const edges: GraphEdge[] = rawEdges
    .slice(0, Math.max(1, maxItems))
    .map((edge) => ({
      ...edge,
      strokeWidth:
        MIN_EDGE_STROKE +
        (edge.weight / maxWeight) * (EDGE_STROKE_RANGE + MAX_SELECTED_EDGE_BONUS),
    }));

  return {
    nodes,
    edges,
    maxWeight,
  };
};
