import {
  getChartDataset as getSharedChartDataset,
  type AnalyticsRpcClient,
  type ChartDatasetParams,
  type ChartDatasetPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

export async function getChartDataset(
  params: ChartDatasetParams,
): Promise<ChartDatasetPayload>;
export async function getChartDataset(
  client: AnalyticsRpcClient,
  params: ChartDatasetParams,
): Promise<ChartDatasetPayload>;
export async function getChartDataset(
  clientOrParams: AnalyticsRpcClient | ChartDatasetParams | undefined,
  maybeParams?: ChartDatasetParams,
): Promise<ChartDatasetPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );

  return getSharedChartDataset(client, params);
}
