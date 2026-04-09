import { chartColors } from "@/utils/chartTheme";
import {
  DOMINANCE_GREEN,
  DOMINANCE_NEUTRAL,
  DOMINANCE_RED,
  EDGE_CURVE_STRENGTH,
  EDGE_STROKE_RANGE,
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  GRAPH_RADIUS,
  MAX_SELECTED_EDGE_BONUS,
  MIN_EDGE_STROKE,
  MIN_NODE_RADIUS,
  NODE_RADIUS_RANGE,
} from "./relationshipGraph.constants";
import type {
  EdgeFilterMode,
  GraphEdge,
  GraphLayout,
  GraphNode,
  NodeStats,
  Player,
  Relationships,
} from "./relationshipGraph.types";

type RawEdge = Omit<GraphEdge, "strokeWidth" | "opacity">;

const TAU = Math.PI * 2;

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const safeFinite = (value: unknown, fallback = 0) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const isFinitePoint = (...values: unknown[]) => values.every((value) => Number.isFinite(Number(value)));

export const getPlayerColor = (color?: string): string => {
  if (typeof color === "string" && color.trim().length > 0) {
    return color.trim();
  }
  return chartColors.purple;
};

export const buildNodeStats = (
  players: readonly Player[],
  relationships: Relationships
): Map<string, NodeStats> => {
  const stats = new Map<string, NodeStats>();

  for (const player of players) {
    stats.set(String(player.id), {
      sent: 0,
      received: 0,
      involvement: 0,
      supportBalance: 0,
    });
  }

  for (const [fromIdRaw, nested] of Object.entries(relationships ?? {})) {
    const fromId = String(fromIdRaw);

    if (!stats.has(fromId)) {
      stats.set(fromId, {
        sent: 0,
        received: 0,
        involvement: 0,
        supportBalance: 0,
      });
    }

    for (const [toIdRaw, rawWeight] of Object.entries(nested ?? {})) {
      const toId = String(toIdRaw);
      const weight = Math.max(0, toNumber(rawWeight));
      if (weight <= 0 || fromId === toId) continue;

      if (!stats.has(toId)) {
        stats.set(toId, {
          sent: 0,
          received: 0,
          involvement: 0,
          supportBalance: 0,
        });
      }

      const fromStats = stats.get(fromId);
      if (fromStats) fromStats.sent += weight;

      const toStats = stats.get(toId);
      if (toStats) toStats.received += weight;
    }
  }

  for (const stat of stats.values()) {
    stat.involvement = stat.sent + stat.received;
    stat.supportBalance = stat.received - stat.sent;
  }

  return stats;
};

export function getDominanceMeta(balance: number) {
  if (balance > 0.01) {
    return { color: DOMINANCE_GREEN, label: "Net receiver" };
  }
  if (balance < -0.01) {
    return { color: DOMINANCE_RED, label: "Net sender" };
  }
  return { color: DOMINANCE_NEUTRAL, label: "Balanced" };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, safeFinite(value)));
}

function safeRatio(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return clamp(value / maxValue, 0, 1);
}

function easedEdgeRatio(weight: number, maxWeight: number) {
  const ratio = safeRatio(weight, maxWeight);
  return Math.sqrt(ratio);
}

function getQuadraticControlPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  curveOffset: number
) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));

  const normalX = -dy / length;
  const normalY = dx / length;

  return {
    cx: safeFinite(midX + normalX * curveOffset),
    cy: safeFinite(midY + normalY * curveOffset),
  };
}

export function buildQuadraticPath(
  edge: Pick<GraphEdge, "fromX" | "fromY" | "toX" | "toY" | "curveOffset">
): string {
  if (!isFinitePoint(edge.fromX, edge.fromY, edge.toX, edge.toY, edge.curveOffset)) {
    return "";
  }

  const { cx, cy } = getQuadraticControlPoint(
    safeFinite(edge.fromX),
    safeFinite(edge.fromY),
    safeFinite(edge.toX),
    safeFinite(edge.toY),
    safeFinite(edge.curveOffset)
  );

  const d = `M ${safeFinite(edge.fromX).toFixed(2)} ${safeFinite(edge.fromY).toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${safeFinite(edge.toX).toFixed(2)} ${safeFinite(edge.toY).toFixed(2)}`;
  return /NaN|Infinity|undefined|null/.test(d) ? "" : d;
}

export function buildArrowPath(
  edge: Pick<GraphEdge, "fromX" | "fromY" | "toX" | "toY" | "curveOffset">,
  arrowSize = 7
): string {
  if (!isFinitePoint(edge.fromX, edge.fromY, edge.toX, edge.toY, edge.curveOffset)) {
    return "";
  }

  const { cx, cy } = getQuadraticControlPoint(
    safeFinite(edge.fromX),
    safeFinite(edge.fromY),
    safeFinite(edge.toX),
    safeFinite(edge.toY),
    safeFinite(edge.curveOffset)
  );

  const t = 0.97;

  const x =
    (1 - t) * (1 - t) * safeFinite(edge.fromX) +
    2 * (1 - t) * t * cx +
    t * t * safeFinite(edge.toX);

  const y =
    (1 - t) * (1 - t) * safeFinite(edge.fromY) +
    2 * (1 - t) * t * cy +
    t * t * safeFinite(edge.toY);

  const dx = 2 * (1 - t) * (cx - safeFinite(edge.fromX)) + 2 * t * (safeFinite(edge.toX) - cx);
  const dy = 2 * (1 - t) * (cy - safeFinite(edge.fromY)) + 2 * t * (safeFinite(edge.toY) - cy);
  const angle = Math.atan2(dy, dx);

  const tipX = safeFinite(edge.toX);
  const tipY = safeFinite(edge.toY);

  const leftX = x - arrowSize * Math.cos(angle - Math.PI / 6);
  const leftY = y - arrowSize * Math.sin(angle - Math.PI / 6);
  const rightX = x - arrowSize * Math.cos(angle + Math.PI / 6);
  const rightY = y - arrowSize * Math.sin(angle + Math.PI / 6);

  const d = `M ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${safeFinite(leftX).toFixed(2)} ${safeFinite(leftY).toFixed(2)} L ${safeFinite(rightX).toFixed(2)} ${safeFinite(rightY).toFixed(2)} Z`;
  return /NaN|Infinity|undefined|null/.test(d) ? "" : d;
}

