import { StatsView } from "@/components/stats/StatsView";
import { loadStatsScreen } from "@/lib/data/loadStatsScreen";
import { readSearchParam } from "@/lib/readSearchParam";

export default async function StatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const payload = await loadStatsScreen({
    focusPlayerId: readSearchParam(resolvedSearchParams.focusPlayerId),
  });

  return <StatsView payload={payload} />;
}
