import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

import Text from "@/components/ui/Text";
import {
  DEFAULT_MAX_ITEMS,
  EDGE_ARROW_SIZE,
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  NODE_LABEL_OFFSET,
} from "./relationshipGraph.constants";
import {
  buildArrowPath,
  buildQuadraticPath,
  buildRelationshipGraphLayout,
  getSelectedEdgeStrokeWidth,
} from "./relationshipGraph.utils";
import buildAssistNetworkLayout from "@/components/charts/AssistNetworkOverview/buildAssistNetworkLayout";

type Player = { id: string; name?: string; color?: string };
type Relationships = Record<string, Record<string, number>>;
type RelationshipEdge = { source?: string; target?: string; fromId?: string; toId?: string; value?: number; weight?: number };
type AssistMode = "assistPrestige" | "assistCount" | "assistEfficiency" | "supportBalance";
type GraphVariant = "relationship" | "assist_network";
type GraphMode = "flow" | "network";
type EdgeFilterMode = 1 | 2 | 3 | 5 | 999;

type Props = {
  players?: Player[];
  relationships?: Relationships | RelationshipEdge[];
  scopedPlayerIds?: string[];
  variant?: GraphVariant;
  mode?: GraphMode;
  initialView?: GraphMode;
  assistMode?: AssistMode;
  topEdgesPerNode?: EdgeFilterMode;
  maxItems?: number;
  title?: string;
  subtitle?: string;
};

type SuperNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  colorValue: string;
  dominanceColor: string;
  dominanceLabel: string;
  supportBalance: number;
};

type SuperEdge = {
  key: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  weight: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX?: number;
  controlY?: number;
  angle?: number;
  curveOffset?: number;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
};

const FILTER_OPTIONS: EdgeFilterMode[] = [1, 2, 3, 5, 999];
const VIEW_OPTIONS: GraphMode[] = ["flow", "network"];
const ASSIST_MODE_OPTIONS: AssistMode[] = [
  "assistPrestige",
  "assistCount",
  "assistEfficiency",
  "supportBalance",
];

const COLORS = {
  wrap: "#E2E8F0",
  sub: "#94A3B8",
  panel: "rgba(16,24,48,0.95)",
  card: "rgba(12,18,38,0.92)",
  border: "rgba(255,255,255,0.08)",
  accent: "#A855F7",
  green: "#22C55E",
  red: "#EF4444",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeColor(color?: string, index = 0): string {
  if (typeof color === "string" && color.trim()) return color.trim();
  const fallback = ["#A855F7", "#3B82F6", "#22C55E", "#3B82F6", "#EF4444", "#14B8A6"];
  return fallback[index % fallback.length];
}

function formatSigned(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function getFilterLabel(value: EdgeFilterMode) {
  return value === 999 ? "All" : `Top ${value}`;
}

function getAssistModeLabel(value: AssistMode) {
  switch (value) {
    case "assistPrestige":
      return "Prestige";
    case "assistCount":
      return "Count";
    case "assistEfficiency":
      return "Efficiency";
    case "supportBalance":
      return "Balance";
  }
}

function getDominanceColor(balance: number) {
  if (balance > 0.05) return COLORS.green;
  if (balance < -0.05) return COLORS.red;
  return COLORS.accent;
}

function getDominanceLabel(balance: number) {
  if (balance > 0.05) return "Net Receiver";
  if (balance < -0.05) return "Net Sender";
  return "Balanced";
}

function isEdgeActive(edge: SuperEdge, selectedNodeId: string | null) {
  if (!selectedNodeId) return true;
  return edge.fromId === selectedNodeId || edge.toId === selectedNodeId;
}

function safeNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isFiniteEdge(edge: SuperEdge) {
  return [
    edge.startX,
    edge.startY,
    edge.endX,
    edge.endY,
    edge.strokeWidth,
    edge.opacity,
  ].every((value) => Number.isFinite(Number(value)));
}

function safePath(path: string) {
  return path && !/NaN|Infinity|undefined|null/.test(path) ? path : "";
}

function UnderlineOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.underlineButton} onPress={onPress} activeOpacity={0.9}>
      <Text style={[styles.underlineText, active && styles.underlineTextActive]}>{label}</Text>
      <View style={[styles.underlineLine, active && styles.underlineLineActive]} />
    </TouchableOpacity>
  );
}

