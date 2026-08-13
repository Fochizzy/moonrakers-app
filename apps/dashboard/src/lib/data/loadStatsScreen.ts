import { getStatsScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { normalizeOptionalSearchParam } from "../readSearchParam";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadStatsScreenInput = {
  focusPlayerId?: string | null;
};

export async function loadStatsScreen(input: LoadStatsScreenInput = {}) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const effectiveProfileId =
    normalizeOptionalSearchParam(input.focusPlayerId) ?? userId;

  return getStatsScreen(client, { profileId: effectiveProfileId });
}
