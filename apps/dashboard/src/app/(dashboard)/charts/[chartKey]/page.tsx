import { ChartDetailView } from "@/components/charts/ChartDetailView";
import { normalizeDashboardChartKey } from "@/components/charts/chartCatalog";
import { loadChartScreen } from "@/lib/data/loadChartScreen";

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
  const { dataset, setup } = await loadChartScreen({
    chartKey,
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
    comparePlayerId: readSearchParam(resolvedSearchParams.comparePlayerId),
    metricKey: readSearchParam(resolvedSearchParams.metricKey),
    lineMode: readSearchParam(resolvedSearchParams.lineMode),
    opponentId: readSearchParam(resolvedSearchParams.opponentId),
  });

  return <ChartDetailView chartKey={chartKey} dataset={dataset} setup={setup} />;
}
