import type {
  AnalyticsRpcClient,
  AnalyticsRpcResult,
} from "@moonrakers/analytics-contract";

type SupabaseRpcClientLike = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<AnalyticsRpcResult<unknown>>;
};

export function createAnalyticsRpcClient(
  supabase: SupabaseRpcClientLike,
): AnalyticsRpcClient {
  return {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      const result = await supabase.rpc(name, args);
      return result as AnalyticsRpcResult<TPayload>;
    },
  };
}
