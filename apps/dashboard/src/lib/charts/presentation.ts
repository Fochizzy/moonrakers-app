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
