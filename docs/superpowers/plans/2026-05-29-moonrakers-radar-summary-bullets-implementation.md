# Moonrakers Radar Summary Bullets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the radar summary sentences as bullet rows in both the top `Comparison Summary` card and each comparison-card summary block without changing any summary copy.

**Architecture:** Keep `summaryLines` and `summaryForSeries` unchanged, but replace their direct `Text` mapping with one shared bullet-row renderer. Add focused source-level assertions for the shared summary bullet structure, then re-run the radar checks and TypeScript compile verification.

**Tech Stack:** React Native, TypeScript, local Node assertion scripts

---

### Task 1: Lock in the shared bullet-row structure with a failing test

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`

- [ ] **Step 1: Write the failing test**

```js
assert.match(
  radarSource,
  /SummaryBulletRows/,
  "expected the radar chart to render summary lines through a shared bullet-row helper"
);

assert.match(
  radarSource,
  /summaryBulletRow/,
  "expected the radar chart to define bullet-row styling for summary lines"
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\scripts\radar-chart-summary-and-glossary.test.cjs`
Expected: FAIL because the current summary lines still render directly as `Text` elements

### Task 2: Replace plain summary lines with shared bullet rows

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RadarChart\RadarChart.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-summary-and-glossary.test.cjs`

- [ ] **Step 1: Add a shared summary bullet helper**

```tsx
function SummaryBulletRows({ lines, keyPrefix }: { lines: string[]; keyPrefix: string }) {
  return (
    <View style={styles.summaryBulletStack}>
      {lines.map((line, index) => (
        <View key={`${keyPrefix}-${index}`} style={styles.summaryBulletRow}>
          <View style={styles.summaryBulletDot} />
          <Text style={styles.summaryLine}>{line}</Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Swap both summary render sites to the shared helper**

```tsx
<SummaryBulletRows lines={summaryLines} keyPrefix="summary" />

<SummaryBulletRows lines={summaryForSeries} keyPrefix={series.key} />
```

- [ ] **Step 3: Add the supporting bullet-row styles**

```tsx
summaryBulletStack: {
  gap: 8,
},
summaryBulletRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
},
summaryBulletDot: {
  width: 6,
  height: 6,
  borderRadius: 999,
  backgroundColor: CHART_COLORS.accent,
  marginTop: 6,
  flexShrink: 0,
},
summaryLine: {
  flex: 1,
  color: CHART_COLORS.text,
  fontSize: 12,
  lineHeight: 18,
},
```

- [ ] **Step 4: Run the first test to verify it passes**

Run: `node .\scripts\radar-chart-summary-and-glossary.test.cjs`
Expected: PASS

### Task 3: Protect the broader radar seam

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\radar-chart-style.test.cjs`

- [ ] **Step 1: Add a bullet-row seam assertion**

```js
assert.match(
  radarSource,
  /Comparison Summary[\s\S]*<SummaryBulletRows[\s\S]*Deep Comparison Report/s,
  "expected the radar chart to render bullet-row summaries between the chart stage and the deep report"
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
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\docs\superpowers\plans\2026-05-29-moonrakers-radar-summary-bullets-implementation.md`

- [ ] **Step 1: Run the focused verification commands**

Run:

```powershell
node .\scripts\radar-chart-summary-and-glossary.test.cjs
node .\scripts\radar-chart-style.test.cjs
.\node_modules\.bin\tsc.cmd --noEmit --pretty false
```

Expected: both scripts print `passed`, and `tsc` exits with code `0`

- [ ] **Step 2: Commit the bullet-summary pass**

```bash
git add components/charts/RadarChart/RadarChart.tsx scripts/radar-chart-summary-and-glossary.test.cjs scripts/radar-chart-style.test.cjs docs/superpowers/plans/2026-05-29-moonrakers-radar-summary-bullets-implementation.md
git commit -m "feat: add radar summary bullets"
```
