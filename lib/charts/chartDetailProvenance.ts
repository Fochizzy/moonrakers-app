// Relative rather than "@/": scripts/chart-detail-provenance.test.ts runs under
// plain node, which does not resolve the bundler alias.
import { buildAnalyticsFreshnessPresentation } from "../../utils/analyticsFreshness.ts";

export type ChartDetailProvenanceInput = {
  hasServerPayload: boolean;
  isStale: boolean;
  usingCloudFallbackData: boolean;
  staleMessage?: string | null;
};

export type ChartDetailProvenance = {
  kind: "server" | "server-stale" | "supabase-fallback" | "device-fallback";
  label: string;
  caption: string;
};

export function resolveChartDetailProvenance(
  input: ChartDetailProvenanceInput,
): ChartDetailProvenance {
  if (input.hasServerPayload) {
    // Compose through the shared presenter so chart detail reports provenance in
    // the same words as stats, insights and player profile, and picks up any
    // future change to the stale threshold or wording for free.
    const freshness = buildAnalyticsFreshnessPresentation({
      error: null,
      isStale: input.isStale,
      refresh: () => undefined,
      sourceLabel: "Server data",
      staleEntityLabel: "chart dataset",
      staleMessage: input.staleMessage ?? null,
    });

    return {
      kind: input.isStale ? "server-stale" : "server",
      label: freshness.sourceLabel ?? "Server data",
      caption: freshness.sourceCaption(
        "Rendering the published Supabase chart dataset for this view.",
      ),
    };
  }

  if (input.usingCloudFallbackData) {
    return {
      kind: "supabase-fallback",
      label: "Supabase fallback",
      caption: "The published chart dataset is unavailable, so this view is using Supabase game history directly.",
    };
  }

  return {
    kind: "device-fallback",
    label: "Device fallback",
    caption: "The published chart dataset is unavailable, so this view is using saved history on this device.",
  };
}
