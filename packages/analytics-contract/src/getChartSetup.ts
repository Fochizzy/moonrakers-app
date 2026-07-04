import {
  resolveAnalyticsCall,
  unwrapAnalyticsResult,
  type AnalyticsRpcClient,
} from "./internal.ts";
import type { ChartSetupParams, ChartSetupPayload } from "./types.ts";

export async function getChartSetup(
  client: AnalyticsRpcClient,
  params: ChartSetupParams,
): Promise<ChartSetupPayload> {
  const resolved = await resolveAnalyticsCall(client, params);
  const result = await resolved.client.rpc<ChartSetupPayload>("get_chart_setup", {
    chart_key: resolved.params.chartKey,
    profile_id: resolved.params.profileId,
  });

  return unwrapAnalyticsResult("get_chart_setup", result);
}
