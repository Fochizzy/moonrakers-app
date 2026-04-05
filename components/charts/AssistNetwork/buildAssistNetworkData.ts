import { ChartPlayerRow } from '../core/metricSchema';

export type AssistNetworkNode = {
  id: string;
  label: string;
  color?: string;
  x: number;
  y: number;
  totalPrestige: number;
};

export type AssistNetworkEdge = {
  fromId: string;
  toId: string;
  weight: number;
};

export function buildAssistNetworkData(rows: ChartPlayerRow[]): {
  nodes: AssistNetworkNode[];
  edges: AssistNetworkEdge[];
} {
  const angleStep = (Math.PI * 2) / Math.max(1, rows.length);
  const nodes = rows.map((row, index) => ({
    id: row.id,
    label: row.label,
    color: row.color,
    x: 140 + Math.cos(angleStep * index - Math.PI / 2) * 92,
    y: 140 + Math.sin(angleStep * index - Math.PI / 2) * 92,
    totalPrestige: row.metrics.totalPrestige,
  }));

  const edges: AssistNetworkEdge[] = rows
    .filter((row) => row.metrics.assists > 0)
    .flatMap((row, index) => {
      const nextRow = rows[(index + 1) % rows.length];
      if (!nextRow || nextRow.id === row.id) {
        return [];
      }
      return [{
        fromId: row.id,
        toId: nextRow.id,
        weight: row.metrics.assists,
      }];
    });

  return { nodes, edges };
}