function normalizeRelationships(
  input: Relationships | RelationshipEdge[] | undefined
): Relationships {
  if (!input) return {};

  if (Array.isArray(input)) {
    const out: Relationships = {};
    input.forEach((edge) => {
      const fromId = String(edge.fromId ?? edge.source ?? "").trim();
      const toId = String(edge.toId ?? edge.target ?? "").trim();
      const value = toNumber(edge.weight ?? edge.value);
      if (!fromId || !toId || fromId === toId || value <= 0) return;
      if (!out[fromId]) out[fromId] = {};
      out[fromId][toId] = (out[fromId][toId] || 0) + value;
    });
    return out;
  }

  return input;
}

function buildScopedRelationships(
  relationshipsInput: Relationships | RelationshipEdge[],
  scopedIds?: string[]
): Relationships {
  const relationships = normalizeRelationships(relationshipsInput);

  if (!scopedIds?.length) return relationships ?? {};
  const allowed = new Set(scopedIds.map(String));
  const next: Relationships = {};

  Object.entries(relationships ?? {}).forEach(([fromId, nested]) => {
    if (!allowed.has(String(fromId))) return;

    Object.entries(nested ?? {}).forEach(([toId, raw]) => {
      if (!allowed.has(String(toId))) return;
      const value = toNumber(raw);
      if (value <= 0) return;
      if (!next[fromId]) next[fromId] = {};
      next[fromId][toId] = value;
    });
  });

  return next;
}

function filterTopEdgesPerNode<
  T extends { source?: string; fromId?: string; target?: string; toId?: string; value?: number; weight?: number }
>(edges: T[], topEdgesPerNode: EdgeFilterMode): T[] {
  if (topEdgesPerNode === 999) return edges;

  const grouped = new Map<string, T[]>();
  edges.forEach((edge) => {
    const source = String(edge.fromId ?? edge.source ?? "");
    if (!source) return;
    if (!grouped.has(source)) grouped.set(source, []);
    grouped.get(source)!.push(edge);
  });

  const out: T[] = [];
  grouped.forEach((list) => {
    out.push(
      ...[...list]
        .sort((a, b) => toNumber(b.weight ?? b.value) - toNumber(a.weight ?? a.value))
        .slice(0, topEdgesPerNode)
    );
  });

  return out;
}

