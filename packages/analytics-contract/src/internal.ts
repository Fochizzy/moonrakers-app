const ANALYTICS_RPC_NAMES = [
  "get_analytics_home",
  "get_stats_screen",
  "get_insights_screen",
  "get_chart_setup",
  "get_chart_dataset",
  "refresh_server_authored_analytics",
];

const ANALYTICS_READ_ONLY_WRITE_PATTERN =
  /cannot execute\s+(?:insert|update|delete|truncate|alter|create|drop)[^]*read-only transaction/i;

export type AnalyticsRpcError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type AnalyticsRpcResult<TPayload> = {
  data: TPayload | null;
  error: AnalyticsRpcError | null;
};

export type AnalyticsRpcClient = {
  rpc<TPayload>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<AnalyticsRpcResult<TPayload>>;
};

function isAnalyticsRpcClient(
  value: AnalyticsRpcClient | unknown,
): value is AnalyticsRpcClient {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { rpc?: unknown }).rpc === "function"
  );
}

export async function resolveAnalyticsCall<TParams>(
  clientOrParams: AnalyticsRpcClient | TParams,
  maybeParams?: TParams,
) {
  if (isAnalyticsRpcClient(clientOrParams)) {
    if (maybeParams === undefined) {
      throw new Error("Analytics RPC params are required.");
    }

    return {
      client: clientOrParams,
      params: maybeParams,
    };
  }

  throw new Error(
    "Callers in shared analytics code must inject an AnalyticsRpcClient explicitly.",
  );
}

function formatAnalyticsRpcError(error: unknown) {
  let message = "";

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const objectMessage =
      typeof record.message === "string" ? record.message.trim() : "";
    const details =
      typeof record.details === "string" ? record.details.trim() : "";
    const hint = typeof record.hint === "string" ? record.hint.trim() : "";

    message = [objectMessage, details, hint].filter(Boolean).join(" ");
  } else {
    message = String(error ?? "").trim();
  }

  if (
    message.includes("EXPO_PUBLIC_SUPABASE_URL") ||
    message.includes("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  ) {
    return "Missing local Supabase config. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart Metro with npx expo start -c.";
  }

  if (
    message.includes("player_name") &&
    (message.includes("column") || message.includes("schema cache"))
  ) {
    return "This Supabase project does not match the Moonrakers schema yet. The app expects public.profiles.player_name, but the connected project is missing that column.";
  }

  if (
    message.includes("deleted_at") &&
    (message.includes("column") || message.includes("schema cache"))
  ) {
    return "This Moonrakers Supabase project is missing the latest profile-delete schema update. Restart Metro with a clear cache so the client fallback loads, or apply the deleted_at migration to the Moonrakers database.";
  }

  if (
    ANALYTICS_RPC_NAMES.some((name) => message.includes(name)) &&
    (
      message.includes("schema cache") ||
      message.includes("permission denied for function")
    )
  ) {
    return "This Moonrakers analytics view is out of sync with the connected Supabase backend. Apply the latest analytics schema update or refresh the PostgREST schema cache, then restart the app with a cleared cache.";
  }

  if (message.includes("display_name") && message.includes("already exists")) {
    return "Display name already in use. Please choose a unique display name.";
  }

  return message || "Unable to connect to Supabase.";
}

function shouldRetryAnalyticsReadAfterRefresh(error: AnalyticsRpcError | null) {
  if (!error) {
    return false;
  }

  const errorText = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");

  return ANALYTICS_READ_ONLY_WRITE_PATTERN.test(errorText);
}

export function unwrapAnalyticsResult<TPayload>(
  rpcName: string,
  result: AnalyticsRpcResult<TPayload>,
) {
  if (result.error) {
    const formatted = formatAnalyticsRpcError({
      message: result.error.message
        ? `${rpcName} failed: ${result.error.message.trim()}`
        : `${rpcName} failed.`,
      details: result.error.details?.trim(),
      hint: result.error.hint?.trim(),
    });

    throw new Error(formatted || `${rpcName} failed.`);
  }

  if (result.data === null) {
    throw new Error(`${rpcName} returned no payload.`);
  }

  return result.data;
}

export async function executeAnalyticsReadRpc<TPayload>(
  client: AnalyticsRpcClient,
  rpcName: string,
  rpcArgs: Record<string, unknown>,
  profileId: string,
) {
  const result = await client.rpc<TPayload>(rpcName, rpcArgs);

  if (!shouldRetryAnalyticsReadAfterRefresh(result.error)) {
    return unwrapAnalyticsResult(rpcName, result);
  }

  // Older analytics migrations briefly pushed a rollup refresh into read RPCs.
  const refreshResult = await client.rpc<unknown>(
    "refresh_server_authored_analytics",
    {
      target_profile_id: profileId,
    },
  );
  unwrapAnalyticsResult("refresh_server_authored_analytics", refreshResult);

  const retriedResult = await client.rpc<TPayload>(rpcName, rpcArgs);
  return unwrapAnalyticsResult(rpcName, retriedResult);
}
