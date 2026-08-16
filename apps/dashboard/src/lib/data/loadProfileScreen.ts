import { getPlayerProfileScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { normalizeOptionalSearchParam } from "../readSearchParam";
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
    // `?opponentId=` arrives as an empty string, which is not null and is not a
    // uuid either — Postgres rejects the call before the function body runs.
    focusPlayerId: normalizeOptionalSearchParam(input.focusPlayerId, {
      emptyValues: ["none"],
    }),
    opponentId: normalizeOptionalSearchParam(input.opponentId, {
      emptyValues: ["none"],
    }),
  });
}
