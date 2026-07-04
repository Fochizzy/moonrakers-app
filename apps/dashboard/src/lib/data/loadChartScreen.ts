import { getChartSetup } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadChartScreenInput = {
  chartKey: string;
};

export async function loadChartScreen(input: LoadChartScreenInput) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  return getChartSetup(client, {
    chartKey: input.chartKey,
    profileId: userId,
  });
}
