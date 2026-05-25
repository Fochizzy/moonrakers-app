# Moonrakers Broad Polish Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify older game/player surfaces around the shared shell, centralize player-card ELO fallback logic, remove stale local traps, and add top-level verification scripts.

**Architecture:** The batch upgrades route shells where the frame can change safely, keeps route-specific inner behavior intact, and introduces a single player-card ELO helper so fallback rating logic no longer lives in multiple UI files. Cleanup and verification changes stay small and evidence-backed.

**Tech Stack:** Expo Router, React Native, TypeScript, focused Node-based source-guard scripts

---

### Task 1: Add failing guards for the broad polish batch

**Files:**
- Create: `scripts/game-flow-shell-upgrades.test.cjs`
- Create: `scripts/player-card-elo-helper.test.cjs`
- Create: `scripts/package-verification-scripts.test.cjs`
- Create: `scripts/legacy-cleanup-guards.test.cjs`

- [ ] Write source guards that fail until the target routes use the shared shell and the direct player-card `calculateElo(...)` imports are gone.
- [ ] Run each script directly with `node`.
- [ ] Confirm the failures point at the intended missing work.

### Task 2: Centralize player-card ELO fallback logic

**Files:**
- Create: `utils/playerCardElo.ts`
- Modify: `app/player-cards.tsx`
- Modify: `components/ColorPlayerCard.tsx`

- [ ] Add one helper module that resolves fallback ELO maps for player-card surfaces.
- [ ] Rewire `app/player-cards.tsx` to consume the helper instead of importing `@/utils/elo`.
- [ ] Rewire `components/ColorPlayerCard.tsx` to consume the same helper.
- [ ] Re-run the dedicated ELO-helper guard.

### Task 3: Upgrade older player/game routes to the shared shell

**Files:**
- Modify: `app/add-players.tsx`
- Modify: `app/player-cards.tsx`
- Modify: `app/summary.tsx`
- Modify: `app/player-profile/[playerId].tsx`

- [ ] Move the outer route frames onto `PageShell` where safe.
- [ ] Use `HeroCard` / `SectionCard` for route-level framing without disturbing route-specific inner logic.
- [ ] Preserve search, sticky, and management behavior on each route.
- [ ] Re-run the shared-shell source guard.

### Task 4: Push definitions and small helper extractions

**Files:**
- Modify: `app/player-cards.tsx`
- Modify: `app/summary.tsx`
- Create or modify small route-local helper modules only where they clearly reduce screen bloat

- [ ] Add targeted `DefinitionsJumpLink` affordances to the player-card and summary surfaces.
- [ ] Extract only the smallest route-local helpers needed to keep touched files from growing further.

### Task 5: Clean up stale files and add verification entrypoints

**Files:**
- Delete: `app/PlayerProfileScreen.tsx`
- Delete: `utils/number.ts`
- Modify: `package.json`
- Create: `scripts/run-focused-suite.cjs`

- [ ] Verify the stale profile stub and duplicate number helper are unused, then remove them.
- [ ] Add top-level `lint`, `typecheck`, `test:analytics`, and `test:ui` scripts.
- [ ] Use a small runner script if needed to keep the package scripts readable.
- [ ] Re-run the cleanup/script guards.

### Task 6: Verify the finished batch

**Files:**
- Verify touched routes and scripts

- [ ] Run the new broad-batch source guards.
- [ ] Run the existing analytics/shared-state/playstyle guards.
- [ ] Run `npx.cmd tsc --noEmit --pretty false --skipLibCheck --incremental false`.
- [ ] Report honestly whether the batch is code-verified only or also runtime-validated.
