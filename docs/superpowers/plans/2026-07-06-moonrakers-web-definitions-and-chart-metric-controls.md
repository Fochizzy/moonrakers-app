# Moonrakers Web Definitions And Chart Metric Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore website glossary access and aggressive glossary hyperlinking while also bringing back in-page metric switching on multi-metric chart detail pages.

**Architecture:** Keep `/definitions` as the single glossary route and expand hyperlink coverage through `DefinitionRichText` instead of replacing the base `Text` primitive. Fix chart detail pages in `app/charts/[chartKey].tsx` by exposing a shared route-driven metric rail and reconnecting existing chart components that already know how to switch metrics.

**Tech Stack:** Expo Router, React Native Web, TypeScript, existing Moonrakers chart components, script-based source regression tests, `npm.cmd`

---

## File Structure

- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - Add shared metric-control wiring for chart detail pages and re-enable component-level metric selectors where appropriate.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
  - Ensure the website keeps an obvious route into Definitions if the current surface is still too hidden.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\DefinitionRichText.tsx`
  - Tighten or extend shared rich-text auto-linking behavior if needed for broader website coverage.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HeroCard.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\SectionCard.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HubTileCard.tsx`
  - Confirm these shared reading surfaces continue to route visible glossary terms through `DefinitionRichText`.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-detail-*.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\definition-*.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-detail-metric-controls.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\web-definitions-access.test.cjs`
  - Guard the restored metric rail and website glossary access points.

## Task 1: Lock The Regressions With Failing Tests

**Files:**
- Create: `scripts/chart-detail-metric-controls.test.cjs`
- Create: `scripts/web-definitions-access.test.cjs`
- Modify: `scripts/definition-rich-text-coverage.test.cjs`

- [ ] **Step 1: Write the failing chart-detail guard**

```js
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "[chartKey].tsx"),
  "utf8"
);

assert.match(
  source,
  /router\.setParams|router\.replace/,
  "expected chart detail metric changes to stay on the detail route"
);

assert.match(
  source,
  /metricOptions|metricDataMap/,
  "expected chart detail to read metric options for multi-metric charts"
);

assert.match(
  source,
  /Sparkline[\s\S]*onChangeMetric/,
  "expected Sparkline detail wiring to expose in-page metric switching"
);

assert.match(
  source,
  /StackedBarChart[\s\S]*onChangeMetric/,
  "expected StackedBarChart detail wiring to expose in-page metric switching"
);
```

- [ ] **Step 2: Write the failing website glossary-access guard**

```js
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const homeSource = fs.readFileSync(
  path.join(__dirname, "..", "app", "index.tsx"),
  "utf8"
);
const richTextSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "ui", "DefinitionRichText.tsx"),
  "utf8"
);

assert.match(
  homeSource,
  /definitions/i,
  "expected the website home surface to keep an obvious Definitions entry"
);

assert.match(
  richTextSource,
  /findDefinitionTextSegments/,
  "expected shared website copy to keep using glossary-aware rich text segmentation"
);
```

- [ ] **Step 3: Run tests to verify failure or current gap**

Run: `node scripts/chart-detail-metric-controls.test.cjs`
Expected: FAIL if detail charts still suppress metric switching

Run: `node scripts/web-definitions-access.test.cjs`
Expected: FAIL if website Definitions access is still too hidden or unwired

- [ ] **Step 4: Extend existing glossary coverage guard**

```js
assert.match(
  richTextCoverageSource,
  /HeroCard|SectionCard|HubTileCard/,
  "expected shared website reading surfaces to stay glossary-aware"
);
```

- [ ] **Step 5: Commit**

```bash
git add scripts/chart-detail-metric-controls.test.cjs scripts/web-definitions-access.test.cjs scripts/definition-rich-text-coverage.test.cjs
git commit -m "test: guard web definitions and chart metric controls"
```

## Task 2: Restore In-Page Metric Controls On Chart Detail Pages

**Files:**
- Modify: `app/charts/[chartKey].tsx`

- [ ] **Step 1: Add failing/expected route-sync assertions to the new guard**

```js
assert.match(
  source,
  /const activeMetric/,
  "expected chart detail to compute an active metric from route or payload state"
);

assert.match(
  source,
  /ChartUnderlineTabs|SetupSegmentedTabs/,
  "expected chart detail to render a compact metric rail"
);
```

- [ ] **Step 2: Compute shared metric options and active metric in chart detail**

```ts
const metricOptions = useMemo(
  () =>
    Array.isArray(datasetData.metricOptions)
      ? datasetData.metricOptions
      : [],
  [datasetData.metricOptions]
);

