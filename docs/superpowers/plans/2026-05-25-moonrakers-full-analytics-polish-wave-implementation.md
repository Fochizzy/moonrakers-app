# Moonrakers Full Analytics Polish Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize analytics state presentation, surface data provenance clearly, and spotlight playstyle/definitions across the Moonrakers analytics experience.

**Architecture:** Add a shared analytics-state presentation layer in `components/analytics`, upgrade the recovery card to carry provenance and glossary affordances, then migrate the major analytics routes onto the shared shell. Finish with a playstyle/definitions pass and a visual-system cleanup for `app/game-trends.tsx`.

**Tech Stack:** Expo Router, React Native, TypeScript, focused Node source-guard tests

---

### Task 1: Add regression guards first

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-shared-state-shell.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-provenance-fallback.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\playstyle-spotlight-definitions.test.cjs`

- [ ] Write failing source-guard tests for the shared analytics shell, provenance states, and playstyle definitions links.
- [ ] Run the three tests and confirm they fail for the expected missing-adoption reasons.

### Task 2: Build shared analytics-state components

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsSourceBadge.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsStateSection.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsRecoveryCard.tsx`

- [ ] Add the provenance badge component.
- [ ] Add the reusable state-shell section component.
- [ ] Upgrade the recovery card to support provenance, tone, and optional glossary links.

### Task 3: Adopt the shared state shell on analytics routes

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\home\HomeLeaderboardTab.tsx`

- [ ] Replace route-local loading/error/empty card logic with the shared analytics-state shell.
- [ ] Keep existing route-specific recovery actions, but render them through the upgraded recovery card.

### Task 4: Make chart fallback provenance explicit

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`

- [ ] Replace plain fallback copy with the stronger provenance-aware recovery card.
- [ ] Distinguish published server data from Supabase-history fallback and device-history fallback in visible UI copy.

### Task 5: Promote playstyle and glossary affordances

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\player\MoonrakersIntelSection.tsx`

- [ ] Turn the stats playstyle tab into a spotlight section with clearer lead framing and stronger glossary hooks.
- [ ] Add real glossary jumps to Moonrakers Intel playstyle and condition metrics.

### Task 6: Normalize the remaining visual outlier

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game-trends.tsx`

- [ ] Move the game-trends route onto the shared shell/card language without changing its underlying trend content.

### Task 7: Verify the wave

**Files:**
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-shared-state-shell.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-provenance-fallback.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\playstyle-spotlight-definitions.test.cjs`

- [ ] Run the new source-guard tests.
- [ ] Re-run the existing analytics migration/source-truth tests that overlap this surface.
- [ ] Run focused TypeScript diagnostics against the touched analytics component and route files.
