import { getChartSetup } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadCompareScreen() {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  return getChartSetup(client, {
    chartKey: "compare",
    profileId: userId,
  });
}
