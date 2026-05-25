# Moonrakers Definitions Links And Actionable Insights Design

Date: 2026-05-25
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will make metric-heavy analytics surfaces easier to trust by adding lightweight `What is this?` jump-outs into the existing Definitions route, then make the Insights screen more useful by replacing broad generic shortcuts with player-aware actions when a personal-correlation player is selected.

This slice has two coordinated goals:

- reduce interpretation friction on Stats, Insights, ELO, and player-profile metric surfaces
- turn the Insights hero actions into context-aware launch actions for the currently selected player

The approved direction is intentionally lightweight:

- reuse the existing Definitions route and highlighting behavior instead of creating a new glossary screen
- reuse the existing Moonrakers Intel `Definition` CTA pattern as the visual baseline
- add precise metric links where metric keys are stable
- add broader section-level help links where the screen is powered by server-authored payload labels instead of stable local metric keys

## Confirmed Product Decisions

- Add `What is this?` or equivalent tiny help jump-outs on metric-heavy surfaces rather than only keeping Definitions as a separate destination.
- Reuse the existing Definitions route rather than creating a second education/help screen.
- Stats, Insights, ELO, and player-profile surfaces are all in scope for this pass.
- Insights should become more actionable based on the currently selected player.
- When a player is selected on Insights, the screen should offer:
  - `Open compare for this player`
  - `Open scoped charts`
  - `View profile`
- The screen should not stay limited to broad, generic hero links when it already has enough context to launch a narrower flow.

## Goals

- Help users understand newer metrics without leaving them guessing which terms are trustworthy or important.
- Reduce the number of manual steps between seeing a useful correlation and acting on it.
- Keep the new help affordances small enough that analytics screens still feel like analytics screens, not tutorials.
- Reuse current routing and UI conventions instead of inventing a separate pattern for every surface.
- Avoid fake precision on screens where server-authored labels are dynamic and do not cleanly map to one stable local metric key.

## Non-Goals

- Rewriting analytics calculations
- Replacing Supabase as the source of truth for Insights or Stats
- Rebuilding the Definitions screen into a full documentation center
- Adding modal explainers for every metric
- Turning every card into a fully interactive help surface
- Redesigning the entire hero layout for Stats, Insights, ELO, or player profile

## Current Context

### Existing Definitions Support

`app/definitions.tsx` already supports route-level metric targeting through the `metric` param and highlights matching items once opened.

`utils/appRoutes.ts` already exposes `buildDefinitionsRoute(metric: string)`.

That pattern is already used in `components/player/MoonrakersIntelSection.tsx`, where several assist-context cards expose a small `Definition` CTA and route directly to the correct glossary entry.

That existing Moonrakers Intel interaction is the best baseline for this pass:

- the CTA is small
- the interaction is optional
- the route target is specific
- the screen does not become visually noisy

### Stats Constraints

`app/stats.tsx` is a mixed screen:

- some content is backed by local, known UI keys such as hero highlight labels and player-detail stats
- some content is server-authored from Supabase and rendered from payload arrays like `topSignals`, `correlationItems`, and `gamesItems`

That means Stats should not pretend that every visible label has a stable local metric key. Some sections need category-level or topic-level definitions rather than one-card-to-one-key links.

### Insights Constraints

`app/insights.tsx` already tracks:

- the signed-in profile id
- the currently selected player for personal correlations
- the current section tab
- the player search/switch state

It also currently renders a broad hero action row with `Compare`, `Stats`, and `Elo`.

That action row is useful for generic navigation, but it leaves value on the table because the screen already knows enough to launch more specific actions.

### ELO And Player Profile Constraints

`app/elo.tsx` and `app/player-profile/[playerId].tsx` both rely on stable metric keys and registry-driven sections more than Stats does.

That makes them good candidates for precise Definitions links because:

- the top cards are known
- the tabbed sections are known
- the active metric sections are already grouped
- the player profile already carries quick-action launchpads

## Recommended Architecture

### Core Direction

Use two related but distinct help-link patterns:

1. **Precise metric links**
   Use when the screen is rendering a known metric key or a card whose meaning is stable and local.

2. **Section-level topic links**
   Use when the screen is rendering server-authored or dynamic payload labels that do not reliably map to one local metric key.

This avoids two common failure modes:

- over-linking every card until the UI feels noisy
- linking dynamic labels to the wrong metric definition just to force precision

