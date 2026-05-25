# Moonrakers Foundation And Data Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved foundation pass across gameplay/session architecture, shared app status, history/data-management, chart provenance, chart/card system extraction, and a critical-path smoke harness.

**Architecture:** Add small controller/view-model seams around the largest routes instead of rewriting the app wholesale. Use pure helper modules plus narrow source guards so gameplay, history, charts, and status flows become easier to verify without breaking the current Moonrakers interaction model.

**Tech Stack:** Expo Router, React Native, TypeScript, Zustand, Supabase-backed helpers, Node/CommonJS source-guard scripts.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-session-controller.test.ts`
  - Pure and source-level guard for the new gameplay/session controller seam.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-app-status.test.ts`
  - Guards the shared status model transitions and payload shape.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\history-data-manager.test.cjs`
  - Guards that `app/history.tsx` delegates cloud refresh/import/delete orchestration to a shared controller hook.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-detail-provenance.test.ts`
  - Guards the provenance model for server, stale, Supabase fallback, and device fallback states.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-surface-system.test.cjs`
  - Guards shared chart/card surface extraction usage.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\critical-path-smoke.test.cjs`
  - Guards the presence of the new cross-surface smoke harness and its route coverage.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\app-status\types.ts`
  - Shared operational status types and builders.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\app-status\store.ts`
  - Lightweight global status store and publishing helpers.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\status\AppStatusBanner.tsx`
  - Shared UI for rendering current operational status in gameplay and history flows.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-session\gameSessionController.ts`
  - Pure gameplay/session helpers for candidate rounds, save validation, and finish-game preparation.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-session\useGameSessionController.ts`
  - Hook wrapper for the game route’s mutation and save orchestration.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\history\useHistoryDataManager.ts`
  - Controller hook for cloud refresh, import, and delete orchestration.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\charts\chartDetailProvenance.ts`
  - Pure route-level provenance model for chart detail pages.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ChartSurface.tsx`
  - Shared chart/card shell wrapper.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ChartMetricChip.tsx`
  - Shared metric-chip primitive.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ChartInsightStrip.tsx`
  - Shared chart insight/status strip.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\chartSurfaceTokens.ts`
  - Shared visual tokens for chart/card surfaces.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game.tsx`
  - Delegate session/save orchestration to the new controller hook and render shared status.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`
  - Delegate import/delete/refresh orchestration to the new history controller and render shared status.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - Use the shared provenance model and shared chart surface primitives.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\compare\index.tsx`
  - Adopt the extracted chart/card surface primitives.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\compare\ConditionalComparisonCard.tsx`
  - Adopt the extracted chart/card surface primitives where appropriate.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\package.json`
  - Add the critical-path smoke entrypoint.

## Task 1: Lock The New Seams With Failing Tests

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-session-controller.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-app-status.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\history-data-manager.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-detail-provenance.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-surface-system.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\critical-path-smoke.test.cjs`

- [ ] Step 1: Write the failing gameplay/session controller test.
- [ ] Step 2: Run `node .\scripts\game-session-controller.test.ts` and verify it fails.
- [ ] Step 3: Write the failing shared app-status test.
- [ ] Step 4: Run `node .\scripts\shared-app-status.test.ts` and verify it fails.
- [ ] Step 5: Write the failing history data-manager source guard.
- [ ] Step 6: Run `node .\scripts\history-data-manager.test.cjs` and verify it fails.
- [ ] Step 7: Write the failing chart provenance test.
- [ ] Step 8: Run `node .\scripts\chart-detail-provenance.test.ts` and verify it fails.
- [ ] Step 9: Write the failing chart surface system guard.
- [ ] Step 10: Run `node .\scripts\chart-surface-system.test.cjs` and verify it fails.
- [ ] Step 11: Write the failing critical-path smoke guard.
- [ ] Step 12: Run `node .\scripts\critical-path-smoke.test.cjs` and verify it fails.

## Task 2: Add The Shared App-Status Layer

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\app-status\types.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\app-status\store.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\status\AppStatusBanner.tsx`

- [ ] Step 1: Implement shared app-status types and builders.
- [ ] Step 2: Implement the lightweight global app-status store with publish/clear helpers.
- [ ] Step 3: Implement the shared banner component for rendering the current status.
- [ ] Step 4: Run `node .\scripts\shared-app-status.test.ts` and verify it passes.

## Task 3: Add The Gameplay Session Controller Boundary

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-session\gameSessionController.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-session\useGameSessionController.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game.tsx`

- [ ] Step 1: Implement pure helpers for candidate rounds, edit rounds, and finish-game preparation.
- [ ] Step 2: Implement the hook wrapper for active-game mutation and finish-game orchestration.
- [ ] Step 3: Rewire `app/game.tsx` to use the controller hook and shared status banner.
- [ ] Step 4: Run `node .\scripts\game-session-controller.test.ts` and verify it passes.

## Task 4: Add The History Data Manager

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\history\useHistoryDataManager.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`

- [ ] Step 1: Implement the history controller for cloud refresh, backup import, and game deletion.
- [ ] Step 2: Publish operational status updates through the shared app-status layer.
- [ ] Step 3: Rewire `app/history.tsx` to use the controller hook and shared status banner.
- [ ] Step 4: Run `node .\scripts\history-data-manager.test.cjs` and verify it passes.

## Task 5: Add The Chart Provenance Model

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\charts\chartDetailProvenance.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`

- [ ] Step 1: Implement the pure provenance model for server, server-stale, Supabase fallback, and device fallback.
- [ ] Step 2: Rewire the chart detail route to derive source labels and captions from that model.
- [ ] Step 3: Run `node .\scripts\chart-detail-provenance.test.ts` and verify it passes.

## Task 6: Extract The Chart/Card Surface System

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ChartSurface.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ChartMetricChip.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\ChartInsightStrip.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\chartSurfaceTokens.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\compare\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\compare\ConditionalComparisonCard.tsx`

- [ ] Step 1: Extract the shared chart surface tokens and shell primitives.
- [ ] Step 2: Rewire the chart detail and compare surfaces to use the new primitives where they currently duplicate shell styling.
- [ ] Step 3: Run `node .\scripts\chart-surface-system.test.cjs` and verify it passes.

## Task 7: Add The Critical-Path Smoke Harness

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\critical-path-smoke.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\package.json`

- [ ] Step 1: Add the cross-surface smoke script that guards bootstrap, add-players, setup, save, history, profile, and charts coverage.
- [ ] Step 2: Add the package script entrypoint for the smoke harness.
- [ ] Step 3: Run `node .\scripts\critical-path-smoke.test.cjs` and verify it passes.

## Task 8: Verification

**Files:**
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-session-controller.test.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-app-status.test.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\history-data-manager.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-detail-provenance.test.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-surface-system.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\critical-path-smoke.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-live-loader-usage.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\layout-bootstrap-extraction.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-no-local-derivation.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-focus-player-selector.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-scope-player-selector.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-command-player-search.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-setup-control-system.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\stats-primary-tab-rail.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\insights-section-tabs.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-flow-shell-upgrades.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\package-verification-scripts.test.cjs`

- [ ] Step 1: Run the new seam tests and verify they pass.
- [ ] Step 2: Run the affected existing regression guards and verify they pass.
- [ ] Step 3: Run `& 'C:\Program Files\nodejs\npm.cmd' run typecheck` and report the exact result.
