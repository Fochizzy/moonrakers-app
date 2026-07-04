import { InsightsView } from "@/components/insights/InsightsView";
import { loadInsightsScreen } from "@/lib/data/loadInsightsScreen";

export default async function InsightsPage() {
  const payload = await loadInsightsScreen();

  return <InsightsView payload={payload} />;
}
