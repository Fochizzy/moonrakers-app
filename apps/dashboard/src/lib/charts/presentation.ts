const PLACEHOLDER_CHART_TITLE = "Analytics chart";
const PLACEHOLDER_CHART_SUBTITLE = "Server-authored placeholder dataset.";

function normalizePresentationCopy(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveChartPresentationTitle(
  title: string | null | undefined,
  fallback: string,
) {
  const normalized = normalizePresentationCopy(title);
  return normalized && normalized !== PLACEHOLDER_CHART_TITLE
    ? normalized
    : fallback;
}

export function resolveChartPresentationSubtitle(
  subtitle: string | null | undefined,
  fallback: string,
) {
  const normalized = normalizePresentationCopy(subtitle);
  return normalized && normalized !== PLACEHOLDER_CHART_SUBTITLE
    ? normalized
    : fallback;
}

/**
 * The page heading already filters the stub copy the chart RPC ships, but the
 * renderers read `title`/`subtitle` straight off the dataset, which is how
 * "Server-authored placeholder dataset." kept appearing inside the chart panel.
 * Drop it once, before the dataset reaches a renderer.
 */
export function stripPlaceholderChartPresentation<
  TDataset extends { title?: string; subtitle?: string },
>(dataset: TDataset): TDataset {
  const title = normalizePresentationCopy(dataset.title);
  const subtitle = normalizePresentationCopy(dataset.subtitle);

  return {
    ...dataset,
    title: title && title !== PLACEHOLDER_CHART_TITLE ? title : undefined,
    subtitle:
      subtitle && subtitle !== PLACEHOLDER_CHART_SUBTITLE ? subtitle : undefined,
  };
}
