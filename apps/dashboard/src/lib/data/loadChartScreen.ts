import {
  getChartDataset,
  getChartSetup,
} from "@moonrakers/analytics-contract";

import { requireDashboardAccess } from "../auth/serverAccess";
import { createAnalyticsRpcClient } from "./rpcClient";

type LoadChartScreenInput = {
  chartKey: string;
  comparePlayerId?: string | null;
  focusPlayerId?: string | null;
  lineMode?: string | null;
  metricKey?: string | null;
  opponentId?: string | null;
};

export async function loadChartScreen(input: LoadChartScreenInput) {
  const { supabase, userId } = await requireDashboardAccess();
  const client = createAnalyticsRpcClient(supabase);
  const setup = await getChartSetup(client, {
    chartKey: input.chartKey,
    profileId: userId,
  });
  const dataset = await getChartDataset(client, {
    chartKey: input.chartKey,
    profileId: userId,
    focusPlayerId: input.focusPlayerId ?? setup.defaults.focusPlayerId ?? null,
    comparePlayerId:
      input.comparePlayerId ?? setup.defaults.comparePlayerId ?? null,
    scopedPlayerIds: setup.defaults.scopedPlayerIds,
    selectedGameId: null,
    metricKey: input.metricKey ?? setup.defaults.metricKey ?? null,
    lineMode: input.lineMode ?? setup.defaults.lineMode ?? null,
    graphMode: null,
    opponentId: input.opponentId ?? setup.defaults.opponentId ?? null,
  });

  return { setup, dataset };
}
