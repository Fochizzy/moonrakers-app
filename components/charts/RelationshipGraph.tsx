import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import Text from '@/components/ui/Text';
import ChartLegend from './ChartLegend';
import ChartShell from './ChartShell';
import { chartColors, getPlayerColor, withAlpha } from '@/utils/chartTheme';

type Player = {
  id: string;
  name: string;
  color?: string;
};

type Relationships = Record<string, Record<string, number>>;

type Props = {
  players?: Player[];
  relationships?: Relationships;
  maxItems?: number;
};

const GRAPH_WIDTH = 340;
const GRAPH_HEIGHT = 260;
const DEFAULT_MAX_ITEMS = 24;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLayout(
  players: Player[],
  relationships: Relationships,
  maxItems: number,
) {
  const centerX = GRAPH_WIDTH / 2;
  const centerY = GRAPH_HEIGHT / 2;
  const radius = Math.min(GRAPH_WIDTH, GRAPH_HEIGHT) * 0.33;

  const nodes = players.map((player, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, players.length);
    const sent = Object.values(relationships?.[player.id] ?? {}).reduce(
      (sum, value) => sum + toNumber(value),
      0,
    );

    let received = 0;
    players.forEach((entry) => {
      received += toNumber(relationships?.[entry.id]?.[player.id]);
    });

    const involvement = sent + received;

    return {
      id: player.id,
      name: player.name ?? 'Unknown',
      colorValue: getPlayerColor(player.color),
      x: centerX + Math.cos(angle - Math.PI / 2) * radius,
      y: centerY + Math.sin(angle - Math.PI / 2) * radius,
      sent,
      received,
      involvement,
      radius: Math.max(10, Math.min(22, 10 + involvement * 0.8)),
    };
  });

  const edges = players
    .flatMap((from) =>
      players
        .filter((to) => to.id !== from.id)
        .map((to) => {
          const weight = toNumber(relationships?.[from.id]?.[to.id]);
          return { fromId: from.id, toId: to.id, weight };
        }),
    )
    .filter((edge) => edge.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxItems)
    .map((edge) => {
      const fromNode = nodes.find((node) => node.id == edge.fromId)!;
      const toNode = nodes.find((node) => node.id == edge.toId)!;

      return {
        key: `${edge.fromId}-${edge.toId}`,
        fromName: fromNode.name,
        toName: toNode.name,
        fromX: fromNode.x,
        fromY: fromNode.y,
        toX: toNode.x,
        toY: toNode.y,
        weight: edge.weight,
        strokeWidth: Math.max(1.5, Math.min(6, 1 + edge.weight)),
        color: withAlpha(fromNode.colorValue, 0.7),
      };
    });

  const maxWeight = Math.max(0, ...edges.map((edge) => edge.weight));
  return { nodes, edges, maxWeight };
}

