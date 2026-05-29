# Moonrakers Radar Report Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `Deep Comparison Report` easier to read by rendering each report paragraph inside its own inset panel while preserving all existing copy, order, and interpretations.

**Architecture:** Keep the current stacked-card report structure and `deepReportSections` content flow unchanged. Only change the body treatment inside each report section card by adding paragraph panels, stronger spacing, and the supporting source-level tests that lock that structure in.

**Tech Stack:** React Native, TypeScript, local Node assertion scripts

---

### Task 1: Lock in the inset paragraph-panel structure with a failing test

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
assert.match(
  radarSource,
  /reportParagraphPanel/,
  "expected the radar chart to render inset paragraph panels inside deep report cards"
);

assert.match(
  radarSource,
  /style={styles\.reportParagraphPanel}/,
  "expected each deep report paragraph to render inside a dedicated panel wrapper"
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\scripts\radar-chart-summary-and-glossary.test.cjs`
Expected: FAIL because the current source still renders `reportParagraph` text directly inside `reportParagraphStack`

### Task 2: Add inset paragraph panels to the deep report cards

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RadarChart\RadarChart.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`

- [ ] **Step 1: Wrap each report paragraph in a dedicated panel**

```tsx
<View style={styles.reportParagraphStack}>
  {section.paragraphs.map((paragraph, index) => (
    <View key={`${section.title}-${index}`} style={styles.reportParagraphPanel}>
      <Text style={styles.reportParagraph}>{paragraph}</Text>
    </View>
  ))}
</View>
```

- [ ] **Step 2: Add the supporting readability styles**

```tsx
deepReportSectionCard: {
  gap: 10,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: CHART_COLORS.borderStrong,
  backgroundColor: CHART_COLORS.cardAlt,
  paddingHorizontal: 16,
  paddingVertical: 14,
},
reportParagraphStack: {
  gap: 10,
},
reportParagraphPanel: {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: CHART_COLORS.border,
  backgroundColor: "rgba(8,16,34,0.56)",
  paddingHorizontal: 12,
  paddingVertical: 12,
},
reportParagraph: {
  color: CHART_COLORS.text,
  fontSize: 12,
  lineHeight: 20,
},
```

- [ ] **Step 3: Run the first test to verify it passes**

Run: `node .\scripts\radar-chart-summary-and-glossary.test.cjs`
Expected: PASS

### Task 3: Protect the broader radar report seam

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`

- [ ] **Step 1: Add a readability seam assertion**

```js
assert.match(
  radarSource,
  /Deep Comparison Report[\s\S]*reportParagraphPanel[\s\S]*Trait Definitions/s,
  "expected the radar chart to keep inset paragraph panels inside the deep comparison report before the glossary"
);
```

- [ ] **Step 2: Run the style test**

Run: `node .\scripts\radar-chart-style.test.cjs`
Expected: PASS

### Task 4: Run focused verification and commit

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RadarChart\RadarChart.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\docs\superpowers\plans\2026-05-29-moonrakers-radar-report-readability-implementation.md`

- [ ] **Step 1: Run the focused verification commands**

Run:

```powershell
node .\scripts\radar-chart-summary-and-glossary.test.cjs
node .\scripts\radar-chart-style.test.cjs
.\node_modules\.bin\tsc.cmd --noEmit --pretty false
```

Expected: both script tests print `passed`, and `tsc` exits with code `0`

- [ ] **Step 2: Commit the readability pass**

```bash
git add components/charts/RadarChart/RadarChart.tsx scripts/radar-chart-summary-and-glossary.test.cjs scripts/radar-chart-style.test.cjs docs/superpowers/plans/2026-05-29-moonrakers-radar-report-readability-implementation.md
git commit -m "feat: improve radar report readability"
```
