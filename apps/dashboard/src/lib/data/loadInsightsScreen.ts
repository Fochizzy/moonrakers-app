import { getInsightsScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { normalizeOptionalSearchParam } from "../readSearchParam";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadInsightsScreenInput = {
  focusPlayerId?: string | null;
};

export async function loadInsightsScreen(
  input: LoadInsightsScreenInput = {},
) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const effectiveProfileId =
    normalizeOptionalSearchParam(input.focusPlayerId) ?? userId;

  return getInsightsScreen(client, { profileId: effectiveProfileId });
}
