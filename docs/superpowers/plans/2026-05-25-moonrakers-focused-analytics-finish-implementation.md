# Moonrakers Focused Analytics Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Home leaderboard tab and the ELO screen onto a dedicated server-authored Supabase ELO payload while preserving the existing richer ELO breakdown UI.

**Architecture:** Add a dedicated `get_elo_screen(...)` Supabase RPC plus a small client wrapper, then rewire `app/index.tsx` and `app/elo.tsx` to consume that payload instead of computing ELO locally. Keep UI state and rendering local, but move leaderboard ordering, summary metrics, context splits, and headline insight data to the server contract.

**Tech Stack:** Supabase Postgres RPCs, Expo Router, React Native, TypeScript, Zustand, Node/CommonJS source guards.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-migration.test.cjs`
  - Guards that the new migration defines the ELO screen RPC.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-wrapper-contract.test.cjs`
  - Guards the wrapper source and RPC argument forwarding contract.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-no-local-derivation.test.cjs`
  - Guards that Home and ELO stop using local ELO derivation.
- Use canonical migration: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260525074716_moonrakers_focused_elo_screen_contract.sql`
  - Adds the dedicated public ELO screen RPC and helper logic.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`
  - Adds the ELO screen params and payload types.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getEloScreen.ts`
  - Wrapper for `get_elo_screen`.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
  - Replaces local inline leaderboard analytics with the server-authored ELO payload.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`
  - Replaces local ELO analytics derivation with the server-authored ELO payload.

### Task 1: Lock The Focused Finish Boundary With Failing Tests

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-migration.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-wrapper-contract.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-no-local-derivation.test.cjs`

- [ ] **Step 1: Write the failing migration guard**

Assert that `supabase/migrations/20260525074716_moonrakers_focused_elo_screen_contract.sql` exists and defines:

- `create or replace function public.get_elo_screen`
- `grant execute on function public.get_elo_screen`

- [ ] **Step 2: Run the migration guard and verify it fails**

Run: `node scripts/elo-screen-migration.test.cjs`
Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the failing wrapper contract guard**

Assert that `lib/cloud/analytics/getEloScreen.ts` calls `get_elo_screen` and forwards:

- `profile_id`
- `focus_player_id`
- `opponent_id`
- `sort_key`

- [ ] **Step 4: Run the wrapper guard and verify it fails**

Run: `node scripts/elo-screen-wrapper-contract.test.cjs`
Expected: FAIL because the wrapper file does not exist yet.

- [ ] **Step 5: Write the failing no-local-derivation guard**

Assert that:

- `app/elo.tsx` does not import `@/utils/elo`
- `app/index.tsx` does not call `calculateElo(`
- both files import `lib/cloud/analytics/getEloScreen`

- [ ] **Step 6: Run the source guard and verify it fails**

Run: `node scripts/elo-screen-no-local-derivation.test.cjs`
Expected: FAIL because Home and ELO still derive locally.

### Task 2: Add The Dedicated Server-Authored ELO Contract

**Files:**
- Use canonical migration: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260525074716_moonrakers_focused_elo_screen_contract.sql`

- [ ] **Step 1: Add the new migration with a dedicated public RPC**

Create `public.get_elo_screen(profile_id uuid default auth.uid(), focus_player_id uuid default null, opponent_id uuid default null, sort_key text default 'elo')`.

- [ ] **Step 2: Compute the server-authored payload**

Use canonical saved data to build:

- sorted leaderboard rows
- selected player summary
- top cards
- per-tab section cards
- active insight strings

- [ ] **Step 3: Grant execute access**

Grant authenticated execute permission on the new public RPC.

- [ ] **Step 4: Re-run the migration guard**

Run: `node scripts/elo-screen-migration.test.cjs`
Expected: PASS.

### Task 3: Add The Client Wrapper And Shared Types

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getEloScreen.ts`

- [ ] **Step 1: Extend the analytics types**

Add:

- `EloScreenParams`
- `EloLeaderboardRow`
- `EloSummary`
- `EloMetricCard`
- `EloSectionPayload`
- `EloInsightPayload`
- `EloScreenPayload`

- [ ] **Step 2: Add the wrapper**

Create `getEloScreen.ts` using the same wrapper pattern as the other analytics readers and forward `profile_id`, `focus_player_id`, `opponent_id`, and `sort_key`.

- [ ] **Step 3: Re-run the wrapper guard**

Run: `node scripts/elo-screen-wrapper-contract.test.cjs`
Expected: PASS.

### Task 4: Rewire The Home Leaderboard

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`

- [ ] **Step 1: Replace the local leaderboard calculation path**

Remove the `calculateElo(...)` dependency from `HomeLeaderboardTab` and load the ELO payload with:

- current signed-in profile id
- no opponent filter
- current sort key

- [ ] **Step 2: Preserve the existing Home UI**

Keep the sort toggles, card art, rank badge, empty state copy, and row layout, but render rows from `leaderboardRows`.

- [ ] **Step 3: Keep failure handling lightweight**

If the RPC fails, show the existing empty-state style rather than crashing the tab.

### Task 5: Rewire The Full ELO Screen

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`

- [ ] **Step 1: Replace local ELO derivation state**

Remove the local `calculateElo(...)`, `rowsByPlayer`, `buildSummary`, `buildTopCards`, and section-card derivation path from live rendering.

- [ ] **Step 2: Fetch the server-authored payload**

Call `getEloScreen(...)` with:

- signed-in profile id
- selected player id
- selected opponent id
- current Home/ELO sort key when relevant

- [ ] **Step 3: Preserve the current rich screen behavior**

Keep:

- search filtering
- player selection
- opponent context filtering
- tab switching
- leaderboard rail
- definitions links

but drive the metrics from payload fields instead of client analytics math.

- [ ] **Step 4: Re-run the source guard**

Run: `node scripts/elo-screen-no-local-derivation.test.cjs`
Expected: PASS.

### Task 6: Verification

**Files:**
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-migration.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-wrapper-contract.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\elo-screen-no-local-derivation.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-screen-local-diagnostics.test.cjs`

- [ ] **Step 1: Run focused finish guards**

Run:

- `node scripts/elo-screen-migration.test.cjs`
- `node scripts/elo-screen-wrapper-contract.test.cjs`
- `node scripts/elo-screen-no-local-derivation.test.cjs`

Expected: all PASS.

- [ ] **Step 2: Run the Home diagnostics smoke check**

Run: `node scripts/home-screen-local-diagnostics.test.cjs`
Expected: PASS.

- [ ] **Step 3: Report exact verification status**

Summarize which commands passed, and call out any remaining unverified or unrelated repo noise explicitly.
