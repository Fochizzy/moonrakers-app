# Compare Chart Metric Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/charts/compare` into a real metric-driven matchup chart with focus, rival, and metric selectors plus clearer chart labeling.

**Architecture:** Keep the existing dashboard chart detail route and comparison renderer, but teach the dashboard loader to treat `compare` as a metric-capable compare chart. Reuse the existing fallback history rebuild for per-game rows, then update the renderer to surface the active metric and matchup framing in the labels.

**Tech Stack:** Next.js, React, Vitest, Recharts, Moonrakers dashboard chart fallback helpers

---

### Task 1: Lock the compare-route expectations in tests

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\.worktrees\cloudflare-dashboard-launch\apps\dashboard\src\lib\data\loadChartScreen.test.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\.worktrees\cloudflare-dashboard-launch\apps\dashboard\src\components\charts\ChartRenderer.test.tsx`

- [ ] Add a failing loader test that expects `chartKey: "compare"` to preserve `comparePlayerId`, surface compare-player options, and keep a chosen `metricKey`.
- [ ] Run the focused loader test and verify it fails for the missing compare support.
- [ ] Add a failing renderer test that expects comparison charts to show `X: Shared Game` and the chosen metric label on Y.
- [ ] Run the focused renderer test and verify it fails for the generic axis copy.

### Task 2: Wire compare charts into the dashboard setup and fallback controls

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\.worktrees\cloudflare-dashboard-launch\apps\dashboard\src\lib\data\loadChartScreen.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\.worktrees\cloudflare-dashboard-launch\utils\charts.ts`

- [ ] Update the dashboard chart capability logic so `compare` supports compare-player controls and metric selection.
- [ ] Extend the shared metric support list so local compare fallback can normalize and preserve `metricKey`.
- [ ] Re-run the focused loader test until it passes.

### Task 3: Clarify compare chart presentation

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\.worktrees\cloudflare-dashboard-launch\apps\dashboard\src\components\charts\renderers\ComparisonChartPanel.tsx`

- [ ] Replace generic axis labels with matchup-aware copy driven by the active metric label.
- [ ] Keep series labels tied to the selected focus and compare players.
- [ ] Re-run the focused renderer test until it passes.

### Task 4: Run the full focused verification sweep

**Files:**
- Verify only

- [ ] Run `npm.cmd run test --workspace @moonrakers/dashboard -- src/lib/data/loadChartScreen.test.ts`
- [ ] Run `npm.cmd run test --workspace @moonrakers/dashboard -- src/components/charts/ChartRenderer.test.tsx`
- [ ] Run `npm.cmd run test --workspace @moonrakers/dashboard -- src/components/charts/ChartDetailView.test.tsx`
- [ ] Run `npm.cmd run typecheck --workspace @moonrakers/dashboard`
