# Moonrakers UI Style Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh Moonrakers so the app feels graphic-first, uses the new background art intentionally, reduces repeated text, keeps key flows above the fold, and uses icons selectively instead of uniformly.

**Architecture:** Treat this as a shared-shell and screen-density pass rather than a one-off screen polish pass. First upgrade the shared background, header, hero, and tile primitives in `components/ui/`, then restyle the high-traffic routes to consume those primitives, and finally compress the deeper analytics/reference screens so they open on content instead of explanatory text.

**Tech Stack:** Expo Router, React Native, shared UI primitives in `components/ui/`, Zustand-backed route data, TypeScript, Node CommonJS regression scripts.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\ui-style-background-policy.test.cjs`
  - Regression for background preset wiring, selective icon usage contracts, and no-repeat copy markers.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\ui-style-above-the-fold.test.cjs`
  - Source-level regression for compact auth/home/hub layouts and reduced hero copy.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\ScreenBackground.tsx`
  - Add the new background asset mapping and stronger per-preset overlay behavior.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\PageShell.tsx`
  - Add density and scrolling controls so primary screens can lock to above-the-fold layouts.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\AppHeader.tsx`
  - Separate compact utility headers from large hero headers and make subtitles optional by design.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HeroCard.tsx`
  - Support compact, art-led, and text-minimal hero patterns without forcing repeated copy.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HubTileCard.tsx`
  - Make icon rendering optional and shift the card toward title-first, meta-second layouts.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\appHubs.ts`
  - Shorten titles/descriptions so hub tiles can run with less text.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\login.tsx`
  - Compress the auth stack so the primary action stays above the fold.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\register.tsx`
  - Reduce vertical copy load and make the form and appearance chooser feel like one screen.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\reset-password.tsx`
  - Match the compact auth treatment.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
  - Tighten the `Command`, `Data Center`, and `Hubs` tabs with less repeated explanation.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
  - Turn the analytics launcher into a selective-icon surface with shorter copy.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\players.tsx`
  - Turn the players hub into a mixed layout where not every destination is icon-led.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`
  - Reduce scroll depth for roster editing and group creation.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game-setup.tsx`
  - Keep the drag-order focus but reduce framing text and tighten the first viewport.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
  - Open on metrics and controls instead of stacked explanatory blocks.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`
  - Keep the strongest chart/detail language while removing redundant intros.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
  - Compress top copy and promote the graphic/stat content.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\definitions.tsx`
  - Make the glossary feel like a reference tool, not a hero page.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`
  - Reduce top framing and move faster into replay/archive content.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
  - Keep the chart-question positioning but trim the visible explanation.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - Make chart detail open directly on chart state with smaller setup framing.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\compare\index.tsx`
  - Reduce setup verbosity and keep the compare builder more compact.

### Task 1: Lock The Style Rules With Failing Regressions

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\ui-style-background-policy.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\ui-style-above-the-fold.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\ScreenBackground.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HubTileCard.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\app\login.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`

- [ ] **Step 1: Write the background/icon policy regression**

Assert these source-level contracts:
- `ScreenBackground.tsx` imports `Background 2.png`, `Background.png`, `Rings.png`, and `Moonrise.png`.
- `HubTileCard.tsx` exposes an optional icon path instead of requiring `iconKey`.
- `utils/appHubs.ts` descriptions are single-purpose and short enough for 1-2 lines.
- [ ] **Step 2: Write the above-the-fold regression**

Assert these source-level contracts:
- `login.tsx`, `register.tsx`, and `reset-password.tsx` use compact hero/header framing.
- `index.tsx`, `analytics.tsx`, and `players.tsx` do not stack long subtitle plus section subtitle plus card description on first render.
- `PageShell.tsx` exposes a compact or non-scroll mode that primary screens can opt into.
- [ ] **Step 3: Run the regressions and confirm they fail**

Run:
- `node .\scripts\ui-style-background-policy.test.cjs`
- `node .\scripts\ui-style-above-the-fold.test.cjs`

Expected:
- FAIL on missing background policy wiring.
- FAIL on `HubTileCard` still requiring icons.
- FAIL on screens still using verbose top-of-screen framing.

- [ ] **Step 4: Commit the red tests**

```bash
git add scripts/ui-style-background-policy.test.cjs scripts/ui-style-above-the-fold.test.cjs
git commit -m "test: lock moonrakers style refresh contracts"
```

### Task 2: Build The Shared Background And Density System

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\ScreenBackground.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\PageShell.tsx`

