import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import Text from "@/components/ui/Text";
import buildAssistNetworkLayout from "@/components/charts/AssistNetworkOverview/buildAssistNetworkLayout";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";
import {
  DEFAULT_MAX_ITEMS,
  EDGE_ARROW_SIZE,
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  NODE_LABEL_OFFSET,
} from "./relationshipGraph.constants";
import { buildRelationshipInsightModel } from "./relationshipGraphModel";
import {
  buildArrowPath,
  buildQuadraticPath,
  buildRelationshipGraphLayout,
  getSelectedEdgeStrokeWidth,
} from "./relationshipGraph.utils";

type Player = { id: string; name?: string; color?: string };
type Relationships = Record<string, Record<string, number>>;
type RelationshipEdge = {
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
  labelText?: string;
};
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
  topEdgesPerNode?: EdgeFilterMode;
  maxItems?: number;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showReadoutCards?: boolean;
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
  assistCount?: number;
  assistFrequencyPerGame?: number;
  labelText?: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  arrowSize: number;
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

const COLORS = CHART_COLORS;
const NODE_PLATE_FILL = withChartAlpha(COLORS.bg, 0.82);
const NODE_PLATE_STROKE = withChartAlpha("#F8FAFC", 0.14);
const NODE_FILL_STROKE = withChartAlpha("#F8FAFC", 0.28);
const NODE_LABEL_OUTLINE = withChartAlpha(COLORS.bg, 0.96);

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
  const fallback = [
    "#A855F7",
    "#3B82F6",
    "#22C55E",
    "#3B82F6",
    "#EF4444",
    "#14B8A6",
  ];
  return fallback[index % fallback.length];
}

