import { describe, expect, it } from "vitest";

import { buildPreviewStatFamilies, countPreviewMetrics } from "./previewCatalog";

describe("buildPreviewStatFamilies", () => {
  const families = buildPreviewStatFamilies();

  it("publishes every family in the definitions catalog", () => {
    expect(families.length).toBeGreaterThan(0);
    for (const family of families) {
      expect(family.title).not.toBe("");
      expect(family.subtitle).not.toBe("");
    }
  });

  it("never lists the same metric name twice inside a family", () => {
    for (const family of families) {
      expect(new Set(family.metricTitles).size).toBe(family.metricTitles.length);
    }
  });

  it("keeps each family's count equal to the names it lists", () => {
    for (const family of families) {
      expect(family.metricCount).toBe(family.metricTitles.length);
    }
  });

  it("totals the headline metric figure from the same families", () => {
    const total = families.reduce(
      (running, family) => running + family.metricTitles.length,
      0,
    );

    expect(countPreviewMetrics(families)).toBe(total);
  });
});
