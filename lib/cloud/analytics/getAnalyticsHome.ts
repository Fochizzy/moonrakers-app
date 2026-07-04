import {
  getAnalyticsHome as getSharedAnalyticsHome,
  type AnalyticsHomeParams,
  type AnalyticsHomePayload,
  type AnalyticsRpcClient,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

export async function getAnalyticsHome(
  params: AnalyticsHomeParams,
): Promise<AnalyticsHomePayload>;
export async function getAnalyticsHome(
  client: AnalyticsRpcClient,
  params: AnalyticsHomeParams,
): Promise<AnalyticsHomePayload>;
export async function getAnalyticsHome(
  clientOrParams: AnalyticsRpcClient | AnalyticsHomeParams | undefined,
  maybeParams?: AnalyticsHomeParams,
): Promise<AnalyticsHomePayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );

  return getSharedAnalyticsHome(client, params);
}
