# Moonrakers Visual System Retrofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the remaining Moonrakers visual-system outliers, standardize analytics controls, and clarify CTA hierarchy without changing gameplay or analytics contracts.

**Architecture:** Add one shared analytics control rail and a stronger `ActionButton` hierarchy first, then retrofit the analytics/profile/compare surfaces onto those primitives before touching the live game and player-card outliers. Keep all behavior and data flow intact; only extract small presentational structure where needed.

**Tech Stack:** Expo Router, React Native, shared Moonrakers UI primitives, focused Node source-guard tests, TypeScript

---

### Task 1: Add the shared guard rails for CTA hierarchy and analytics controls

**Files:**
- Create: `scripts/action-button-hierarchy.test.cjs`
- Create: `scripts/analytics-control-rail.test.cjs`
- Modify: `scripts/run-focused-suite.cjs`

- [ ] **Step 1: Write the failing CTA hierarchy guard**
- [ ] **Step 2: Run `node .\scripts\action-button-hierarchy.test.cjs` and verify it fails because the new hierarchy markers are missing**
- [ ] **Step 3: Write the failing analytics control rail guard**
- [ ] **Step 4: Run `node .\scripts\analytics-control-rail.test.cjs` and verify it fails because the shared rail is not wired into the target screens**

### Task 2: Build the shared presentation foundation

**Files:**
- Create: `components/analytics/AnalyticsControlRail.tsx`
- Modify: `components/ui/ActionButton.tsx`
- Modify: `components/players/PlayerSearchPicker.tsx`

- [ ] **Step 1: Implement the shared analytics control rail with reusable tabs, optional search, and optional compact actions**
- [ ] **Step 2: Upgrade `ActionButton` so primary, secondary, ghost, and danger variants have clearer visual ranking**
- [ ] **Step 3: Make any tiny `PlayerSearchPicker` adjustments needed so the shared rail can reuse the existing search/result pattern cleanly**
- [ ] **Step 4: Run `node .\scripts\action-button-hierarchy.test.cjs` and verify it passes**

### Task 3: Retrofit the analytics and compare surfaces onto the shared system

**Files:**
- Modify: `app/stats.tsx`
- Modify: `app/insights.tsx`
- Modify: `app/player-profile/[playerId].tsx`
- Modify: `app/charts/compare/index.tsx`

- [ ] **Step 1: Replace the route-local analytics tab/search rails in `stats`, `insights`, and player profile with `AnalyticsControlRail`**
- [ ] **Step 2: Move the compare route onto the shared shell rhythm and reuse the same control language for its top controls**
- [ ] **Step 3: Run `node .\scripts\analytics-control-rail.test.cjs` and verify it passes**

### Task 4: Add the outlier visual-system regression guard

**Files:**
- Create: `scripts/visual-system-outliers.test.cjs`

- [ ] **Step 1: Write the failing outlier guard for `app/game.tsx`, `components/ColorPlayerCard.tsx`, and `app/charts/compare/index.tsx`**
- [ ] **Step 2: Run `node .\scripts\visual-system-outliers.test.cjs` and verify it fails for the expected missing shared-shell markers**

### Task 5: Retrofit the remaining outliers without behavior drift

**Files:**
- Modify: `components/ColorPlayerCard.tsx`
- Modify: `app/game.tsx`
- Modify: `scripts/game-flow-shell-upgrades.test.cjs`

- [ ] **Step 1: Remove the older standalone backdrop treatment from `ColorPlayerCard` and align it with the shared surface language**
- [ ] **Step 2: Replace the live game route’s older backdrop treatment with the shared visual-system language and keep all gameplay behavior intact**
- [ ] **Step 3: Extend the existing shared-shell guard coverage where it helps capture the new route/component markers**
- [ ] **Step 4: Run `node .\scripts\visual-system-outliers.test.cjs` and verify it passes**

### Task 6: Re-verify the focused UI slice

**Files:**
- Test: `scripts/action-button-hierarchy.test.cjs`
- Test: `scripts/analytics-control-rail.test.cjs`
- Test: `scripts/visual-system-outliers.test.cjs`
- Test: `scripts/game-flow-shell-upgrades.test.cjs`
- Test: `scripts/player-directory-visual-system.test.cjs`
- Test: `scripts/chart-setup-primary-cta.test.cjs`
- Test: `scripts/ui-second-pass.test.cjs`
- Test: `scripts/ui-history-home-pass.test.cjs`

- [ ] **Step 1: Run `npm run test:ui`**
- [ ] **Step 2: Run `npx.cmd tsc --noEmit --pretty false --skipLibCheck --incremental false`**
- [ ] **Step 3: Inspect the final diff for spillover outside the planned visual-system scope**