### Routing Model

The existing `buildDefinitionsRoute(metric)` helper should be expanded so help CTAs can open Definitions in one of two ways:

- by exact metric key
- by broader category/topic

Recommended route inputs:

```ts
buildDefinitionsRoute({
  metric?: string | null;
  category?: string | null;
});
```

Recommended Definitions route behavior:

- if `metric` is present:
  - keep the current metric-highlight behavior
  - auto-select the matching category if one exists
- if `category` is present and `metric` is absent:
  - preselect that category on Definitions load
- if both are absent:
  - keep existing default behavior

This gives the app a clean split:

- ELO and player profile can deep-link to precise metric entries
- Stats and Insights can deep-link to the most relevant category when a precise mapping would be misleading

### Reusable UI Pattern

Create one shared tiny-link pattern for this work instead of hand-rolling multiple versions.

Recommended component responsibility:

- render a small inline CTA such as `What is this?` or `Definition`
- accept either a metric key or a category key
- push through the shared Definitions route builder
- stay visually quieter than a normal action button

Recommended usage styles:

- metric card accessory for precise local cards
- section header accessory for broader topic-level help

The goal is consistent language and smaller review surface.

## Definitions Screen Design

### New Capability

Extend `app/definitions.tsx` so it can respond to a category route param in addition to the current metric param.

Recommended behavior:

- route into a specific group without requiring the user to search manually
- preserve current search filtering and metric highlighting
- if a metric is present, metric targeting wins over category-only targeting

### Definition Coverage Expansion

The Definitions catalog should be expanded in the smallest useful way so the new CTAs land somewhere precise enough to build trust.

Recommended additions:

- a lightweight `ELO` category
- a lightweight `Correlations` category

Recommended `ELO` entries:

- `elo_current`
- `elo_peak`
- `elo_confidence`
- `elo_momentum`
- `elo_expected_vs_actual`
- `elo_clutch`
- `elo_upset_rate`
- `strengthOfSchedule`
- `consistencyScore`
- `clutchScore`
- `promotionOdds`
- `trajectoryGrade`

Recommended `Correlations` entries:

- `pairingCorrelations`
- `macroCorrelations`
- `topSynergyPairs`
- `synergyIndex`
- `assistGapToTarget`
- `assistGapToLeader`
- `assistsAtSixPlus`
- `assistsOverFiveBehindLeader`
- `assistPrestigeGained`

These do not need to become a long encyclopedia. The screen only needs enough definitions to support the new help routes honestly.

## Stats Design

### Why Stats Needs Topic Links

Stats is powered partly by server-authored payload sections whose labels can change or expand independently of local card definitions.

Because of that, Stats should use section-level `What is this?` links instead of forcing every payload row into a local metric map.

### Recommended Placements

Add a small help CTA to these sections in `app/stats.tsx`:

- `Overview`
- `Player Detail`
- `Playstyle`
- `Correlation feed`

Recommended mappings:

- `Overview` -> Definitions category `scoring`
- `Player Detail` -> Definitions category `efficiency`
- `Playstyle` -> Definitions category `efficiency`
- `Correlation feed` -> Definitions category `correlations`

Recommended non-placement:

- do not add a help CTA to the `Games` section in this pass unless a clearly reusable glossary target exists

This keeps the link density low while still giving users a reliable "how do I read this?" escape hatch in the most interpretation-heavy tabs.

## Insights Design

### Actionable Hero Actions

Replace the current broad hero links in `app/insights.tsx` with player-aware actions whenever the screen has a selected player.

Recommended player-aware hero actions:

- `Open compare for this player`
  - route via `buildCompareRoute({ mode: "players", ids: [selectedProfileId] })`
- `Open scoped charts`
  - route via `buildChartsRoute({ playerId: selectedProfileId, setup: true })`
- `View profile`
  - route via `buildPlayerProfileRoute(selectedProfileId)`

Recommended fallback behavior:

- if no selected player exists yet, preserve the current generic action row rather than rendering broken contextual actions

### Section Help Links

Add one small help CTA per active Insights section.

Recommended mappings:

- `Personal Correlations` -> Definitions category `correlations`
- `Macro Correlations` -> Definitions category `correlations`
- `Top Synergy Pairs` -> Definitions category `correlations`

This is intentionally section-level, not per-row, because the rows are server-authored and should not be force-mapped to local keys without a stronger contract.

