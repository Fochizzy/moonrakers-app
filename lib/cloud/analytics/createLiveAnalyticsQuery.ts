import type { LiveAnalyticsQueryState } from "./types.ts";

export function createLiveAnalyticsQueryState<TPayload>(
  queryKey: string,
): LiveAnalyticsQueryState<TPayload> {
  return {
    queryKey,
    payload: null,
    loading: false,
    refreshing: false,
    error: null,
    isStale: false,
    staleMessage: null,
    lastSuccessAt: null,
  };
}

export function beginLiveAnalyticsRequest<TPayload>(
  current: LiveAnalyticsQueryState<TPayload>,
  nextQueryKey: string,
): LiveAnalyticsQueryState<TPayload> {
  if (current.queryKey !== nextQueryKey) {
    return {
      queryKey: nextQueryKey,
      payload: null,
      loading: true,
      refreshing: false,
      error: null,
      isStale: false,
      staleMessage: null,
      lastSuccessAt: null,
    };
  }

  if (current.payload === null) {
    return {
      ...current,
      loading: true,
      refreshing: false,
      error: null,
      isStale: false,
      staleMessage: null,
    };
  }

  return {
    ...current,
    loading: false,
    refreshing: true,
    error: null,
    isStale: false,
    staleMessage: null,
  };
}

export function resolveLiveAnalyticsSuccess<TPayload>(
  current: LiveAnalyticsQueryState<TPayload>,
  payload: TPayload,
  resolvedAt: number = Date.now(),
): LiveAnalyticsQueryState<TPayload> {
  return {
    ...current,
    payload,
    loading: false,
    refreshing: false,
    error: null,
    isStale: false,
    staleMessage: null,
    lastSuccessAt: resolvedAt,
  };
}

export function resolveLiveAnalyticsFailure<TPayload>(
  current: LiveAnalyticsQueryState<TPayload>,
  message: string,
): LiveAnalyticsQueryState<TPayload> {
  const normalizedMessage = message.trim() || "Failed to load analytics.";

  if (current.payload !== null) {
    return {
      ...current,
      loading: false,
      refreshing: false,
      error: null,
      isStale: true,
      staleMessage: normalizedMessage,
    };
  }

  return {
    ...current,
    payload: null,
    loading: false,
    refreshing: false,
    error: normalizedMessage,
    isStale: false,
    staleMessage: null,
  };
}
