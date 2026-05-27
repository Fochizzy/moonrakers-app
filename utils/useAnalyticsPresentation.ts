import { useMemo } from "react";

import { formatSupabaseConfigError } from "@/lib/supabase";

import { buildAnalyticsFreshnessPresentation } from "./analyticsFreshness";

type AnalyticsPresentationQuery = {
  error: unknown | null;
  isStale: boolean;
  lastSuccessAt?: number | null;
  staleMessage?: string | null;
  refresh: () => void;
};

type UseAnalyticsPresentationOptions = {
  fallbackMessage: string;
  query: AnalyticsPresentationQuery;
  retryLabel?: string | null;
  showSourceBadgeWhenReady?: boolean;
  sourceLabel?: string | null;
  staleEntityLabel: string;
  staleLabel?: string | null;
};

export function useAnalyticsPresentation({
  fallbackMessage,
  query,
  retryLabel = null,
  showSourceBadgeWhenReady = true,
  sourceLabel = null,
  staleEntityLabel,
  staleLabel = null,
}: UseAnalyticsPresentationOptions) {
  const error = useMemo(() => {
    const nextError = query.error;
    return nextError !== null
      ? formatSupabaseConfigError(nextError) || fallbackMessage
      : null;
  }, [fallbackMessage, query.error]);

  const freshness = useMemo(
    () =>
      buildAnalyticsFreshnessPresentation({
        error,
        isStale: query.isStale,
        lastSuccessAt: query.lastSuccessAt,
        refresh: query.refresh,
        retryLabel,
        showSourceBadgeWhenReady,
        sourceLabel,
        staleEntityLabel,
        staleLabel,
        staleMessage: query.staleMessage ?? null,
      }),
    [
      error,
      query.isStale,
      query.lastSuccessAt,
      query.refresh,
      query.staleMessage,
      retryLabel,
      showSourceBadgeWhenReady,
      sourceLabel,
      staleEntityLabel,
      staleLabel,
    ],
  );

  return { error, freshness };
}
