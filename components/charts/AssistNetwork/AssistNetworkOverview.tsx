import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { ChartPlayerRow, MetricMode } from '../core/metricSchema';
import { formatModeLabel } from '../core/chartFormatters';
import { buildAssistNetworkData } from './buildAssistNetworkData';

type Props = {
  data: ChartPlayerRow[];
  title?: string;
};

export default function AssistNetworkOverview({ data, title = 'Assist Network' }: Props) {
  const [mode, setMode] = useState<MetricMode>('raw');
  const { nodes, edges } = useMemo(() => buildAssistNetworkData(data), [data]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Unified chart mode: {formatModeLabel(mode)}. Assist links are based on shared player metrics, so colors and labels match every other chart.</Text>
      <View style={styles.toggleRow}>
        {(['raw', 'perTurn', 'efficiency'] as MetricMode[]).map((nextMode) => (
          <Pressable key={nextMode} style={[styles.pill, mode === nextMode && styles.pillActive]} onPress={() => setMode(nextMode)}>
            <Text style={[styles.pillText, mode === nextMode && styles.pillTextActive]}>{formatModeLabel(nextMode)}</Text>
          </Pressable>
        ))}
      </View>
      <Svg width={280} height={280}>
        {edges.map((edge) => {
          const fromNode = nodes.find((node) => node.id === edge.fromId);
          const toNode = nodes.find((node) => node.id === edge.toId);
          if (!fromNode || !toNode) {
            return null;
          }
          return (
            <Line
              key={`${edge.fromId}-${edge.toId}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#64748b"
              strokeWidth={Math.max(1, edge.weight)}
            />
          );
        })}
        {nodes.map((node) => (
          <React.Fragment key={node.id}>
            <Circle cx={node.x} cy={node.y} r={16} fill={node.color ?? '#8b5cf6'} />
            <SvgText x={node.x} y={node.y + 34} fill="#e5e7eb" fontSize="11" textAnchor="middle">
              {node.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    alignSelf: 'stretch',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 12,
    alignSelf: 'stretch',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  pillActive: {
    backgroundColor: '#312e81',
    borderColor: '#8b5cf6',
  },
  pillText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
});
