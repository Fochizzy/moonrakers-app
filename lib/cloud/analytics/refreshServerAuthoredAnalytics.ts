import {
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
  type RefreshServerAuthoredAnalyticsParams,
  unwrapAnalyticsResult,
} from "./types.ts";

export async function refreshServerAuthoredAnalytics(
  params: RefreshServerAuthoredAnalyticsParams,
): Promise<unknown>;
export async function refreshServerAuthoredAnalytics(
  client: AnalyticsRpcClient,
  params: RefreshServerAuthoredAnalyticsParams,
): Promise<unknown>;
export async function refreshServerAuthoredAnalytics(
  clientOrParams:
    | AnalyticsRpcClient
    | RefreshServerAuthoredAnalyticsParams
    | undefined,
  maybeParams?: RefreshServerAuthoredAnalyticsParams,
) {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );
  const result = await client.rpc<unknown>("refresh_server_authored_analytics", {
    target_profile_id: params.profileId,
  });

  return unwrapAnalyticsResult("refresh_server_authored_analytics", result);
}
