import React, { memo } from 'react';
import LineChart from './LineChart';
import { LineMode } from './MultiLineChart';

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
}>;

const CHART_TITLE = 'Prestige Over Time';
const CHART_SUBTITLE =
  'Analyze prestige pace, swings, lead control, and comeback behavior across rounds.';
const STAT_KEY = 'totalPrestige' as const;
const INITIAL_MODE: LineMode = 'cumulativePrestige';

const ALLOWED_MODES: LineMode[] = [
  'cumulativePrestige',
  'netGainPerRound',
  'rolling3RoundAverage',
  'leadMarginPerRound',
  'comebackDelta',
  'firstPlaceOccupancy',
];

function PrestigeOverTimeChart({
  data = [],
  players = [],
  title = CHART_TITLE,
  subtitle = CHART_SUBTITLE,
}: Props) {
  return (
    <LineChart
      data={data as any}
      players={players as any}
      statKey={STAT_KEY}
      title={title}
      subtitle={subtitle}
      compare="all"
      initialMode={INITIAL_MODE}
      allowedModes={ALLOWED_MODES}
      emptyTitle="No prestige data yet"
      emptySubtitle="Add round snapshots with prestige values to render this chart."
      emptyBehavior="empty-chart"
    />
  );
}

PrestigeOverTimeChart.displayName = 'PrestigeOverTimeChart';

export default memo(PrestigeOverTimeChart);
