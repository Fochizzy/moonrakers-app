import {
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
  type ChartSetupParams,
  type ChartSetupPayload,
  unwrapAnalyticsResult,
} from "./types.ts";

export async function getChartSetup(
  params: ChartSetupParams,
): Promise<ChartSetupPayload>;
export async function getChartSetup(
  client: AnalyticsRpcClient,
  params: ChartSetupParams,
): Promise<ChartSetupPayload>;
export async function getChartSetup(
  clientOrParams: AnalyticsRpcClient | ChartSetupParams | undefined,
  maybeParams?: ChartSetupParams,
): Promise<ChartSetupPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );
  const result = await client.rpc<ChartSetupPayload>("get_chart_setup", {
    chart_key: params.chartKey,
    profile_id: params.profileId,
  });

  return unwrapAnalyticsResult("get_chart_setup", result);
}
