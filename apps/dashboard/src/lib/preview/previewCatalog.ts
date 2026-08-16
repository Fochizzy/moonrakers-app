import { DEFINITION_GROUPS } from "../../../../../utils/definitionCatalog";

export type PreviewStatFamily = {
  key: string;
  metricCount: number;
  /** Every published metric name in the family, so the count is not a claim. */
  metricTitles: string[];
  subtitle: string;
  title: string;
};

/**
 * A handful of catalog entries share a display title — `assistanceEfficiency`
 * and `assistEfficiency` both publish as "Assist Efficiency". Listing a name
 * twice reads as a rendering fault rather than as two metrics, so the preview
 * counts and prints distinct names.
 */
function distinctTitles(titles: string[]) {
  return [...new Set(titles)];
}

/**
 * Built on the server from the same catalog the signed-in Definitions page
 * reads. Hand-listing the families here would let the preview drift into
 * advertising metrics the product no longer publishes.
 */
export function buildPreviewStatFamilies(): PreviewStatFamily[] {
  return DEFINITION_GROUPS.map((group) => {
    const metricTitles = distinctTitles(group.items.map((item) => item.title));

    return {
      key: group.key,
      metricCount: metricTitles.length,
      metricTitles,
      subtitle: group.subtitle,
      title: group.title,
    };
  });
}

export function countPreviewMetrics(families: PreviewStatFamily[]) {
  return families.reduce((total, family) => total + family.metricCount, 0);
}
