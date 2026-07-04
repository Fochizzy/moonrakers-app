import { getAnalyticsHome } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadDashboardHome() {
  const { supabase, userId, profile } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const payload = await getAnalyticsHome(client, { profileId: userId });

  return { payload, profile };
}
