import { getEloScreen } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { normalizeOptionalSearchParam } from "../readSearchParam";
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
    // The in-page form submits `opponentId=` for "Any rival", and an empty
    // string is not null: forwarding it made Postgres reject the whole call
    // while casting '' to uuid.
    focusPlayerId: normalizeOptionalSearchParam(input.focusPlayerId, {
      emptyValues: ["none"],
    }),
    opponentId: normalizeOptionalSearchParam(input.opponentId, {
      emptyValues: ["none"],
    }),
    sortKey: normalizeOptionalSearchParam(input.sortKey),
  });
}