function formatSigned(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function getFilterLabel(value: EdgeFilterMode) {
  return value === 999 ? "All" : `Top ${value}`;
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
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
      <Text style={[styles.underlineText, active && styles.underlineTextActive]}>
        {label}
      </Text>
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

function buildScopedAssistRelationships(
  relationshipsInput: Relationships | RelationshipEdge[],
  scopedIds?: string[]
): Relationships | RelationshipEdge[] {
  if (!Array.isArray(relationshipsInput)) {
    return buildScopedRelationships(relationshipsInput, scopedIds);
  }
  if (!scopedIds?.length) return relationshipsInput;
  const allowed = new Set(scopedIds.map(String));

  return relationshipsInput.filter((edge) => {
    const fromId = String(edge.sourceId ?? edge.fromId ?? edge.source ?? "").trim();
    const toId = String(edge.targetId ?? edge.toId ?? edge.target ?? "").trim();
    return allowed.has(fromId) && allowed.has(toId);
  });
}

function filterTopEdgesPerNode<
  T extends {
    source?: string;
    fromId?: string;
    target?: string;
    toId?: string;
    value?: number;
    weight?: number;
  },
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
  relationships: Relationships | RelationshipEdge[],
  topEdgesPerNode: EdgeFilterMode,
  graphMode: GraphMode
): { nodes: SuperNode[]; edges: SuperEdge[] } {
  const network = buildAssistNetworkLayout(relationships, players);
  const filteredLinks = filterTopEdgesPerNode(network.links as any[], topEdgesPerNode);

  const cx = GRAPH_WIDTH / 2;
  const cy = GRAPH_HEIGHT / 2;
  const orbitX = GRAPH_WIDTH * 0.34;
  const orbitY = GRAPH_HEIGHT * 0.29;
  const topY = 54;
  const usableHeight = GRAPH_HEIGHT - topY - 54;

  const nodesSorted = [...network.nodes].sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label)
  );
  const byId = new Map(players.map((player) => [String(player.id), player]));
  const valueMax = Math.max(1, ...nodesSorted.map((node) => safeNum(node.value)));
  const maxAbsBalance = Math.max(
    1,
    ...nodesSorted.map((node) => Math.abs(safeNum(node.supportBalance)))
  );

  const nodes: SuperNode[] = nodesSorted.map((node, index) => {
    const player = byId.get(node.id);
    const supportBalance = safeNum(node.supportBalance);
    const angle = -Math.PI / 2 + (index / Math.max(1, nodesSorted.length)) * Math.PI * 2;
    const flowX =
      GRAPH_WIDTH * 0.18 +
      ((clamp(supportBalance / maxAbsBalance, -1, 1) + 1) / 2) * (GRAPH_WIDTH * 0.64);
    const flowY =
      nodesSorted.length === 1
        ? cy
        : topY + (usableHeight * index) / Math.max(1, nodesSorted.length - 1);

    return {
      id: node.id,
      name: node.label,
      x:
        graphMode === "network"
          ? safeNum(cx + Math.cos(angle) * orbitX, cx)
          : safeNum(flowX, cx),
      y:
        graphMode === "network"
          ? safeNum(cy + Math.sin(angle) * orbitY, cy)
          : safeNum(flowY, cy),
      radius: 14 + (safeNum(node.value) / valueMax) * 18,
      colorValue: normalizeColor(player?.color, index),
      dominanceColor: getDominanceColor(supportBalance),
      dominanceLabel: getDominanceLabel(supportBalance),
      supportBalance,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeMax = Math.max(
    1,
    ...filteredLinks.map((link: any) =>
      safeNum(link.assistFrequencyPerGame ?? link.value)
    )
  );

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
      const bend =
        graphMode === "network"
          ? clamp(distance * 0.12, 18, 54)
          : clamp(distance * 0.05, 10, 26);
      const controlX = safeNum(mx + perpX * bend, mx);
      const controlY = safeNum(my + perpY * bend, my);
      const assistFrequencyPerGame = safeNum(
        link.assistFrequencyPerGame ?? link.value
      );
      const edgeStrength = assistFrequencyPerGame / edgeMax;

      return {
        key: String(link.id ?? `${link.source}->${link.target}`),
        fromId: String(link.source ?? ""),
        toId: String(link.target ?? ""),
        fromName: String(link.sourceLabel ?? ""),
        toName: String(link.targetLabel ?? ""),
        weight: assistFrequencyPerGame,
        assistCount: safeNum(link.assistCount),
        assistFrequencyPerGame,
        labelText: String(
          link.labelText ??
            `${assistFrequencyPerGame.toFixed(1)}/game`
        ),
        color: fromNode.colorValue,
        strokeWidth: 2 + edgeStrength * 6,
        opacity: 0.24 + edgeStrength * 0.7,
        arrowSize: 7 + edgeStrength * 5,
        startX,
        startY,
        endX,
        endY,
        controlX,
        controlY,
        angle: Math.atan2(endY - controlY, endX - controlX),
      };
    })
    .filter((edge) => Boolean(edge && isFiniteEdge(edge))) as SuperEdge[];

  return { nodes, edges };
}

