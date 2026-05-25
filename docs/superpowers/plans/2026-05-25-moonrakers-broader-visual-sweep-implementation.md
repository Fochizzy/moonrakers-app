# Moonrakers Broader Visual Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the remaining `game-trends` analytics outlier onto the shared Moonrakers analytics visual system.

**Architecture:** Keep all existing trend computation in `app/game-trends.tsx`, but replace the route-local backdrop and card primitives with `PageShell`, `HeroCard`, shared `SectionCard`, and canonical route helpers. Verify the change with a focused source guard plus existing type checks.

**Tech Stack:** Expo Router, React Native, shared Moonrakers UI primitives, focused Node source-guard tests

---

### Task 1: Add the visual-system regression guard

**Files:**
- Create: `scripts/game-trends-visual-system.test.cjs`
- Test: `scripts/game-trends-visual-system.test.cjs`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Rewrite `app/game-trends.tsx` onto shared shell primitives**
- [ ] **Step 4: Run the focused test to verify it passes**

### Task 2: Re-verify the analytics polish slice

**Files:**
- Modify: `app/game-trends.tsx`
- Test: `scripts/analytics-shared-state-shell.test.cjs`
- Test: `scripts/analytics-provenance-fallback.test.cjs`
- Test: `scripts/playstyle-spotlight-definitions.test.cjs`
- Test: `scripts/game-trends-visual-system.test.cjs`

- [ ] **Step 1: Run the full focused analytics-polish test set**
- [ ] **Step 2: Run `npx.cmd tsc --noEmit --pretty false --skipLibCheck`**
- [ ] **Step 3: Inspect the final diff for unintended spillover**
