import type { DefinitionEntry, DefinitionSection } from "./definitionsScreen";

export function matchesDefinitionQuery(item: DefinitionEntry, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    item.title.toLowerCase().includes(normalizedQuery) ||
    item.body.toLowerCase().includes(normalizedQuery) ||
    item.key.toLowerCase().includes(normalizedQuery)
  );
}

export function resolveInitialCategory(
  sections: DefinitionSection[],
  metric: string | null | undefined,
  category: string | null | undefined,
) {
  const normalizedMetric = String(metric ?? "").trim();
  const metricSection = normalizedMetric
    ? sections.find((section) =>
        section.items.some((item) => item.key === normalizedMetric),
      )
    : undefined;

  if (metricSection) {
    return metricSection.key;
  }

  const normalizedCategory = String(category ?? "").trim();
  return sections.some((section) => section.key === normalizedCategory)
    ? normalizedCategory
    : "all";
}

export function filterDefinitionSections(input: {
  activeCategory: string;
  query: string;
  sections: DefinitionSection[];
}) {
  return input.sections
    .filter(
      (section) =>
        input.activeCategory === "all" || section.key === input.activeCategory,
    )
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        matchesDefinitionQuery(item, input.query),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