function buildDeterministicAssistLayout(
  players: Player[],
  relationships: Relationships,
  assistMode: AssistMode,
  topEdgesPerNode: EdgeFilterMode
): { nodes: SuperNode[]; edges: SuperEdge[] } {
  const network = buildAssistNetworkLayout(relationships, players, assistMode as any);
  const filteredLinks = filterTopEdgesPerNode(network.links as any[], topEdgesPerNode);

  const cx = GRAPH_WIDTH / 2;
  const cy = GRAPH_HEIGHT / 2;
  const orbitX = GRAPH_WIDTH * 0.34;
  const orbitY = GRAPH_HEIGHT * 0.29;

  const nodesSorted = [...network.nodes].sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label)
  );
  const byId = new Map(players.map((player) => [String(player.id), player]));
  const valueMax = Math.max(1, ...nodesSorted.map((n) => safeNum(n.value)));

  const nodes: SuperNode[] = nodesSorted.map((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, nodesSorted.length)) * Math.PI * 2;
    const player = byId.get(node.id);
    const supportBalance = safeNum(node.supportBalance);

    return {
      id: node.id,
      name: node.label,
      x: safeNum(cx + Math.cos(angle) * orbitX, cx),
      y: safeNum(cy + Math.sin(angle) * orbitY, cy),
      radius: 14 + (safeNum(node.value) / valueMax) * 18,
      colorValue: normalizeColor(player?.color, index),
      dominanceColor: getDominanceColor(supportBalance),
      dominanceLabel: getDominanceLabel(supportBalance),
      supportBalance,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeMax = Math.max(1, ...filteredLinks.map((l: any) => safeNum(l.value)));

  const edges: SuperEdge[] = filteredLinks
    .map((link: any) => {
      const fromNode = nodeById.get(link.source);
      const toNode = nodeById.get(link.target);
      if (!fromNode || !toNode) return null;

      const dx = safeNum(toNode.x - fromNode.x);
      const dy = safeNum(toNode.y - fromNode.y);
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const ux = dx / distance;
      const uy = dy / distance;

      const startX = safeNum(fromNode.x + ux * fromNode.radius, fromNode.x);
      const startY = safeNum(fromNode.y + uy * fromNode.radius, fromNode.y);
      const endX = safeNum(toNode.x - ux * toNode.radius, toNode.x);
      const endY = safeNum(toNode.y - uy * toNode.radius, toNode.y);

      const mx = (startX + endX) / 2;
      const my = (startY + endY) / 2;
      const perpX = -uy;
      const perpY = ux;
      const bend = clamp(distance * 0.12, 18, 54);
      const controlX = safeNum(mx + perpX * bend, mx);
      const controlY = safeNum(my + perpY * bend, my);

      return {
        key: String(link.id ?? `${link.source}->${link.target}`),
        fromId: String(link.source ?? ""),
        toId: String(link.target ?? ""),
        fromName: String(link.sourceLabel ?? ""),
        toName: String(link.targetLabel ?? ""),
        weight: safeNum(link.value),
        color: fromNode.colorValue,
        strokeWidth: 1.5 + (safeNum(link.value) / edgeMax) * 5,
        opacity: 0.66,
        startX,
        startY,
        endX,
        endY,
        controlX,
        controlY,
        angle: Math.atan2(endY - controlY, endX - controlX),
      };
    })
    .filter((edge): edge is SuperEdge => Boolean(edge && isFiniteEdge(edge)));

  return { nodes, edges };
}

