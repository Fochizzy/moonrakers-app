export type SparkDatum = number | { value: number; label?: string };

export type NormalizedSparkDatum = {
  value: number;
  label?: string;
};

export type SparkPoint = {
  index: number;
  value: number;
  label?: string;
  x: number;
  y: number;
};

export type SparklineGeometry = {
  path: string;
  points: SparkPoint[];
  baselineY: number;
};

export type TrendDirection = "rising" | "falling" | "flat";
export type VolatilityLevel = "low" | "medium" | "high";

export type SparklineMetrics = {
  current: number;
  previous: number | null;
  first: number;
  min: number;
  minIndex: number;
  max: number;
  maxIndex: number;
  average: number;
  median: number;
  range: number;
  sum: number;
  changeFromStart: number;
  percentChangeFromStart: number | null;
  changeFromPrevious: number | null;
  percentChangeFromPrevious: number | null;
  trendDirection: TrendDirection;
  slope: number;
  volatilityValue: number;
  volatilityLevel: VolatilityLevel;
  distanceFromPeak: number;
  percentBelowPeak: number | null;
  currentVsAverage: number;
  currentPercentVsAverage: number | null;
  risingSteps: number;
  fallingSteps: number;
  directionChanges: number;
  latestPercentile: number;
  recentAverage: number;
  recentChange: number;
  recentTrendDirection: TrendDirection;
};

export type SparklineNarrative = {
  headline: string;
  bullets: string[];
  tags: string[];
};

export type ComparisonNarrative = {
  headline: string;
  bullets: string[];
  tags: string[];
};

export type SelectionPoint = {
  index: number;
  value: number;
  label?: string;
};

export type SparkMetricOption = {
  key: string;
  label: string;
  shortLabel?: string;
};

export type SparklineProps = Readonly<{
  data?: readonly SparkDatum[];
  comparisonData?: readonly SparkDatum[];

  metricOptions?: readonly SparkMetricOption[];
  metricSeriesMap?: Record<string, readonly SparkDatum[] | undefined>;
  comparisonMetricSeriesMap?: Record<string, readonly SparkDatum[] | undefined>;
  activeMetricKey?: string;
  defaultMetricKey?: string;
  onChangeMetric?: (metricKey: string) => void;
  showMetricSelector?: boolean;
  metricTitle?: string;

  color?: string;
  comparisonColor?: string;
  primaryLabel?: string;
  comparisonLabel?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  padding?: number;
  pointRadius?: number;
  selectedPointRadius?: number;
  pointHitRadius?: number;
  recentWindow?: number;
  showBaseline?: boolean;
  showLatestButton?: boolean;
  hideLatestWhenSelected?: boolean;
  showValueLabel?: boolean;
  showSummary?: boolean;
  showStatsRow?: boolean;
  showNarrative?: boolean;
  showHowItWorks?: boolean;
  selectedIndex?: number | null;
  defaultSelectedIndex?: number | null;
  onSelectIndex?: (index: number, point: { value: number; label?: string }) => void;
  valueFormatter?: (value: number) => string;
  compactValueFormatter?: (value: number) => string;
  percentFormatter?: (value: number) => string;
  selectionFormatter?: (point: SelectionPoint, metrics: SparklineMetrics) => string;
  latestButtonLabel?: string;
  emptyLabel?: string;
  narrativeTitle?: string;
}>;