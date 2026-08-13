import { ChartDetailView } from "@/components/charts/ChartDetailView";
import { normalizeDashboardChartKey } from "@/components/charts/chartCatalog";
import { loadChartScreen } from "@/lib/data/loadChartScreen";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function ChartDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ chartKey: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const chartKey = normalizeDashboardChartKey(resolvedParams.chartKey);
  const focusPlayerId = readSearchParam(resolvedSearchParams.focusPlayerId);
  const comparePlayerId = readSearchParam(resolvedSearchParams.comparePlayerId);
  const metricKey = readSearchParam(resolvedSearchParams.metricKey);
  const lineMode = readSearchParam(resolvedSearchParams.lineMode);
  const opponentId = readSearchParam(resolvedSearchParams.opponentId);
  const { dataset, setup, controls } = await loadChartScreen({
    chartKey,
    focusPlayerId,
    comparePlayerId,
    metricKey,
    lineMode,
    opponentId,
  });

  return (
    <ChartDetailView
      chartKey={chartKey}
      controls={controls}
      dataset={dataset}
      setup={setup}
    />
  );
}