function filterEdgesTopNPerNode(edges: RawEdge[], topEdgesPerNode: EdgeFilterMode) {
  if (topEdgesPerNode === 999) {
    return edges;
  }

  const outgoingByNode = new Map<string, RawEdge[]>();

  for (const edge of edges) {
    const list = outgoingByNode.get(edge.fromId) ?? [];
    list.push(edge);
    outgoingByNode.set(edge.fromId, list);
  }

  const kept = new Set<string>();

  for (const [, list] of outgoingByNode.entries()) {
    list
      .sort((a, b) => b.weight - a.weight)
      .slice(0, topEdgesPerNode)
      .forEach((edge) => kept.add(edge.key));
  }

  return edges.filter((edge) => kept.has(edge.key));
}

function buildNodeOrder(players: readonly Player[]) {
  return [...players];
}

function getNodeAnchorPoint(fromNode: GraphNode, toNode: GraphNode) {
  const dx = safeFinite(toNode.x - fromNode.x);
  const dy = safeFinite(toNode.y - fromNode.y);
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const unitX = dx / length;
  const unitY = dy / length;

  return {
    startX: safeFinite(fromNode.x + unitX * fromNode.radius),
    startY: safeFinite(fromNode.y + unitY * fromNode.radius),
    endX: safeFinite(toNode.x - unitX * toNode.radius),
    endY: safeFinite(toNode.y - unitY * toNode.radius),
    length,
  };
}

export function buildRelationshipGraphLayout(
  players: readonly Player[] = [],
  relationships: Relationships = {},
  maxItems = 40,
  topEdgesPerNode: EdgeFilterMode = 3
): GraphLayout {
  const limitedPlayers = [...players].slice(0, Math.max(1, maxItems));
  const stats = buildNodeStats(limitedPlayers, relationships);
  const maxInvolvement = Math.max(
    1,
    ...limitedPlayers.map((player) => stats.get(String(player.id))?.involvement ?? 0)
  );

  const orderedPlayers = buildNodeOrder(limitedPlayers);
  const nodes: GraphNode[] = orderedPlayers.map((player, index) => {
    const angle = -Math.PI / 2 + (TAU * index) / Math.max(1, orderedPlayers.length);
    const stat = stats.get(String(player.id));
    const involvement = stat?.involvement ?? 0;
    const ratio = safeRatio(involvement, maxInvolvement);
    const dominance = getDominanceMeta(stat?.supportBalance ?? 0);

    return {
      id: String(player.id),
      name: player.name,
      color: player.color,
      sent: stat?.sent ?? 0,
      received: stat?.received ?? 0,
      involvement,
      supportBalance: stat?.supportBalance ?? 0,
      x: safeFinite(GRAPH_CENTER_X + Math.cos(angle) * GRAPH_RADIUS),
      y: safeFinite(GRAPH_CENTER_Y + Math.sin(angle) * GRAPH_RADIUS),
      radius: MIN_NODE_RADIUS + ratio * NODE_RADIUS_RANGE,
      colorValue: getPlayerColor(player.color),
      dominanceColor: dominance.color,
      dominanceLabel: dominance.label,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const rawEdges: RawEdge[] = [];

  for (const [fromId, nested] of Object.entries(relationships ?? {})) {
    for (const [toId, rawWeight] of Object.entries(nested ?? {})) {
      const weight = Math.max(0, toNumber(rawWeight));
      if (weight <= 0 || fromId === toId) continue;

      const fromNode = nodeById.get(String(fromId));
      const toNode = nodeById.get(String(toId));
      if (!fromNode || !toNode) continue;

      const anchor = getNodeAnchorPoint(fromNode, toNode);
      if (!isFinitePoint(anchor.startX, anchor.startY, anchor.endX, anchor.endY)) continue;

      rawEdges.push({
        key: `${fromId}->${toId}`,
        fromId: String(fromId),
        toId: String(toId),
        weight,
        color: fromNode.colorValue,
        fromName: fromNode.name,
        toName: toNode.name,
        fromX: anchor.startX,
        fromY: anchor.startY,
        toX: anchor.endX,
        toY: anchor.endY,
        curveOffset: safeFinite(anchor.length * EDGE_CURVE_STRENGTH),
      });
    }
  }

  const filteredEdges = filterEdgesTopNPerNode(rawEdges, topEdgesPerNode);
  const maxWeight = Math.max(1, ...filteredEdges.map((edge) => edge.weight));

  const edges: GraphEdge[] = filteredEdges.map((edge) => {
    const ratio = easedEdgeRatio(edge.weight, maxWeight);
    return {
      ...edge,
      strokeWidth: MIN_EDGE_STROKE + ratio * EDGE_STROKE_RANGE,
      opacity: 0.35 + ratio * 0.55,
    };
  });

  return { nodes, edges, maxWeight };
}

export function getSelectedEdgeStrokeWidth(edge: Pick<GraphEdge, "strokeWidth">, active: boolean) {
  return active
    ? safeFinite(edge.strokeWidth) + MAX_SELECTED_EDGE_BONUS
    : safeFinite(edge.strokeWidth, MIN_EDGE_STROKE);
}
