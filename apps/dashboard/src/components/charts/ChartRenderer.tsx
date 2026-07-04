import type { ChartDatasetPayload } from "@moonrakers/analytics-contract";

import { CartesianChartPanel } from "./renderers/CartesianChartPanel";
import { ComparisonChartPanel } from "./renderers/ComparisonChartPanel";
import { HeatmapPanel } from "./renderers/HeatmapPanel";
import { NetworkChartPanel } from "./renderers/NetworkChartPanel";
import { ReplayPanel } from "./renderers/ReplayPanel";

export function ChartRenderer({
  chartKey,
  payload,
}: {
  chartKey: string;
  payload: ChartDatasetPayload;
}) {
  if (["compare", "head_to_head", "rivalry_graph", "radar"].includes(chartKey)) {
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

  return <CartesianChartPanel chartKey={chartKey} payload={payload} />;
}
