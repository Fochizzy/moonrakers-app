export type Player = {
  id: string;
  name: string;
  color?: string;
};

export type Relationships = Record<string, Record<string, number>>;

export type RelationshipGraphProps = Readonly<{
  players?: readonly Player[];
  relationships?: Relationships;
  maxItems?: number;
}>;

export type NodeStats = {
  sent: number;
  received: number;
  involvement: number;
};

export type GraphNode = Player &
  NodeStats & {
    x: number;
    y: number;
    radius: number;
    colorValue: string;
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
};

export type GraphLayout = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  maxWeight: number;
};
