# Moonrakers Live Analytics And Profile Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the broad analytics migration by adding a server-authored full player profile contract, a shared live analytics loader with stale-payload handling, a reusable player picker surface, and smaller bootstrap/profile seams.

**Architecture:** Add a dedicated `get_player_profile_screen` analytics RPC and a shared `useLiveAnalyticsQuery` hook that all analytics-family routes can use for strict refocus refresh plus last-success stale rendering. Extract bootstrap hydration from `app/_layout.tsx`, extract reusable player picker UI from repeated route code, and move player-profile route logic onto the server-authored payload while preserving the current tabs, cards, Intel sections, and recent-games surface.

**Tech Stack:** Supabase Postgres RPCs, Expo Router, React Native, TypeScript, Zustand, Node/CommonJS source guards.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\live-analytics-query.test.ts`
  - Guards the shared live analytics loader state transitions, including stale payload retention after a failed refresh.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-supabase-contract.test.ts`
  - Guards the new profile-screen wrapper and RPC argument forwarding.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-no-local-derivation.test.cjs`
  - Guards that the player-profile route stops deriving analytics locally.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-live-loader-usage.test.cjs`
  - Guards that the analytics-family routes use the shared live loader instead of bespoke `loading/error/payload` effects.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\layout-bootstrap-extraction.test.cjs`
  - Guards that `app/_layout.tsx` delegates bootstrap hydration work to shared helpers/hooks.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523120000_moonrakers_server_authored_analytics_contracts.sql`
  - Extend the analytics contract surface with a new full player-profile payload and any private helpers it needs.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`
  - Add player-profile params/payload types plus the live query state types.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getPlayerProfileScreen.ts`
  - Wrapper for `get_player_profile_screen`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\createLiveAnalyticsQuery.ts`
  - Pure state machine for strict live refresh plus stale payload retention.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\useLiveAnalyticsQuery.ts`
  - Shared hook for analytics-family route reads.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsStaleBadge.tsx`
  - Visible stale-state affordance rendered when a route is showing last-success payload after a failed refresh.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\players\PlayerSearchPicker.tsx`
  - Shared player search/selection surface for analytics-family screens.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\auth\bootstrapSharedCloudState.ts`
  - Shared bootstrap loader for auth profile, cloud snapshot, and stats snapshot hydration.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\auth\useSharedCloudBootstrap.ts`
  - Hook wrapper for layout bootstrap and realtime refresh orchestration.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player-profile\PlayerProfileHero.tsx`
  - Extracted hero/quick-actions rendering for the profile route.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player-profile\PlayerProfileMetricTabs.tsx`
  - Extracted metric-tab rail and summary card surface.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player-profile\PlayerProfileRecentGames.tsx`
  - Extracted recent-games block.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\_layout.tsx`
  - Switch to bootstrap helpers/hooks instead of inline orchestration.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - Rewire analytics-family routes onto the shared live loader and stale affordance.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`
  - Rewire to the new server-authored profile payload and extracted UI sections.

## Task 1: Lock The Shared Live Loader Boundary With Failing Tests

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\live-analytics-query.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-live-loader-usage.test.cjs`

- [ ] Write the failing pure loader-state test.
- [ ] Run it and verify it fails.
- [ ] Write the failing route-usage guard.
- [ ] Run it and verify it fails.

## Task 2: Add The Shared Live Loader

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\createLiveAnalyticsQuery.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\useLiveAnalyticsQuery.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsStaleBadge.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`

- [ ] Implement the pure state machine for initial load, success, refresh, stale failure, and empty failure.
- [ ] Implement the shared hook around `useAnalyticsRefreshTick`.
- [ ] Add the shared stale badge UI.
- [ ] Re-run the shared loader tests and verify they pass.

## Task 3: Add The Server-Authored Player Profile Contract

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-supabase-contract.test.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523120000_moonrakers_server_authored_analytics_contracts.sql`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getPlayerProfileScreen.ts`

- [ ] Write the failing wrapper-contract test.
- [ ] Run it and verify it fails.
- [ ] Extend the SQL analytics contract with a full player-profile payload that preserves the current cards/tabs/intel sections.
- [ ] Add the client wrapper and profile payload types.
- [ ] Re-run the wrapper-contract test and verify it passes.

## Task 4: Rewire The Player Profile Route And Break It Into Smaller Sections

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-no-local-derivation.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player-profile\PlayerProfileHero.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player-profile\PlayerProfileMetricTabs.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\player-profile\PlayerProfileRecentGames.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`

- [ ] Write the failing no-local-derivation guard.
- [ ] Run it and verify it fails.
- [ ] Replace local analytics derivation with the new profile payload.
- [ ] Extract the hero, tab shell, and recent-games sections into smaller files.
- [ ] Re-run the no-local-derivation guard and verify it passes.

## Task 5: Unify Player Search And Scope Picking

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\players\PlayerSearchPicker.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`

- [ ] Extract the common player-search UI into a shared picker.
- [ ] Rewire the affected screens to use it.
- [ ] Preserve the current labels, filtering rules, and route-specific selection behavior.

## Task 6: Split Layout Bootstrap Hydration Out Of The App Shell

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\layout-bootstrap-extraction.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\auth\bootstrapSharedCloudState.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\auth\useSharedCloudBootstrap.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\_layout.tsx`

- [ ] Write the failing layout extraction guard.
- [ ] Run it and verify it fails.
- [ ] Move bootstrap hydration and realtime-refresh orchestration into shared auth/bootstrap helpers.
- [ ] Re-run the layout extraction guard and verify it passes.

## Task 7: Rewire Analytics-Family Routes Onto The Shared Loader

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`

- [ ] Replace bespoke route fetch effects with `useLiveAnalyticsQuery`.
- [ ] Render stale state visibly when a refresh fails after a successful payload.
- [ ] Preserve strict refocus refresh behavior and current recovery flows.

## Task 8: Verification

**Files:**
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\live-analytics-query.test.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-supabase-contract.test.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-screen-no-local-derivation.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-live-loader-usage.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\layout-bootstrap-extraction.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\stats-primary-tab-rail.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\insights-section-tabs.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-setup-control-system.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-command-player-search.test.cjs`

- [ ] Run the new guard tests and verify they pass.
- [ ] Run the affected existing regression tests and verify they pass.
- [ ] Run `npm run typecheck` and report the exact result.
