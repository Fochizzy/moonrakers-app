# Moonrakers Assist Context Correlations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add assist-context metrics to the Moonrakers player profile and add victory correlations for those metrics to the server-authored Insights macro feed.

**Architecture:** Build one shared pure helper in `utils/assistContextMetrics.ts` that reconstructs pre-assist prestige state from round logs. Reuse that helper locally in `utils/playerProfileMoonrakers.ts` plus `components/player/MoonrakersIntelSection.tsx`, then patch `public.get_insights_screen(...)` in a follow-up migration so the Insights route keeps rendering server-authored macro rows.

**Tech Stack:** TypeScript utilities, React Native profile UI, Supabase SQL migrations, and focused CommonJS/TypeScript regression scripts in `scripts/`.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\assistContextMetrics.ts`
  - Pure helper for reconstructing assist events and per-player-per-game assist-context samples.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-context-metrics.test.cjs`
  - Red/green coverage for assist event reconstruction and per-game rollups.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playerProfileMoonrakers.ts`
  - Add `Assist Context` view-model data derived from the shared helper.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\player\MoonrakersIntelSection.tsx`
  - Render the new `Assist Context` cards.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`
  - Lock the new profile metrics and section labels.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260525013000_moonrakers_insights_assist_context_correlations.sql`
  - Patch `public.get_insights_screen(...)` with the three new victory correlations.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\insights-correlation-sections-migration.test.cjs`
  - Assert the follow-up migration emits the assist-context correlation rows.

### Task 1: Shared Assist Context Helper

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-context-metrics.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\assistContextMetrics.ts`

- [ ] Write the failing assist-context helper test.
- [ ] Run `node .\scripts\assist-context-metrics.test.cjs` and confirm it fails because the helper does not exist yet.
- [ ] Implement the minimal shared helper.
- [ ] Run `node .\scripts\assist-context-metrics.test.cjs` and confirm it passes.

### Task 2: Player Profile Assist Context Section

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\playerProfileMoonrakers.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\player\MoonrakersIntelSection.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-moonrakers.test.cjs`

- [ ] Extend the profile regression with failing expectations for the new section and values.
- [ ] Run `node .\scripts\player-profile-moonrakers.test.cjs` and confirm it fails for the new expectations.
- [ ] Add the new profile data model and UI cards using the shared helper output.
- [ ] Run `node .\scripts\player-profile-moonrakers.test.cjs` and confirm it passes.

### Task 3: Server-Authored Insights Victory Correlations

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260525013000_moonrakers_insights_assist_context_correlations.sql`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\insights-correlation-sections-migration.test.cjs`

- [ ] Extend the migration regression with failing expectations for the three assist-context correlation labels.
- [ ] Run `node .\scripts\insights-correlation-sections-migration.test.cjs` and confirm it fails.
- [ ] Patch `get_insights_screen(...)` in a new migration so the macro payload includes the three new rows.
- [ ] Run `node .\scripts\insights-correlation-sections-migration.test.cjs` and confirm it passes.

### Task 4: Focused Verification

**Files:**
- Verify only

- [ ] Run `node .\scripts\assist-context-metrics.test.cjs`
- [ ] Run `node .\scripts\player-profile-moonrakers.test.cjs`
- [ ] Run `node .\scripts\insights-correlation-sections-migration.test.cjs`
- [ ] Review the touched diff for only the intended assist-context profile and insights changes.

## Self-Review

- The plan covers the shared helper, the local profile surface, the server-authored Insights surface, and focused verification.
- There are no placeholder `TODO` or `TBD` steps.
- The shared helper is the single metric-definition seam across both local and server-facing work.
