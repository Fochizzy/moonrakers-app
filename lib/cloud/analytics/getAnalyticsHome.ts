import {
  executeAnalyticsReadRpc,
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsHomeParams,
  type AnalyticsHomePayload,
  type AnalyticsRpcClient,
} from "./types.ts";

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
  return executeAnalyticsReadRpc(
    client,
    "get_analytics_home",
    {
      profile_id: params.profileId,
    },
    params.profileId,
  );
}
