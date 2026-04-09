export type Player = {
  id: string;
  name: string;
  color?: string;
};

export type Relationships = Record<string, Record<string, number>>;

export type NetworkViewMode = "flow" | "network";
export type EdgeFilterMode = 1 | 2 | 3 | 5 | 999;

export type RelationshipGraphProps = Readonly<{
  players?: readonly Player[];
  relationships?: Relationships;
  maxItems?: number;
  initialView?: NetworkViewMode;
  initialTopEdgesPerNode?: EdgeFilterMode;
  title?: string;
  subtitle?: string;
}>;

export type NodeStats = {
  sent: number;
  received: number;
  involvement: number;
  supportBalance: number;
};

export type GraphNode = Player &
  NodeStats & {
    x: number;
    y: number;
    radius: number;
    colorValue: string;
    dominanceColor: string;
    dominanceLabel: string;
  };

export type GraphEdge = {
  key: string;
  fromId: string;
  toId: string;
  weight: number;
  color: string;
  fromName: string;
  toName: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  strokeWidth: number;
  opacity: number;
  curveOffset: number;
};

export type GraphLayout = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  maxWeight: number;
};