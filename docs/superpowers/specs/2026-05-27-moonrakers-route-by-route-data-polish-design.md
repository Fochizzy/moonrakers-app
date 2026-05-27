# Moonrakers Route-by-Route Data Polish Design

Date: 2026-05-27

## Summary

This design defines a focused UI polish batch for Moonrakers that improves five connected areas without changing the app's route map or core behavior:

1. rename the Hubs bridge and analytics landing language from `Analytics` to `Data`,
2. add a more compact launcher-card variant for dense hub surfaces,
3. turn the Players hub into a lightweight preview surface centered on the signed-in player,
4. standardize analytics controls around the same rail language while preserving route-specific layouts,
5. apply stronger staged disclosure to Charts and Game Setup while keeping both screens single-screen flows.

The intended result is a clearer, more intentional app that still feels like the current Moonrakers visual system rather than a redesign.

## Goals

- Use `Data` as the visible umbrella label for the analytics destination bridge and landing screen.
- Add a compact `HubTileCard` presentation that works better for denser launcher grids such as the Players hub.
- Make `app/players.tsx` feel active by surfacing a signed-in-player preview instead of acting as a pure launcher page.
- Keep `AnalyticsControlRail` as the shared analytics control primitive while letting each route keep its own composition and density.
- Make `app/charts/index.tsx` and `app/game-setup.tsx` easier to read by revealing complexity in a clearer order instead of giving every control equal weight immediately.
- Preserve existing routes, selection rules, analytics contracts, and Supabase source-of-truth behavior.

## Non-Goals

- No information architecture rewrite.
- No new top-level routes or tab structure.
- No new player-focus state on the Players hub beyond the existing signed-in player identity.
- No change to analytics payload meaning or server contracts.
- No wizard or multi-screen conversion for Charts or Game Setup.
- No forced one-layout-fits-all shell across Stats, Insights, and Player Profile.
- No broad visual sweep outside the selected routes and shared components.

## Current State

### Data naming and hub language

The visible analytics terminology is split:

- the Hubs bridge metadata in `utils/appHubs.ts` uses the route key `analytics` and the title `Data`,
- the landing route in `app/analytics.tsx` still brands the page as `Analytics`,
- downstream routes such as `app/stats.tsx` and `app/insights.tsx` use analytics-specific naming in their headers and copy.

This makes the top-level journey feel less deliberate than it should.

### Hub card density

`components/ui/HubTileCard.tsx` already supports a shared card language with `default` and `large` emphasis, but the base card is still tuned for roomy, centered presentation. That works well on the home Hubs tab and on more visual surfaces, but it is too spacious for denser launcher grids like the Players hub.

### Players hub

`app/players.tsx` already uses the newer shared shell and hero system, but the route is still mostly:

- hero metrics,
- two quick-action buttons,
- launcher tiles.

The page is visually clean but functionally thin. It does not immediately show who the current signed-in player is or why this hub matters right now.

### Analytics controls

The repo already has a reusable control primitive in `components/analytics/AnalyticsControlRail.tsx`, and several routes already use it:

- `app/stats.tsx`
- `app/insights.tsx`
- `app/player-profile/[playerId].tsx`

The inconsistency now is not that these routes lack a shared primitive. It is that they still present that primitive inside noticeably different control rhythms, densities, and header structures. The controls are related, but the family resemblance is weaker than it should be.

### Staged disclosure

#### Charts

`app/charts/index.tsx` already contains the strongest staged structure in this batch:

- a sticky setup hero,
- a three-stage guided rail,
- locked versus active versus completed states.

The remaining issue is presentation density inside the open stages, especially in the `Scope` stage where the same chooser can render as an empty search rail plus a second conditional result rail. The screen concept is right; the visible setup flow still feels busier than necessary.

#### Game Setup

`app/game-setup.tsx` is already single-screen and interaction-focused, but the above-the-fold hierarchy is flatter than ideal:

- the `Start Game` action is visible,
- the drag-reorder list is the core interaction,
- the `Change Color` action sits in the turn-order header,
- all three compete for attention more than they need to.

The screen does not need a wizard. It needs a clearer emphasis order.

## Proposed Design

## 1. Data Naming Standard

The visible umbrella label for the analytics family should be `Data`.

### Route and metadata expectations

- Keep the existing route key and route path tied to `analytics`.
- Change the visible bridge and landing language so the user consistently encounters `Data` as the top-level label.
- Preserve route-specific names like `Stats`, `Insights`, `Compare`, `Charts`, and `ELO` once the user is inside the data family.

### Why this is intentionally narrow

This is a copy and hierarchy decision, not a routing or taxonomy rewrite. The internal route names can stay stable while the visible app language becomes more coherent.

## 2. Compact Hub Card Variant

`HubTileCard` should gain a compact presentation mode instead of spawning a second shared launcher component.

### Compact variant intent

The compact card should:

- reduce vertical padding and minimum height,
- tighten icon framing,
- shorten copy spacing,
- keep the same visual family as the existing card system.

### Usage expectations

- The home Hubs tab can keep the current larger visual treatment where space-filling emphasis is intentional.
- `app/players.tsx` should use the compact variant for its launcher cards below the preview section.
- Other routes may opt into compact cards later, but this batch should not proactively retune every existing hub grid.

## 3. Players Hub as Preview Surface

`app/players.tsx` should become a preview-first hub centered on the signed-in player.

### Layout order

The route should read in this order:

1. hero metrics,
2. signed-in player preview card,
3. quick actions,
4. compact launcher tiles.