- [ ] **Step 1: Map the new art into shared presets**

Implement this asset policy:
- `auth` and one optional `launch` preset use `Background.png`.
- `quiet` and `command` default to `Background 2.png`.
- `analytics` and `database` use `Rings.png`.
- `intel`, `archive`, and `detail` use `Moonrise.png`.

Also strengthen overlays so text blocks remain readable without adding extra copy cards.

- [ ] **Step 2: Add density controls to `PageShell`**

Add props such as:
- `density?: "default" | "compact"`
- `viewport?: "scroll" | "fit"`

`compact` should reduce top and bottom padding.
`fit` should skip scroll on screens that must stay above the fold.

- [ ] **Step 3: Run the background policy regression**

Run:
- `node .\scripts\ui-style-background-policy.test.cjs`

Expected:
- PASS for asset imports and preset mapping.
- FAILs may remain for icon optionality and verbose screen composition.

- [ ] **Step 4: Commit**

```bash
git add components/ui/ScreenBackground.tsx components/ui/PageShell.tsx
git commit -m "feat: add shared moonrakers background and density system"
```

### Task 3: Make Header, Hero, And Hub Tiles Text-Minimal By Default

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\AppHeader.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HeroCard.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\HubTileCard.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\appHubs.ts`

- [ ] **Step 1: Split header behavior into compact and hero modes**

Make `AppHeader` support:
- compact: title, optional tiny eyebrow, actions
- hero: title, optional subtitle, optional emblem

Compact mode should be the default for utility and data screens.

- [ ] **Step 2: Make `HeroCard` optional, not mandatory**

Add support for:
- title-only hero
- stat-led hero
- art-led hero

Do not require subtitle text. If subtitle is absent, the layout should still feel finished.

- [ ] **Step 3: Make `HubTileCard` icon-optional**

Add a boolean or nullable contract so tiles can render as:
- icon + title + tiny meta
- title + tiny meta only

This is the core response to the updated requirement that not every screen needs an icon.

- [ ] **Step 4: Trim hub copy at the source**

Shorten `utils/appHubs.ts` descriptions so they read as labels, not blurbs.
Examples:
- `"Head-to-head and rivalry reads."` -> `"Rivalries"`
- `"Roster and profiles."` -> `"Roster tools"`

- [ ] **Step 5: Run both regressions**

Run:
- `node .\scripts\ui-style-background-policy.test.cjs`
- `node .\scripts\ui-style-above-the-fold.test.cjs`

Expected:
- PASS on background/icon policy.
- Remaining failures should be limited to route-level layout usage.

- [ ] **Step 6: Commit**

```bash
git add components/ui/AppHeader.tsx components/ui/HeroCard.tsx components/ui/HubTileCard.tsx utils/appHubs.ts
git commit -m "feat: make moonrakers ui primitives text-minimal"
```

### Task 4: Compress Auth And Home Into Above-The-Fold Screens

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\login.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\register.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\reset-password.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game-setup.tsx`

- [ ] **Step 1: Tighten auth framing**

Apply:
- compact header or no header
- one short sentence max under the title
- reduced button stack spacing
- register color picker and CTA visible sooner

- [ ] **Step 2: Tighten home framing**

On `index.tsx`:
- keep the segmented home rail
- reduce repeated labels around `Command`, `Data Center`, and `Hubs`
- keep the main action visible without needing the lower dock to explain itself

- [ ] **Step 3: Tighten roster/setup first viewports**

On `add-players.tsx` and `game-setup.tsx`:
- reduce non-essential intro copy
- move active controls higher
- keep the first interactive block visible on load

- [ ] **Step 4: Run the above-the-fold regression**

Run:
- `node .\scripts\ui-style-above-the-fold.test.cjs`

Expected:
- PASS for auth/home compact framing.
- Remaining failures, if any, should be focused on analytics and deep data screens.

- [ ] **Step 5: Commit**

```bash
git add app/login.tsx app/register.tsx app/reset-password.tsx app/index.tsx app/add-players.tsx app/game-setup.tsx
git commit -m "feat: compress auth home and setup screens"
```