const activeMetric = useMemo(
  () => String(routeMetric ?? serverActiveMetricKey ?? serverMetricKey ?? "").trim() || null,
  [routeMetric, serverActiveMetricKey, serverMetricKey]
);
```

- [ ] **Step 3: Add a route-driven metric change handler**

```ts
function handleMetricChange(nextMetric: string) {
  const normalized = String(nextMetric ?? "").trim();
  if (!normalized || normalized === activeMetric) {
    return;
  }

  router.setParams({
    metric: normalized,
  } as any);
}
```

- [ ] **Step 4: Render the shared metric rail only for true multi-metric charts**

```tsx
{metricOptions.length > 1 ? (
  <View style={styles.detailMetricRail}>
    <Text style={styles.detailMetricRailTitle}>Metric</Text>
    <ChartUnderlineTabs
      items={metricOptions.map((option: any) => ({
        key: String(option.key),
        label: String(option.shortLabel ?? option.label ?? option.key),
      }))}
      activeKey={activeMetric ?? ""}
      onChange={handleMetricChange}
    />
  </View>
) : null}
```

- [ ] **Step 5: Reconnect internal multi-metric chart props**

```tsx
<Sparkline
  data={serverChartData as any}
  comparisonData={serverComparisonData as any}
  metricOptions={serverMetricOptions as any}
  activeMetricKey={activeMetric ?? undefined}
  onChangeMetric={handleMetricChange}
  showHowItWorks={false}
/>

<StackedBarChart
  data={serverChartData as any}
  metricDataMap={serverMetricDataMap as any}
  metricOptions={serverMetricOptions as any}
  activeMetricKey={activeMetric ?? undefined}
  onChangeMetric={handleMetricChange}
  showMetricSelector
  showCategorySelector
  showHeader={false}
/>
```

- [ ] **Step 6: Keep fixed-metric charts unchanged**

```ts
const chartsWithDetailMetricControls = new Set([
  "line_chart",
  "multi_line_chart",
  "sparkline",
  "bar_chart",
  "bump_chart",
  "consistency_band",
  "heatmap",
  "replay_chart",
  "stacked_bar_chart",
]);
```

- [ ] **Step 7: Run focused tests**

Run: `node scripts/chart-detail-metric-controls.test.cjs`
Expected: PASS

Run: `node scripts/chart-detail-command-link.test.cjs`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/charts/[chartKey].tsx scripts/chart-detail-metric-controls.test.cjs
git commit -m "fix: restore chart detail metric controls on web"
```

## Task 3: Expand Website Glossary Reach Without Global Text Rewrites

**Files:**
- Modify: `app/index.tsx`
- Modify: `components/ui/DefinitionRichText.tsx`
- Modify: `components/ui/HeroCard.tsx`
- Modify: `components/ui/SectionCard.tsx`
- Modify: `components/ui/HubTileCard.tsx`
- Modify: `scripts/web-definitions-access.test.cjs`
- Modify: `scripts/definition-rich-text-coverage.test.cjs`

- [ ] **Step 1: Keep or add an obvious Definitions entry on a web-visible surface**

```tsx
<Pressable onPress={() => router.push(APP_ROUTES.definitions as any)}>
  <Text>Definitions</Text>
</Pressable>
```

- [ ] **Step 2: Confirm shared reading surfaces stay on `DefinitionRichText`**

```tsx
<DefinitionRichText text={title} variant="pageTitle" />
<DefinitionRichText text={subtitle} variant="caption" />
<DefinitionRichText text={description} />
```

- [ ] **Step 3: Tighten `DefinitionRichText` only if coverage gaps remain**

```ts
const segments = useMemo(() => findDefinitionTextSegments(text), [text]);
```

- [ ] **Step 4: Run focused glossary coverage tests**

Run: `node scripts/web-definitions-access.test.cjs`
Expected: PASS

Run: `node scripts/definition-rich-text-coverage.test.cjs`
Expected: PASS

Run: `node scripts/definitions-command-link.test.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx components/ui/DefinitionRichText.tsx components/ui/HeroCard.tsx components/ui/SectionCard.tsx components/ui/HubTileCard.tsx scripts/web-definitions-access.test.cjs scripts/definition-rich-text-coverage.test.cjs
git commit -m "feat: expand website glossary access and linking"
```

## Task 4: Final Verification

**Files:**
- Modify: `app/charts/[chartKey].tsx` if any verification fix is needed
- Modify: glossary surface files only if a focused regression appears

- [ ] **Step 1: Run the focused suite**

Run: `node scripts/chart-detail-metric-controls.test.cjs`
Expected: PASS

Run: `node scripts/web-definitions-access.test.cjs`
Expected: PASS

Run: `node scripts/definition-rich-text-coverage.test.cjs`
Expected: PASS

Run: `node scripts/chart-detail-command-link.test.cjs`
Expected: PASS

Run: `node scripts/chart-guided-rail-route.test.cjs`
Expected: PASS

- [ ] **Step 2: Run any existing chart/detail guards touched by the edits**

Run: `node scripts/chart-component-restore.test.cjs`
Expected: PASS

Run: `node scripts/chart-detail-fallback-chrome.test.cjs`
Expected: PASS

Run: `node scripts/chart-detail-server-render-contract.test.cjs`
Expected: PASS

- [ ] **Step 3: Fix any focused failures inline**

```ts
// Keep fixes narrow: only adjust chart-detail metric wiring or glossary surface props.
```

- [ ] **Step 4: Re-run the failing command until all focused checks pass**

Run: repeat the exact failing command
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/charts/[chartKey].tsx app/index.tsx components/ui/DefinitionRichText.tsx components/ui/HeroCard.tsx components/ui/SectionCard.tsx components/ui/HubTileCard.tsx scripts/chart-detail-metric-controls.test.cjs scripts/web-definitions-access.test.cjs scripts/definition-rich-text-coverage.test.cjs
git commit -m "fix: restore web glossary links and chart metric controls"
```
