import { getInsightsScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadInsightsScreen() {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  return getInsightsScreen(client, { profileId: userId });
}
