import { StatsView } from "@/components/stats/StatsView";
import { loadStatsScreen } from "@/lib/data/loadStatsScreen";

export default async function StatsPage() {
  const payload = await loadStatsScreen();

  return <StatsView payload={payload} />;
}
