export * from "@moonrakers/analytics-contract";

import {
  executeAnalyticsReadRpc as executeSharedAnalyticsReadRpc,
  unwrapAnalyticsResult as unwrapSharedAnalyticsResult,
  type AnalyticsRpcClient,
  type AnalyticsRpcResult,
} from "@moonrakers/analytics-contract";

function isAnalyticsRpcClient(
  value: AnalyticsRpcClient | unknown,
): value is AnalyticsRpcClient {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { rpc?: unknown }).rpc === "function"
  );
}

export async function getDefaultAnalyticsRpcClient(): Promise<AnalyticsRpcClient> {
  const { supabase } = await import("../../supabase.ts");

  return {
    async rpc<TPayload>(name, args) {
      const result = await supabase.rpc(name as never, args as never);
      return result as AnalyticsRpcResult<TPayload>;
    },
  };
}

export async function resolveAnalyticsCall<TParams>(
  loadDefaultClient: () => Promise<AnalyticsRpcClient>,
  clientOrParams: AnalyticsRpcClient | TParams | undefined,
  maybeParams?: TParams,
) {
  if (isAnalyticsRpcClient(clientOrParams)) {
    if (maybeParams === undefined) {
      throw new Error(
        "Analytics RPC client was provided without params. Call the wrapper with (params) or (client, params).",
      );
    }

    return {
      client: clientOrParams,
      params: maybeParams,
    };
  }

  if (clientOrParams !== undefined) {
    return {
      client: await loadDefaultClient(),
      params: clientOrParams,
    };
  }

  if (maybeParams !== undefined) {
    return {
      client: await loadDefaultClient(),
      params: maybeParams,
    };
  }

  throw new Error("Analytics params are required.");
}

export function unwrapAnalyticsResult<TPayload>(
  rpcName: string,
  result: AnalyticsRpcResult<TPayload>,
) {
  return unwrapSharedAnalyticsResult(rpcName, result);
}

export async function executeAnalyticsReadRpc<TPayload>(
  client: AnalyticsRpcClient,
  rpcName: string,
  rpcArgs: Record<string, unknown>,
  profileId: string,
) {
  return executeSharedAnalyticsReadRpc(client, rpcName, rpcArgs, profileId);
}
