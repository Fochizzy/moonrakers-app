import { InsightsView } from "@/components/insights/InsightsView";
import { loadInsightsScreen } from "@/lib/data/loadInsightsScreen";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const payload = await loadInsightsScreen({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
  });

  return <InsightsView payload={payload} />;
}
