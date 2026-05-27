import type { RecoveryAction } from "@/components/analytics/AnalyticsRecoveryCard";
import type { AnalyticsSourceKind } from "@/components/analytics/AnalyticsSourceBadge";

type BuildAnalyticsFreshnessPresentationInput = {
  error: string | null;
  isStale: boolean;
  lastSuccessAt?: number | null;
  refresh: () => void;
  retryLabel?: string | null;
  showSourceBadgeWhenReady?: boolean;
  sourceLabel?: string | null;
  staleEntityLabel: string;
  staleLabel?: string | null;
  staleMessage: string | null;
};

type AnalyticsFreshnessPresentation = {
  retryAction: RecoveryAction | null;
  sourceCaption: (readyCaption: string) => string;
  sourceKind: AnalyticsSourceKind | null;
  sourceLabel: string | null;
};

export function buildAnalyticsFreshnessPresentation({
  error,
  isStale,
  lastSuccessAt = null,
  refresh,
  retryLabel = null,
  showSourceBadgeWhenReady = true,
  sourceLabel = null,
  staleEntityLabel,
  staleLabel = null,
  staleMessage,
}: BuildAnalyticsFreshnessPresentationInput): AnalyticsFreshnessPresentation {
  const hasRecoveredServerData = isStale || lastSuccessAt !== null;
  const normalizedError = String(error ?? "").trim() || null;
  const normalizedStaleMessage = String(staleMessage ?? "").trim() || null;
  const normalizedStaleEntityLabel =
    String(staleEntityLabel ?? "").trim() || "analytics payload";
  const stalePrefix = `Showing the last successful Supabase ${normalizedStaleEntityLabel}.`;

  const nextSourceKind: AnalyticsSourceKind | null = isStale
    ? "server-stale"
    : normalizedError && !hasRecoveredServerData
      ? null
      : showSourceBadgeWhenReady
        ? "server"
        : null;

  const nextSourceLabel =
    nextSourceKind === "server-stale"
      ? String(staleLabel ?? "").trim() || "Stale server data"
      : nextSourceKind === "server"
        ? String(sourceLabel ?? "").trim() || "Server data"
        : null;

  const retryAction =
    normalizedError || isStale
      ? {
          label: String(retryLabel ?? "").trim() || "Retry sync",
          onPress: refresh,
          variant:
            normalizedError && !hasRecoveredServerData ? ("primary" as const) : ("secondary" as const),
        }
      : null;

  return {
    retryAction,
    sourceCaption: (readyCaption: string) => {
      if (normalizedError && !hasRecoveredServerData) {
        return normalizedError;
      }

      if (isStale) {
        return normalizedStaleMessage
          ? `${stalePrefix} Latest refresh failure: ${normalizedStaleMessage}`
          : stalePrefix;
      }

      return String(readyCaption ?? "").trim();
    },
    sourceKind: nextSourceKind,
    sourceLabel: nextSourceLabel,
  };
}
