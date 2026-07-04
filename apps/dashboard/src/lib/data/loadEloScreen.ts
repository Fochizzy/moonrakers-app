import { getEloScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadEloScreenInput = {
  focusPlayerId?: string | null;
  opponentId?: string | null;
  sortKey?: string | null;
};

export async function loadEloScreen(input: LoadEloScreenInput = {}) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  return getEloScreen(client, {
    profileId: userId,
    focusPlayerId: input.focusPlayerId ?? null,
    opponentId: input.opponentId ?? null,
    sortKey: input.sortKey ?? null,
  });
}
