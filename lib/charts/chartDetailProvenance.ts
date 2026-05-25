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
    if (input.isStale) {
      return {
        kind: "server-stale",
        label: "Server stale",
        caption: `Showing the last successful Supabase chart dataset because the latest refresh failed${input.staleMessage ? `: ${input.staleMessage}` : "."}`,
      };
    }

    return {
      kind: "server",
      label: "Server",
      caption: "Rendering the published Supabase chart dataset for this view.",
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