### Copy Direction

The selected-player state should be obvious in the hero actions.

Recommended examples:

- `Open compare for Izzy`
- `Open charts for Izzy`
- `View Izzy's profile`

If names are too long, shorten visually while preserving the player-aware meaning.

## ELO Screen Design

### Top Metric Cards

Add precise Definitions links to the three top cards in `app/elo.tsx`:

- `Current ELO` -> `elo_current`
- `Peak` -> `elo_peak`
- `Win Rate` -> the surrounding `ELO` category help CTA rather than a one-off glossary entry

Recommended implementation preference:

- prefer precise links where the metric key already exists
- do not add one-off glossary entries for headline labels that are only acting as readouts of broader ELO context

### Active Section Metrics

Add a section-level help CTA for the active metric block that routes by the current tab topic.

Recommended mappings:

- `Leaderboard` -> category `elo`
- `Momentum` -> category `elo`
- `Skills` -> category `elo`
- `Context` -> category `elo`
- `Projection` -> category `elo`

This gives ELO both:

- precise links on the headline cards
- a quieter topic-level link for the larger tabbed section

## Player Profile Design

### Existing Definition Pattern

Do not replace or redesign the current `MoonrakersIntelSection` definition CTA behavior. It is already the right visual pattern for metric-specific help.

### New Help Placements

Add lightweight help links in `app/player-profile/[playerId].tsx` for:

- the top ELO summary cards
- the `Top 3 Winning Signals` section
- the custom metric section beneath the active tab

Recommended mappings:

- top summary cards use precise metric links where available
- `Top 3 Winning Signals` uses a topic-level `ELO` category link
- the active custom metric section uses a topic-level `ELO` category link

This keeps the profile readable while making the ELO-heavy portions less opaque.

### Quick Actions

Keep the current quick actions unchanged in this pass except where route helpers are needed to support the new Insights contextual actions. This feature is about interpretability and smarter launch actions, not another profile-navigation redesign.

## Interaction Rules

### Help CTA Density

Recommended rules:

- no more than one help CTA per section header
- use per-card help only for a small number of top headline metrics
- avoid adding help CTAs to dense repeating lists unless the data model is stable and local

### Error And Empty States

Help links should not replace existing empty-state or error-state behavior.

Examples:

- if Stats is in a no-games recovery state, keep the recovery CTAs primary
- if Insights is loading or erroring, do not render contextual player actions that depend on missing player context

### Accessibility And Copy

The CTA label should be short and stable.

Recommended primary label:

- `What is this?`

Recommended fallback label for very tight cards:

- `Definition`

This preserves a consistent mental model across all four surfaces.

## Testing Strategy

Add focused regression coverage for:

- the Definitions route builder supporting category and metric input
- Definitions screen category preselection behavior
- Insights hero action row switching from generic to selected-player-aware actions
- Insights selected-player routes using the current player id
- Stats help CTAs routing to the intended Definitions targets
- ELO help CTAs surfacing on the top cards and active metric section
- player-profile help CTAs appearing on the ELO-heavy sections without breaking existing Moonrakers Intel definition links

Recommended test style:

- plain Node source assertions for route wiring and visible CTA copy
- narrow screen-structure regressions similar to the existing repo scripts for navigation and metric-link behavior

## Risks And Mitigations

### Risk: Definitions Coverage Becomes Inconsistent

If links are added before the glossary has enough coverage, the feature will feel arbitrary.

Mitigation:

- add only the minimum new glossary entries needed for the linked surfaces
- prefer category-level links where exact metric fidelity is not available

### Risk: Stats Pretends To Have Stable Metric Keys

Because Stats is partly server-authored, over-precise links could send users to the wrong explanation.

Mitigation:

- use topic/category links for Stats and Insights sections
- reserve exact metric links for ELO, player profile, and existing Moonrakers Intel cards

### Risk: Insights Actions Break When Selection Is Missing

The hero actions could point to invalid routes if the selected player is not resolved yet.

Mitigation:

- gate player-aware actions on a valid selected player id
- preserve a generic fallback action row when that context is unavailable

## Rollout Recommendation

Implement this as one focused slice because the value comes from consistency across the four surfaces.

Recommended order:

1. extend Definitions routing and catalog support
2. add the reusable help CTA pattern
3. wire Insights contextual actions
4. wire Stats, ELO, and player-profile help links
5. run focused route and surface regressions
