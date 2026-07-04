import {
  getChartSetup as getSharedChartSetup,
  type AnalyticsRpcClient,
  type ChartSetupParams,
  type ChartSetupPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

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

  return getSharedChartSetup(client, params);
}