function RelationshipGraph({
  players = [],
  relationships = {},
  maxItems = DEFAULT_MAX_ITEMS,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);

  const layout = useMemo(
    () => buildLayout(players, relationships, maxItems),
    [players, relationships, maxItems],
  );

  const selectedNode = useMemo(
    () => layout.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [layout.nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => layout.edges.find((edge) => edge.key === selectedEdgeKey) ?? null,
    [layout.edges, selectedEdgeKey],
  );

  const accent =
    selectedEdge?.color ?? selectedNode?.colorValue ?? chartColors.purple;

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeKey(null);
  }, []);

  const handleSelectEdge = useCallback((edgeKey: string) => {
    setSelectedEdgeKey(edgeKey);
    setSelectedNodeId(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeKey(null);
  }, []);

  const legendItems = useMemo(
    () =>
      layout.nodes.map((node) => ({
        key: node.id,
        label: node.name,
        color: node.colorValue,
      })),
    [layout.nodes],
  );

  const topStats = selectedNode
    ? [
        { label: 'Player', value: selectedNode.name },
        { label: 'Sent', value: selectedNode.sent.toFixed(1) },
        { label: 'Received', value: selectedNode.received.toFixed(1) },
        { label: 'Involvement', value: selectedNode.involvement.toFixed(1) },
      ]
    : selectedEdge
      ? [
          { label: 'From', value: selectedEdge.fromName },
          { label: 'To', value: selectedEdge.toName },
          { label: 'Strength', value: selectedEdge.weight.toFixed(2) },
          { label: 'Type', value: 'Directed edge' },
        ]
      : [
          { label: 'Players', value: String(layout.nodes.length) },
          { label: 'Links', value: String(layout.edges.length) },
          { label: 'Shown', value: `Top ${Math.min(layout.edges.length, maxItems)}` },
          { label: 'Strongest', value: layout.maxWeight.toFixed(2) },
        ];

  return (
    <ChartShell
      title="Relationship Network"
      subtitle="Long-term interaction strength across the full player graph."
      accentColor={accent}
      tintColor={withAlpha(accent, 0.12)}
      playerColor={accent}
      badge={selectedEdge ? 'Connection' : selectedNode ? 'Player' : 'Network'}
      topStats={topStats}
      explanation="Each node is a player and each line is a directed relationship between two players. Larger nodes indicate greater total involvement."
      meaning="Tap a node or edge for detail. Stronger links render thicker and more prominent."
      legend={<ChartLegend items={legendItems} />}
    >
      {!players.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No relationships yet</Text>
          <Text style={styles.muted}>
            Relationships build from assists and interactions over time.
          </Text>
        </View>
      ) : (
        <>
          {selectedEdge ? (
            <View
              style={[
                styles.selectedCard,
                {
                  borderColor: accent,
                  backgroundColor: withAlpha(accent, 0.12),
                },
              ]}
            >
              <Text style={[styles.selectedTitle, { color: accent }]}>
                Selected Connection
              </Text>
              <Text style={styles.selectedText}>
                {selectedEdge.fromName} → {selectedEdge.toName}
              </Text>
              <Text style={styles.selectedText}>
                Strength: {selectedEdge.weight.toFixed(2)}
              </Text>
              <Text style={styles.clearLink} onPress={handleClearSelection}>
                Clear selection
              </Text>
            </View>
          ) : selectedNode ? (
            <View
              style={[
                styles.selectedCard,
                {
                  borderColor: accent,
                  backgroundColor: withAlpha(accent, 0.12),
                },
              ]}
            >
              <Text style={[styles.selectedTitle, { color: accent }]}>
                Selected Player
              </Text>
              <Text style={styles.selectedText}>{selectedNode.name}</Text>
              <Text style={styles.selectedText}>
                Sent {selectedNode.sent.toFixed(1)} · Received{' '}
                {selectedNode.received.toFixed(1)}
              </Text>
              <Text style={styles.selectedText}>
                Involvement: {selectedNode.involvement.toFixed(1)}
              </Text>
              <Text style={styles.clearLink} onPress={handleClearSelection}>
                Clear selection
              </Text>
            </View>
          ) : null}

          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} style={styles.svg}>
            <Rect
              x={0}
              y={0}
              width={GRAPH_WIDTH}
              height={GRAPH_HEIGHT}
              rx={14}
              fill={chartColors.panelBg}
              stroke={chartColors.borderStrong}
              onPress={handleClearSelection}
            />

            {layout.edges.map((edge) => {
              const isSelected = edge.key === selectedEdge?.key;
              return (
                <Line
                  key={edge.key}
                  x1={edge.fromX}
                  y1={edge.fromY}
                  x2={edge.toX}
                  y2={edge.toY}
                  stroke={edge.color}
                  strokeOpacity={isSelected ? 0.95 : 0.45}
                  strokeWidth={edge.strokeWidth}
                  onPress={() => handleSelectEdge(edge.key)}
                />
              );
            })}

            {layout.nodes.map((node) => {
              const isSelected = node.id === selectedNode?.id;

              return (
                <React.Fragment key={node.id}>
                  {isSelected ? (
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={node.radius + 5}
                      fill={withAlpha(node.colorValue, 0.18)}
                    />
                  ) : null}

                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? node.radius + 1 : node.radius}
                    fill={node.colorValue}
                    stroke="#ffffff"
                    strokeWidth={1.2}
                    onPress={() => handleSelectNode(node.id)}
                  />

                  <SvgText
                    x={node.x}
                    y={node.y + node.radius + 14}
                    fill={isSelected ? chartColors.text : chartColors.subtext}
                    fontSize="10"
                    fontWeight={isSelected ? '700' : '500'}
                    textAnchor="middle"
                  >
                    {node.name}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </>
      )}
    </ChartShell>
  );
}

RelationshipGraph.displayName = 'RelationshipGraph';

export default memo(RelationshipGraph);

const styles = StyleSheet.create({
  svg: {
    alignSelf: 'center',
  },
  selectedCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  selectedText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  clearLink: {
    marginTop: 4,
    color: chartColors.purple,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    borderRadius: 12,
    padding: 12,
    backgroundColor: chartColors.panelBg,
  },
  emptyTitle: {
    fontSize: 14,
    marginBottom: 4,
    color: chartColors.text,
    fontWeight: '800',
  },
  muted: {
    color: chartColors.subtext,
    fontSize: 12,
  },
});