### Task 5: Rebuild The Hubs Around Selective Graphics

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\players.tsx`

- [ ] **Step 1: Make `analytics.tsx` graphic-first**

Rules:
- keep icons on high-value destinations like `Compare`, `Charts`, and `ELO`
- allow at least one card to be title-first with no icon
- reduce descriptions to single-line helpers or remove them entirely where the title is clear

- [ ] **Step 2: Make `players.tsx` mixed-layout**

Rules:
- keep profile/card destinations visual
- allow roster/admin surfaces to use text-led tiles
- keep the resume card, but shorten its copy and make it action-first

- [ ] **Step 3: Rebalance tile heights**

Ensure hub tiles do not require long descriptions just to fill vertical space.
Prefer stronger negative space and larger touch areas over explanatory paragraphs.

- [ ] **Step 4: Run the above-the-fold regression**

Run:
- `node .\scripts\ui-style-above-the-fold.test.cjs`

Expected:
- PASS for analytics/players reduced first-screen verbosity.

- [ ] **Step 5: Commit**

```bash
git add app/analytics.tsx app/players.tsx
git commit -m "feat: rebuild moonrakers hubs with selective graphics"
```

### Task 6: Compress Deep Data And Reference Screens

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\elo.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\definitions.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\compare\index.tsx`

- [ ] **Step 1: Remove redundant intros**

On each screen, keep only one of:
- eyebrow
- subtitle
- explanatory section intro

Do not keep all three on the same first viewport.

- [ ] **Step 2: Promote content above framing**

Rules:
- `stats.tsx` opens on metrics and filters
- `elo.tsx` opens on ranking/chart state
- `insights.tsx` opens on signals, not a long textual intro
- `definitions.tsx` opens on search and category chips
- `charts/[chartKey].tsx` opens with chart and setup controls in the same viewport
- `charts/compare/index.tsx` shows selection state without needing to scroll into summary copy

- [ ] **Step 3: Apply `Moonrise` to detail/reference families**

Use the new `detail` or `intel` background preset for:
- profile detail
- definitions
- insights
- history/replay detail where appropriate

- [ ] **Step 4: Run both regressions**

Run:
- `node .\scripts\ui-style-background-policy.test.cjs`
- `node .\scripts\ui-style-above-the-fold.test.cjs`

Expected:
- PASS on shared policy.
- PASS on deep-screen copy compression markers.

- [ ] **Step 5: Commit**

```bash
git add app/stats.tsx app/elo.tsx app/insights.tsx app/definitions.tsx app/history.tsx app/charts/index.tsx app/charts/[chartKey].tsx app/charts/compare/index.tsx
git commit -m "feat: compress moonrakers data and reference screens"
```

### Task 7: Verification Pass On The Device-Facing Screens

**Files:**
- Verify only:
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\login.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\register.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\players.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\game-setup.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`

- [ ] **Step 1: Run the regression scripts**

Run:
- `node .\scripts\ui-style-background-policy.test.cjs`
- `node .\scripts\ui-style-above-the-fold.test.cjs`

Expected:
- PASS

- [ ] **Step 2: Run TypeScript if the worker touched signatures**

Run:
- `node .\node_modules\typescript\bin\tsc --noEmit`

Expected:
- Either PASS, or only pre-existing unrelated failures outside the touched screens. Record any residual noise explicitly.

- [ ] **Step 3: Capture device screenshots for the primary flows**

Re-capture:
- login
- register
- home command
- analytics hub
- players hub
- game setup
- one chart detail

Expected:
- primary action visible on first viewport
- background art readable behind overlays
- no screen relying on repeated subtitles to explain itself

- [ ] **Step 4: Commit the verification-safe polish**

```bash
git add .
git commit -m "chore: verify moonrakers style refresh"
```

## Self-Review

- Spec coverage: This plan covers the shared shell, selective icon rule, background asset strategy, above-the-fold auth/home/setup work, hub simplification, and deep analytics/reference compression.
- Placeholder scan: No `TODO`, `TBD`, or vague “polish later” instructions remain.
- Type consistency: Shared-shell work is centralized around `ScreenBackground`, `PageShell`, `AppHeader`, `HeroCard`, and `HubTileCard`, then consumed by the route files listed above.

## Execution Handoff

Plan complete and saved to `C:\Users\izzyh\Desktop\moonrakers-app\docs\superpowers\plans\2026-04-26-moonrakers-ui-style-refresh-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
