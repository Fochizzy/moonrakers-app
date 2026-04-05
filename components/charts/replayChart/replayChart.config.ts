export type PrimitiveSnapshotValue =
  | number
  | string
  | boolean
  | null
  | undefined;

export type SnapshotRecord = {
  [key: string]: PrimitiveSnapshotValue | SnapshotRecord | SnapshotRecord[];
};

export type ReplayPoint = {
  round?: number;
  snapshot?: SnapshotRecord;
};

export type Player = {
  id: string;
  name: string;
  color?: string;
};

export type MetricKey =
  | 'totalPrestige'
  | 'directPrestige'
  | 'assistPrestigeReceived'
  | 'objectivePrestige'
  | 'score'
  | 'contracts'
  | 'failures'
  | 'efficiency'
  | 'prestigeDelta';

export type ChartMode =
  | 'raw'
  | 'cumulativePrestige'
  | 'netGainPerRound'
  | 'rolling3RoundAverage'
  | 'leadMarginPerRound'
  | 'comebackDelta'
  | 'firstPlaceOccupancy';

export type MetricContext = {
  point: ReplayPoint;
  previousPoint?: ReplayPoint;
  player: Player;
  playerSnapshot?: SnapshotRecord;
  previousPlayerSnapshot?: SnapshotRecord;
};

export type MetricOption = {
  key: MetricKey;
  label: string;
  meaning: string;
  defaultMode: ChartMode;
};

export type ReplayChartProps = Readonly<{
  replay?: readonly ReplayPoint[];
  players?: readonly Player[];
  statKey?: MetricKey;
  title?: string;
}>;

export type ReplayMetricSummary = {
  leadingPlayer?: Player;
  peakValue: number;
  peakDisplay: string;
  summary: string;
};

export type DerivedReplayBundle = {
  metric: MetricKey;
  replay: readonly ReplayPoint[];
  players: readonly Player[];
  derivedReplay: ReplayPoint[];
  summary: ReplayMetricSummary;
};

export type PlayerMetricSeriesPoint = {
  round: number;
  value: number;
};

export type PlayerMetricSeries = {
  player: Player;
  points: PlayerMetricSeriesPoint[];
};
