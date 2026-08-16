import { getAnalyticsHome } from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { normalizeOptionalSearchParam } from "../readSearchParam";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadDashboardHomeInput = {
  focusPlayerId?: string | null;
};

export async function loadDashboardHome(input: LoadDashboardHomeInput = {}) {
  const { supabase, userId, profile } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const requestedFocusPlayerId = normalizeOptionalSearchParam(
    input.focusPlayerId,
  );
  const effectiveProfileId = requestedFocusPlayerId ?? userId;
  let focusProfileName =
    profile?.player_name?.trim() ||
    profile?.display_name?.trim() ||
    "Commander";

  if (effectiveProfileId !== userId) {
    const { data: focusProfile } = await supabase
      .from("profiles")
      .select("id, player_name, display_name")
      .eq("id", effectiveProfileId)
      .maybeSingle();

    if (focusProfile) {
      focusProfileName =
        String(focusProfile.player_name ?? "").trim() ||
        String(focusProfile.display_name ?? "").trim() ||
        focusProfileName;
    }
  }

  const payload = await getAnalyticsHome(client, {
    profileId: effectiveProfileId,
  });

  return { focusProfileName, payload };
}