export default function RelationshipGraph({
  players = [],
  relationships = {},
  scopedPlayerIds,
  variant = "relationship",
  mode = "flow",
  initialView,
  assistMode = "assistPrestige",
  topEdgesPerNode = 3,
  title = "Relationship Graph",
  subtitle,
}: Props) {
  const resolvedMode = initialView ?? mode;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [internalMode, setInternalMode] = useState<GraphMode>(resolvedMode);
  const [internalTopEdgesPerNode, setInternalTopEdgesPerNode] =
    useState<EdgeFilterMode>(topEdgesPerNode);
  const [internalAssistMode, setInternalAssistMode] =
    useState<AssistMode>(assistMode);

  useEffect(() => setInternalMode(resolvedMode), [resolvedMode]);
  useEffect(() => setInternalTopEdgesPerNode(topEdgesPerNode), [topEdgesPerNode]);
  useEffect(() => setInternalAssistMode(assistMode), [assistMode]);

  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return players;
    const allowed = new Set(scopedPlayerIds.map(String));
    return players.filter((player) => allowed.has(String(player.id)));
  }, [players, scopedPlayerIds]);

  const scopedRelationships = useMemo(
    () => buildScopedRelationships(relationships ?? {}, scopedPlayerIds),
    [relationships, scopedPlayerIds]
  );

  const layout = useMemo(() => {
    if (variant === "assist_network") {
      return buildDeterministicAssistLayout(
        visiblePlayers,
        scopedRelationships,
        internalAssistMode,
        internalTopEdgesPerNode
      );
    }

    return buildRelationshipGraphLayout(
      visiblePlayers as any,
      scopedRelationships ?? {},
      DEFAULT_MAX_ITEMS,
      internalTopEdgesPerNode
    ) as { nodes: SuperNode[]; edges: SuperEdge[] };
  }, [variant, visiblePlayers, scopedRelationships, internalAssistMode, internalTopEdgesPerNode]);

  const selectedNode = layout.nodes.find((node) => node.id === selectedNodeId) ?? null;

  useEffect(() => {
    if (!selectedNodeId) return;
    if (layout.nodes.some((node) => node.id === selectedNodeId)) return;
    setSelectedNodeId(null);
  }, [layout.nodes, selectedNodeId]);

  const focusedEdges = useMemo(() => {
    const base = selectedNodeId
      ? layout.edges.filter(
          (edge) => edge.fromId === selectedNodeId || edge.toId === selectedNodeId
        )
      : layout.edges;

    return [...base].sort((a, b) => b.weight - a.weight).slice(0, 6);
  }, [layout.edges, selectedNodeId]);

  const resolvedSubtitle =
    subtitle ??
    (variant === "assist_network"
      ? `Metric-driven support network · ${getAssistModeLabel(internalAssistMode)}`
      : "Directed assist flow across unified games.");

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{resolvedSubtitle}</Text>

      <View style={styles.panel}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>View</Text>
          <Text style={styles.sectionSub}>Flow vs network layout</Text>
        </View>
        <View style={styles.optionRow}>
          {VIEW_OPTIONS.map((option) => (
            <UnderlineOption
              key={option}
              label={option}
              active={internalMode === option}
              onPress={() => setInternalMode(option)}
            />
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Edges</Text>
          <Text style={styles.sectionSub}>Density filter</Text>
        </View>
        <View style={styles.optionRow}>
          {FILTER_OPTIONS.map((option) => (
            <UnderlineOption
              key={String(option)}
              label={getFilterLabel(option)}
              active={internalTopEdgesPerNode === option}
              onPress={() => setInternalTopEdgesPerNode(option)}
            />
          ))}
        </View>

        {variant === "assist_network" ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Assist Metric</Text>
              <Text style={styles.sectionSub}>Network weighting</Text>
            </View>
            <View style={styles.optionRow}>
              {ASSIST_MODE_OPTIONS.map((option) => (
                <UnderlineOption
                  key={option}
                  label={getAssistModeLabel(option)}
                  active={internalAssistMode === option}
                  onPress={() => setInternalAssistMode(option)}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.chartCard}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            {layout.edges
              .filter((edge) => isFiniteEdge(edge))
              .map((edge) => {
                const edgeInput = {
                  fromX: safeNum((edge as any).fromX ?? edge.startX),
                  fromY: safeNum((edge as any).fromY ?? edge.startY),
                  toX: safeNum((edge as any).toX ?? edge.endX),
                  toY: safeNum((edge as any).toY ?? edge.endY),
                  curveOffset:
                    safeNum((edge as any).curveOffset) ||
                    Math.max(
                      12,
                      Math.sqrt(
                        Math.pow(safeNum((edge as any).toX ?? edge.endX) - safeNum((edge as any).fromX ?? edge.startX), 2) +
                        Math.pow(safeNum((edge as any).toY ?? edge.endY) - safeNum((edge as any).fromY ?? edge.startY), 2)
                      ) * 0.14
                    ),
                };

                const path =
                  variant === "assist_network"
                    ? safePath(
                        `M ${safeNum(edge.startX).toFixed(2)} ${safeNum(edge.startY).toFixed(2)} Q ${safeNum(edge.controlX, edge.startX).toFixed(2)} ${safeNum(edge.controlY, edge.startY).toFixed(2)} ${safeNum(edge.endX).toFixed(2)} ${safeNum(edge.endY).toFixed(2)}`
                      )
                    : safePath(buildQuadraticPath(edgeInput as any));

                const arrow =
                  variant === "assist_network"
                    ? safePath(
                        `M ${safeNum(edge.endX).toFixed(2)} ${safeNum(edge.endY).toFixed(2)} L ${(safeNum(edge.endX) - EDGE_ARROW_SIZE).toFixed(2)} ${(safeNum(edge.endY) - EDGE_ARROW_SIZE / 2).toFixed(2)} L ${(safeNum(edge.endX) - EDGE_ARROW_SIZE).toFixed(2)} ${(safeNum(edge.endY) + EDGE_ARROW_SIZE / 2).toFixed(2)} Z`
                      )
                    : safePath(buildArrowPath(edgeInput as any, EDGE_ARROW_SIZE));

                if (!path) return null;
                const active = isEdgeActive(edge, selectedNodeId);

                return (
                  <G key={edge.key}>
                    <Path
                      d={path}
                      stroke={edge.color}
                      strokeWidth={getSelectedEdgeStrokeWidth(edge as any, active)}
                      opacity={active ? safeNum(edge.opacity, 0.75) : 0.16}
                      fill="none"
                    />
                    {arrow ? (
                      <Path
                        d={arrow}
                        fill={edge.color}
                        opacity={active ? safeNum(edge.opacity, 0.75) : 0.16}
                      />
                    ) : null}
                  </G>
                );
              })}

            {layout.nodes.map((node) => (
              <G key={node.id}>
                <Circle
                  cx={safeNum(node.x)}
                  cy={safeNum(node.y)}
                  r={safeNum(node.radius, 12)}
                  fill={node.colorValue}
                  opacity={selectedNodeId && selectedNodeId !== node.id ? 0.35 : 0.95}
                  onPress={() =>
                    setSelectedNodeId((current) => (current === node.id ? null : node.id))
                  }
                />
                <Circle
                  cx={safeNum(node.x)}
                  cy={safeNum(node.y)}
                  r={safeNum(node.radius, 12) + 3}
                  stroke={node.dominanceColor}
                  strokeWidth={selectedNodeId === node.id ? 2.5 : 1.25}
                  fill="transparent"
                />
                <SvgText
                  x={safeNum(node.x)}
                  y={safeNum(node.y + node.radius + NODE_LABEL_OFFSET)}
                  fontSize="10"
                  fill="#E2E8F0"
                  textAnchor="middle"
                >
                  {node.name}
                </SvgText>
              </G>
            ))}
          </Svg>
        </View>

        {selectedNode ? (
          <View style={styles.focusCard}>
            <Text style={styles.focusTitle}>{selectedNode.name}</Text>
            <Text style={styles.focusBody}>
              {selectedNode.dominanceLabel} · {formatSigned(selectedNode.supportBalance)}
            </Text>
          </View>
        ) : null}

        {focusedEdges.length ? (
          <View style={styles.focusCard}>
            <Text style={styles.focusTitle}>Top Connections</Text>
            {focusedEdges.map((edge) => (
              <Text key={edge.key} style={styles.focusBody}>
                {edge.fromName} → {edge.toName}: {safeNum(edge.weight).toFixed(1)}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { color: COLORS.wrap, fontSize: 18, fontWeight: "900" },
  subtitle: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  panel: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: COLORS.wrap, fontWeight: "800", fontSize: 13 },
  sectionSub: { color: COLORS.sub, fontSize: 11, fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  underlineButton: { gap: 4 },
  underlineText: { color: COLORS.sub, fontSize: 12, fontWeight: "700" },
  underlineTextActive: { color: COLORS.wrap },
  underlineLine: { height: 2, width: "100%", backgroundColor: "transparent" },
  underlineLineActive: { backgroundColor: COLORS.accent },
  chartCard: {
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  focusCard: {
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 4,
  },
  focusTitle: { color: COLORS.wrap, fontSize: 12, fontWeight: "900" },
  focusBody: { color: COLORS.sub, fontSize: 11, fontWeight: "600" },
});