export default function RelationshipGraph({
  players = [],
  relationships = {},
  scopedPlayerIds,
  variant = "relationship",
  mode = "flow",
  initialView,
  topEdgesPerNode = 3,
  maxItems = DEFAULT_MAX_ITEMS,
  title = "Relationship Graph",
  subtitle,
  showHeader = true,
  showReadoutCards = true,
}: Props) {
  const resolvedMode = initialView ?? mode;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [internalMode, setInternalMode] = useState<GraphMode>(resolvedMode);
  const [internalTopEdgesPerNode, setInternalTopEdgesPerNode] =
    useState<EdgeFilterMode>(topEdgesPerNode);

  useEffect(() => setInternalMode(resolvedMode), [resolvedMode]);
  useEffect(() => setInternalTopEdgesPerNode(topEdgesPerNode), [topEdgesPerNode]);

  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return players;
    const allowed = new Set(scopedPlayerIds.map(String));
    return players.filter((player) => allowed.has(String(player.id)));
  }, [players, scopedPlayerIds]);

  const scopedRelationships = useMemo(
    () => buildScopedRelationships(relationships ?? {}, scopedPlayerIds),
    [relationships, scopedPlayerIds]
  );
  const scopedAssistRelationships = useMemo(
    () => buildScopedAssistRelationships(relationships ?? {}, scopedPlayerIds),
    [relationships, scopedPlayerIds]
  );

  const layout = useMemo(() => {
    if (variant === "assist_network") {
      return buildDeterministicAssistLayout(
        visiblePlayers,
        scopedAssistRelationships,
        internalTopEdgesPerNode,
        internalMode
      );
    }

    return buildRelationshipGraphLayout(
      visiblePlayers as any,
      scopedRelationships ?? {},
      maxItems,
      internalTopEdgesPerNode,
      internalMode
    ) as unknown as { nodes: SuperNode[]; edges: SuperEdge[] };
  }, [
    internalMode,
    internalTopEdgesPerNode,
    maxItems,
    scopedAssistRelationships,
    scopedRelationships,
    variant,
    visiblePlayers,
  ]);

  const insight = useMemo(
    () => buildRelationshipInsightModel(visiblePlayers, scopedRelationships),
    [visiblePlayers, scopedRelationships]
  );

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
      ? "Frequency-sized assist flow for the exact filtered table."
      : "Directed assist flow across unified games.");
  const viewTabs = VIEW_OPTIONS.map((option) => ({
    key: option,
    label: option,
  }));
  const edgeTabs = FILTER_OPTIONS.map((option) => ({
    key: String(option),
    label: getFilterLabel(option),
  }));
  const focusTitle = selectedNode?.name ?? insight.hub?.player.name ?? "Network Hub";
  const focusValue = selectedNode
    ? selectedNode.dominanceLabel
    : insight.hub
      ? safeNum(insight.hub.value).toFixed(1)
      : "--";
  const focusHelper = selectedNode
    ? `Support balance ${formatSigned(selectedNode.supportBalance)}`
    : insight.hub
      ? `${safeNum(insight.hub.value).toFixed(1)} total involvement`
      : "No network yet";
  const focusStory = selectedNode
    ? `Top ${focusedEdges.length} visible connections are shown below.`
    : "Tap a node to inspect how much it gives, receives, and dominates the current network.";
  const focusAccent = selectedNode
    ? selectedNode.colorValue
    : normalizeColor(insight.hub?.player.color, 0);

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
        </>
      ) : null}

      <View style={styles.panel}>
        {showReadoutCards ? (
          <>
            <Text style={styles.readoutTitle}>Readout</Text>

            <View style={styles.insightGrid}>
              <View style={[styles.insightCard, styles.insightCardAccent]}>
                <Text style={styles.insightLabel}>Hub</Text>
                <Text style={styles.insightValue}>
                  {insight.hub?.player.name ?? "None"}
                </Text>
                <Text style={styles.insightHelper}>
                  {insight.hub
                    ? `${safeNum(insight.hub.value).toFixed(1)} total involvement`
                    : "No network yet"}
                </Text>
              </View>

              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Net Giver</Text>
                <Text style={styles.insightValue}>
                  {insight.netGiver?.player.name ?? "None"}
                </Text>
                <Text style={styles.insightHelper}>
                  {insight.netGiver
                    ? formatSigned(safeNum(insight.netGiver.value))
                    : "No imbalance yet"}
                </Text>
              </View>

              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Net Receiver</Text>
                <Text style={styles.insightValue}>
                  {insight.netReceiver?.player.name ?? "None"}
                </Text>
                <Text style={styles.insightHelper}>
                  {insight.netReceiver
                    ? formatSigned(safeNum(insight.netReceiver.value))
                    : "No imbalance yet"}
                </Text>
              </View>

              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Strongest Link</Text>
                <Text style={styles.insightValue}>
                  {insight.strongestLink
                    ? `${insight.strongestLink.from.name ?? "Unknown"} -> ${insight.strongestLink.to.name ?? "Unknown"}`
                    : "None"}
                </Text>
                <Text style={styles.insightHelper}>
                  {insight.strongestLink
                    ? `${safeNum(insight.strongestLink.value).toFixed(1)} weighted`
                    : "No edge data"}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <ChartStage
          tone="comparison"
          style={styles.chartStage}
          plotStyle={styles.chartStagePlot}
          header={
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Graph</Text>
              <Text style={styles.sectionSub}>
                {layout.nodes.length} nodes | {layout.edges.length} edges
              </Text>
            </View>
          }
        >
          <View style={styles.chartCard}>
            <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
              <Defs>
                <LinearGradient id="networkBg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={focusAccent} stopOpacity={0.24} />
                  <Stop offset="48%" stopColor={COLORS.blue} stopOpacity={0.12} />
                  <Stop offset="100%" stopColor={COLORS.bg} stopOpacity={0.04} />
                </LinearGradient>
              </Defs>

              <Rect
                x={0}
                y={0}
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT}
                rx={18}
                fill={COLORS.bg}
              />

              <Rect
                x={0}
                y={0}
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT}
                rx={18}
                fill="url(#networkBg)"
              />

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
                          Math.pow(
                            safeNum((edge as any).toX ?? edge.endX) -
                              safeNum((edge as any).fromX ?? edge.startX),
                            2
                          ) +
                            Math.pow(
                              safeNum((edge as any).toY ?? edge.endY) -
                                safeNum((edge as any).fromY ?? edge.startY),
                              2
                            )
                        ) * 0.14
                      ),
                  };

                  const path =
                    variant === "assist_network"
                      ? safePath(
                          `M ${safeNum(edge.startX).toFixed(2)} ${safeNum(edge.startY).toFixed(
                            2
                          )} Q ${safeNum(edge.controlX, edge.startX).toFixed(2)} ${safeNum(
                            edge.controlY,
                            edge.startY
                          ).toFixed(2)} ${safeNum(edge.endX).toFixed(2)} ${safeNum(
                            edge.endY
                          ).toFixed(2)}`
                        )
                      : safePath(buildQuadraticPath(edgeInput as any));

                  const arrow =
                    variant === "assist_network"
                      ? safePath(
                          `M ${safeNum(edge.endX).toFixed(2)} ${safeNum(edge.endY).toFixed(
                            2
                          )} L ${(safeNum(edge.endX) - safeNum(edge.arrowSize, EDGE_ARROW_SIZE)).toFixed(2)} ${(
                            safeNum(edge.endY) -
                            safeNum(edge.arrowSize, EDGE_ARROW_SIZE) / 2
                          ).toFixed(2)} L ${(safeNum(edge.endX) - safeNum(edge.arrowSize, EDGE_ARROW_SIZE)).toFixed(
                            2
                          )} ${(safeNum(edge.endY) + safeNum(edge.arrowSize, EDGE_ARROW_SIZE) / 2).toFixed(2)} Z`
                        )
                      : safePath(buildArrowPath(edgeInput as any, EDGE_ARROW_SIZE));

                  if (!path) return null;
                  const active = isEdgeActive(edge, selectedNodeId);
                  const edgeLabelX =
                    variant === "assist_network"
                      ? safeNum(
                          (safeNum(edge.startX) +
                            safeNum(edge.endX) +
                            safeNum(edge.controlX, edge.startX)) /
                            3
                        )
                      : 0;
                  const edgeLabelY =
                    variant === "assist_network"
                      ? safeNum(
                          (safeNum(edge.startY) +
                            safeNum(edge.endY) +
                            safeNum(edge.controlY, edge.startY)) /
                            3
                        )
                      : 0;

                  return (
                    <G key={edge.key}>
                      <Path
                        d={path}
                        stroke={withChartAlpha(
                          edge.color,
                          active ? Math.min(1, safeNum(edge.opacity, 0.7) + 0.12) : safeNum(edge.opacity, 0.7)
                        )}
                        strokeWidth={getSelectedEdgeStrokeWidth(edge as any, active)}
                        opacity={1}
                        fill="none"
                      />
                      {arrow ? (
                        <Path
                          d={arrow}
                          fill={withChartAlpha(
                            edge.color,
                            active ? Math.min(1, safeNum(edge.opacity, 0.7) + 0.12) : safeNum(edge.opacity, 0.7)
                          )}
                          opacity={1}
                        />
                      ) : null}
                      {variant === "assist_network" && edge.labelText ? (
                        <>
                          <Rect
                            x={safeNum(edgeLabelX - 21)}
                            y={safeNum(edgeLabelY - 8)}
                            width={42}
                            height={16}
                            rx={8}
                            fill={withChartAlpha("#F8FAFC", active ? 0.9 : 0.74)}
                            stroke={withChartAlpha(edge.color, active ? 0.5 : 0.24)}
                            strokeWidth={0.9}
                          />
                          <SvgText
                            x={edgeLabelX}
                            y={edgeLabelY + 3}
                            fontSize="8"
                            fill="#0F172A"
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            {edge.labelText}
                          </SvgText>
                        </>
                      ) : null}
                    </G>
                  );
                })}

              {layout.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isDimmed = Boolean(selectedNodeId && selectedNodeId !== node.id);
                const isFocusDefault = !selectedNodeId && focusAccent === node.colorValue;
                const glowAlpha = isSelected || isFocusDefault ? 0.16 : 0.08;
                const plateStroke = isSelected
                  ? withChartAlpha("#F8FAFC", 0.24)
                  : NODE_PLATE_STROKE;
                const fillStroke = isSelected
                  ? withChartAlpha("#F8FAFC", 0.42)
                  : NODE_FILL_STROKE;

                return (
                  <G key={node.id}>
                    <Circle
                      cx={safeNum(node.x)}
                      cy={safeNum(node.y)}
                      r={safeNum(node.radius, 12) + 10}
                      fill={withChartAlpha(node.colorValue, glowAlpha)}
                    />
                    <Circle
                      cx={safeNum(node.x)}
                      cy={safeNum(node.y)}
                      r={safeNum(node.radius, 12) + 4}
                      fill={NODE_PLATE_FILL}
                      stroke={plateStroke}
                      strokeWidth={isSelected ? 1.4 : 1}
                    />
                    <Circle
                      cx={safeNum(node.x)}
                      cy={safeNum(node.y)}
                      r={safeNum(node.radius, 12)}
                      fill={withChartAlpha(node.colorValue, isDimmed ? 0.72 : 0.94)}
                      stroke={fillStroke}
                      strokeWidth={isSelected ? 1.8 : 1.1}
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
                      fill={NODE_LABEL_OUTLINE}
                      stroke={NODE_LABEL_OUTLINE}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      textAnchor="middle"
                    >
                      {node.name}
                    </SvgText>
                    <SvgText
                      x={safeNum(node.x)}
                      y={safeNum(node.y + node.radius + NODE_LABEL_OFFSET)}
                      fontSize="10"
                      fill="#F8FAFC"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {node.name}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
        </ChartStage>

        <View style={styles.detailsPanel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>View</Text>
            <Text style={styles.sectionSub}>Flow vs network layout</Text>
          </View>
          <View style={styles.optionRow}>
            <ChartUnderlineTabs
              items={viewTabs}
              activeKey={internalMode}
              onChange={(next) => setInternalMode(next as GraphMode)}
            />
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Edges</Text>
            <Text style={styles.sectionSub}>Density filter</Text>
          </View>
          <View style={styles.optionRow}>
            <ChartUnderlineTabs
              items={edgeTabs}
              activeKey={String(internalTopEdgesPerNode)}
              onChange={(next) => setInternalTopEdgesPerNode(Number(next) as EdgeFilterMode)}
            />
          </View>

          <ChartFocusCard
            title={focusTitle}
            value={focusValue}
            helper={focusHelper}
            story={focusStory}
            tone="compact"
            accentColor={focusAccent}
          />

          {focusedEdges.length ? (
            <View style={styles.focusCard}>
              <Text style={styles.focusTitle}>Top Connections</Text>
              {focusedEdges.map((edge) => (
                <Text key={edge.key} style={styles.focusBody}>
                  {edge.fromName}
                  {" -> "}
                  {edge.toName}: {safeNum(edge.weight).toFixed(1)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
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
    gap: 12,
  },
  readoutTitle: {
    color: COLORS.wrap,
    fontWeight: "900",
    fontSize: 13,
  },
  insightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insightCard: {
    minWidth: "31%",
    flexGrow: 1,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 4,
  },
  insightCardAccent: {
    backgroundColor: COLORS.accentSoft,
    borderColor: `${COLORS.accent}55`,
  },
  insightLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  insightValue: {
    color: COLORS.wrap,
    fontSize: 13,
    fontWeight: "900",
  },
  insightHelper: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
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
  chartStage: {
    marginBottom: 4,
  },
  chartStagePlot: {
    paddingVertical: 10,
  },
  chartCard: {
    alignItems: "center",
  },
  detailsPanel: {
    gap: 10,
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
  focusHint: { color: COLORS.sub, fontSize: 11, lineHeight: 16 },
});
