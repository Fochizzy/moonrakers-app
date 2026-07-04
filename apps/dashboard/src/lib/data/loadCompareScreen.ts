import {
  getChartDataset,
  getChartSetup,
} from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

export async function loadCompareScreen(searchParams: {
  comparePlayerId?: string;
  focusPlayerId?: string;
}) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const setup = await getChartSetup(client, {
    chartKey: "compare",
    profileId: userId,
  });
  const focusPlayerId =
    searchParams.focusPlayerId ?? setup.defaults.focusPlayerId ?? null;
  const comparePlayerId =
    searchParams.comparePlayerId ?? setup.defaults.comparePlayerId ?? null;
  const dataset = await getChartDataset(client, {
    chartKey: "compare",
    profileId: userId,
    focusPlayerId,
    comparePlayerId,
    scopedPlayerIds: null,
    selectedGameId: null,
    metricKey: null,
    lineMode: null,
    graphMode: null,
    opponentId: null,
  });

  return { setup, dataset };
}
