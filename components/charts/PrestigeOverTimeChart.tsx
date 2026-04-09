import React, { memo } from "react";
import LineChart from "./LineChart";

type Player = {
  id: string;
  name: string;
  color?: string;
};

type SnapshotPrimitive = number | string | boolean | null | undefined;
type SnapshotValue =
  | SnapshotPrimitive
  | SnapshotPrimitive[]
  | Record<string, unknown>;

type DataPoint = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, SnapshotValue>;
};

type Props = Readonly<{
  data?: readonly DataPoint[];
  players?: readonly Player[];
  title?: string;
  subtitle?: string;
  compare?: "all" | "top5" | "selectedOnly";
  selectedPlayerIds?: string[];
  maxPlayers?: number;
}>;

const CHART_TITLE = "Prestige Over Time";
const CHART_SUBTITLE =
  "Unified prestige trend across tracked games.";
const STAT_KEY = "totalPrestige" as const;

function PrestigeOverTimeChart({
  data = [],
  players = [],
  title = CHART_TITLE,
  subtitle = CHART_SUBTITLE,
  compare = "all",
  selectedPlayerIds,
  maxPlayers = 12,
}: Props) {
  return (
    <LineChart
      data={data as any}
      players={players as any}
      statKey={STAT_KEY}
      title={title}
      subtitle={subtitle}
      compare={compare}
      selectedPlayerIds={selectedPlayerIds}
      maxPlayers={maxPlayers}
      emptyTitle="No prestige data yet"
      emptySubtitle="Add tracked games or round snapshots to render prestige trend history."
      emptyBehavior="empty-chart"
    />
  );
}

PrestigeOverTimeChart.displayName = "PrestigeOverTimeChart";

export default memo(PrestigeOverTimeChart);
