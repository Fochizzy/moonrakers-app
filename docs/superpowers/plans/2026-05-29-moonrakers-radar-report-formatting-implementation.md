# Moonrakers Radar Report Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformat the `RadarChart` deep comparison narrative into stacked cards that are easier to scan on mobile without changing the underlying data or report copy.

**Architecture:** Keep `deepReportSections` as the narrative source of truth, but replace the single long deep-report article render with a small intro card plus one card per section. Preserve the existing comparison cards and trait grids, and lock the new structure in with focused source-level tests.

**Tech Stack:** React Native, TypeScript, local Node assertion scripts

---

### Task 1: Lock in the new report structure with a failing test

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
assert.match(
  radarSource,
  /deepReportIntroCard/,
  "expected the radar chart to render a dedicated deep-report intro card"
);

assert.match(
  radarSource,
  /deepReportSectionCard/,
  "expected the radar chart to render stacked deep-report section cards"
);

assert.doesNotMatch(
  radarSource,
  /<View style={styles\.deepReportCard}>[\s\S]*reportSectionStack/s,
  "expected the radar chart to stop rendering the full deep report inside one monolithic card"
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\scripts\radar-chart-summary-and-glossary.test.cjs`
Expected: FAIL because the current source still uses `deepReportCard` with `reportSectionStack`

### Task 2: Rebuild the deep comparison report as stacked cards

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RadarChart\RadarChart.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`

- [ ] **Step 1: Write the minimal implementation**

```tsx
const reportLeadSection = deepReportSections[0] ?? null;
const reportPlayerSections = deepReportSections.filter((section) => section.title !== "Overview" && section.title !== "Consistency Outlook");
const reportConsistencySection =
  deepReportSections.find((section) => section.title === "Consistency Outlook") ?? null;

<View style={styles.deepReportStack}>
  <View style={styles.deepReportIntroCard}>
    <Text style={styles.definitionTitle}>Deep Comparison Report</Text>
    <Text style={styles.definitionSubtitle}>
      A longer read on which traits stay portable and which ones shift across the selected comparison players.
    </Text>
  </View>

  {reportLeadSection ? (
    <View style={styles.deepReportSectionCard}>
      <Text style={styles.reportSectionTitle}>{reportLeadSection.title}</Text>
      {reportLeadSection.paragraphs.map(...)}
    </View>
  ) : null}

  {reportPlayerSections.map((section) => (
    <View key={section.title} style={styles.deepReportSectionCard}>
      <Text style={styles.reportSectionTitle}>{section.title}</Text>
      {section.paragraphs.map(...)}
    </View>
  ))}

  {reportConsistencySection ? (
    <View style={styles.deepReportSectionCard}>
      <Text style={styles.reportSectionTitle}>{reportConsistencySection.title}</Text>
      {reportConsistencySection.paragraphs.map(...)}
    </View>
  ) : null}
</View>
```

- [ ] **Step 2: Add the supporting styles**

```tsx
deepReportStack: {
  gap: 10,
},
deepReportIntroCard: {
  gap: 8,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: CHART_COLORS.borderStrong,
  backgroundColor: CHART_COLORS.cardAlt,
  paddingHorizontal: 14,
  paddingVertical: 12,
},
deepReportSectionCard: {
  gap: 8,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: CHART_COLORS.borderStrong,
  backgroundColor: CHART_COLORS.cardAlt,
  paddingHorizontal: 14,
  paddingVertical: 12,
},
reportParagraphStack: {
  gap: 8,
},
```

- [ ] **Step 3: Run the first test to verify it passes**

Run: `node .\scripts\radar-chart-summary-and-glossary.test.cjs`
Expected: PASS

### Task 3: Protect the overall seam and regression surface

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`

- [ ] **Step 1: Update the seam assertion**

```js
assert.match(
  radarSource,
  /<ChartFocusCard[\s\S]*<ChartStage[\s\S]*Comparison Summary[\s\S]*Deep Comparison Report[\s\S]*Trait Definitions/s,
  "expected the radar chart to keep the staged plot, comparison summary, deep comparison report, and trait glossary seam"
);
```

- [ ] **Step 2: Run the style test**

Run: `node .\scripts\radar-chart-style.test.cjs`
Expected: PASS

### Task 4: Run the focused verification sweep and commit

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RadarChart\RadarChart.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`

- [ ] **Step 1: Run the focused verification commands**

Run:

```powershell
node .\scripts\radar-chart-summary-and-glossary.test.cjs
node .\scripts\radar-chart-style.test.cjs
```

Expected: both scripts exit cleanly and print their `passed` messages

- [ ] **Step 2: Commit the implementation**

```bash
git add components/charts/RadarChart/RadarChart.tsx scripts/radar-chart-summary-and-glossary.test.cjs scripts/radar-chart-style.test.cjs docs/superpowers/plans/2026-05-29-moonrakers-radar-report-formatting-implementation.md
git commit -m "feat: improve radar report formatting"
```
