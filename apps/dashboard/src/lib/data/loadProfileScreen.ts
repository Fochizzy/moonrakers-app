import { getPlayerProfileScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadProfileScreenInput = {
  focusPlayerId?: string | null;
  opponentId?: string | null;
};

export async function loadProfileScreen(input: LoadProfileScreenInput = {}) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);

  return getPlayerProfileScreen(client, {
    profileId: userId,
    focusPlayerId: input.focusPlayerId ?? null,
    opponentId: input.opponentId ?? null,
  });
}