### Signed-in player preview behavior

The preview card should:

- derive from the signed-in player first,
- fall back gracefully if the signed-in identity is missing from the current playable roster,
- remain read-only,
- expose one action: `Open profile`.

### Preview content

The card should show a compact working-memory snapshot rather than a second profile page. The surface should include:

- player name,
- avatar or card art,
- a small number of concise summary facts,
- the single navigation action.

The card should not include inline editing, inline search, or a local player-switch flow.

## 4. Analytics Controls: Shared Primitive, Custom Shells

The analytics family should standardize around `AnalyticsControlRail`, but the screens should not be forced into one identical shell.

### Shared standard

The shared standard is:

- common tab treatment vocabulary,
- common search treatment vocabulary,
- common action placement options,
- common spacing and density controls inside the rail component.

### Route-specific expectations

#### Stats

`app/stats.tsx` should remain the most dashboard-like route in the family.

Its rail should feel direct and utility-driven:

- strong top placement,
- quick switching between slices,
- minimal editorial framing around the controls.

#### Insights

`app/insights.tsx` should keep a more interpretive tone.

Its rail should feel like a lens selector:

- slightly more breathing room,
- stronger tie-in to the route's summary language,
- preserved player-search behavior for personal correlations.

#### Player Profile

`app/player-profile/[playerId].tsx` should keep its strong hero and metric identity, but its control zones should be visually tightened.

The search rail and tab rail should feel like one coherent control system instead of multiple separate blocks competing with the hero.

### Explicit non-goal

This batch should not attempt to create a universal analytics route wrapper that every route must adopt. The shared value comes from consistent control language, not identical compositions.

## 5. Charts: Stronger Single-Screen Staged Disclosure

`app/charts/index.tsx` should keep the existing guided setup model but present it more cleanly.

### Stage rules

The interaction contract should be:

- one stage open and active at a time,
- completed stages collapse to summary plus `Edit`,
- locked stages reduce to title plus unlock message,
- the chart-launch action remains attached to the final stage state.

### Scope-stage cleanup

The `Scope` stage should stop rendering the same chooser in two different visible forms. Search for focus players and scope players should present as one coherent search experience per chooser instead of:

- a hidden-results rail,
- followed by a second conditional rail when text exists.

The goal is not to reduce capability. The goal is to remove duplicate visual noise while keeping the existing signed-in-first quick-pick behavior.

### Browse versus configure

The route should continue to keep browsing and configuring distinct:

- when setup is closed, the user browses charts,
- when setup is open, the user configures one chart.

This distinction is already correct and should remain intact.

## 6. Game Setup: Stronger Single-Screen Emphasis Order

`app/game-setup.tsx` should keep the current single-screen interaction model and the existing `Change Color` placement in the turn-order header.

### Visual order

The route should read in this order:

1. `Start Game` readiness summary,
2. turn-order interaction zone,
3. secondary color affordance in the header.

### What changes

- The `Start Game` block should communicate readiness more clearly.
- The drag-reorder list should stay the dominant interactive zone.
- The `Change Color` button should remain tied to the header and only become usable when a captain is selected.

### What does not change

- No new selected-player detail panel.
- No multi-step setup wizard.
- No move of the color action into a separate subpanel.

This is staged disclosure through emphasis, not through additional containers.

## File Impact

The likely file set for implementation is:

- `utils/appHubs.ts`
- `components/ui/HubTileCard.tsx`
- `app/analytics.tsx`
- `app/players.tsx`
- `components/analytics/AnalyticsControlRail.tsx`
- `app/stats.tsx`
- `app/insights.tsx`
- `app/player-profile/[playerId].tsx`
- `app/charts/index.tsx`
- `app/game-setup.tsx`

The work should stay concentrated in this set unless a focused test or tiny helper extraction makes a small adjacent change necessary.

## Rollout Plan

The work should land in this order:

1. rename visible analytics hub language to `Data`,
2. add the compact `HubTileCard` mode,
3. convert `app/players.tsx` into a preview-first hub,
4. tighten `AnalyticsControlRail` options as needed for route-specific shells,
5. polish Stats, Insights, and Player Profile around the shared rail language,
6. simplify Charts stage presentation without changing its three-stage model,
7. rebalance Game Setup hierarchy while preserving the header-based color action,
8. do a final copy and spacing pass across the touched routes.

## Verification Plan

Verification should stay lightweight and route-focused:

1. run targeted Node regressions around shared rails, hub metadata, and above-the-fold UI,
2. add focused regression coverage only where this batch introduces new visible contracts,
3. run `npx.cmd tsc --noEmit` as the broad type-safety check.

### Expected existing coverage to reuse

The most relevant existing checks are:

- `scripts/analytics-control-rail.test.cjs`
- `scripts/ui-navigation.test.cjs`
- `scripts/ui-style-above-the-fold.test.cjs`

Additional route-focused checks may be added if the implementation introduces:

- a new compact `HubTileCard` contract,
- a signed-in-player preview contract on `app/players.tsx`,
- a simplified charts stage-disclosure contract.

## Scope Guardrails

To keep this batch focused:

- do not widen the work into a full analytics-family redesign,
- do not use the Players hub preview to add new player-editing behavior,
- do not let the compact card variant replace the home Hubs emphasis mode,
- do not rewrite chart setup business logic when the real issue is visual duplication,
- do not move Game Setup toward a wizard or subpanel model.

The successful implementation should feel like the same app becoming clearer, not like a different app.
