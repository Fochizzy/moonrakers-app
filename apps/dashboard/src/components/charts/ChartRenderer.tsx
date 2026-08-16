"use client";

import type { ChartDatasetPayload } from "@moonrakers/analytics-contract";

import { CartesianChartPanel } from "./renderers/CartesianChartPanel";
import { ComparisonChartPanel } from "./renderers/ComparisonChartPanel";
import { EloTrendPanel } from "./renderers/EloTrendPanel";
import { HeatmapPanel } from "./renderers/HeatmapPanel";
import { LineHistoryPanel } from "./renderers/LineHistoryPanel";
import { NetworkChartPanel } from "./renderers/NetworkChartPanel";
import { RadarChartPanel } from "./renderers/RadarChartPanel";
import { ReplayPanel } from "./renderers/ReplayPanel";
import { SparklineChartPanel } from "./renderers/SparklineChartPanel";

export function ChartRenderer({
  chartKey,
  payload,
}: {
  chartKey: string;
  payload: ChartDatasetPayload;
}) {
  if (["radar"].includes(chartKey)) {
    return <RadarChartPanel payload={payload} />;
  }

  if (["elo"].includes(chartKey)) {
    return <EloTrendPanel payload={payload} />;
  }

  if (["compare", "head_to_head", "rivalry_graph"].includes(chartKey)) {
    return <ComparisonChartPanel chartKey={chartKey} payload={payload} />;
  }

  if (["relationship_graph"].includes(chartKey)) {
    return <NetworkChartPanel payload={payload} />;
  }

  if (["heatmap"].includes(chartKey)) {
    return <HeatmapPanel payload={payload} />;
  }

  if (["replay_chart"].includes(chartKey)) {
    return <ReplayPanel payload={payload} />;
  }

  if (["sparkline"].includes(chartKey)) {
    return <SparklineChartPanel payload={payload} />;
  }

  if (
    [
      "line_chart",
      "line",
      "multi_line_chart",
      "multi-line-chart",
      "multi-line",
      "prestige_over_time",
    ].includes(chartKey)
  ) {
    return <LineHistoryPanel payload={payload} />;
  }

  return <CartesianChartPanel chartKey={chartKey} payload={payload} />;
}
