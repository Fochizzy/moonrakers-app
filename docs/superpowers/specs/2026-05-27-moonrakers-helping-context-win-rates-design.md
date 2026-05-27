# Moonrakers Helping Context Win Rates Design

Date: 2026-05-27

## Summary

This design adds server-authored helping-context win-rate reads to Moonrakers analytics and surfaces them in two places:

- the shared `Stats` screen,
- the player-profile `Moonrakers Intel` section.

The new reads should answer a tighter question than the current assist-context counters:

- what happens to the helper's win rate when they help from different prestige contexts,
- what happens to the helped player's win rate in those same moments,
- whether those patterns look different in `2-player` games versus `3+ player` games.

The result should pair neutral evidence with recommendation-style guidance while keeping all new helping data segregated by table size.

## Goals

- Surface helping-context outcome reads for both the helper and the helped player.
- Keep `2-player` and `3+ players` helping samples fully separate.
- Anchor the prestige-difference context to the helper, not the helped player globally.
- Preserve the current server-authored analytics direction instead of deriving recommendation logic only in React.
- Reuse the existing assist-context event pipeline and current Moonrakers analytics surfaces where possible.

## Non-Goals

- No new top-level analytics route.
- No blending of `2-player` and `3+ players` helping samples into one combined recommendation.
- No recommendation rows generated from inferred-only assist totals without tracked assist timing.
- No rewrite of the existing assist-context counters, import-health states, or current player-count split work.
- No attempt to turn `Insights` into another helping-stat board in this batch.

## Current State

### Existing player-profile support

The player profile already has a `Moonrakers Intel` section with:

- `Support Profile`,
- `Assist Context`,
- raw helping-context counters such as:
  - `Assist Gap to Target`,
  - `Assist Gap to Leader`,
  - `Assists at 6+ Prestige`,
  - `Assists Over 5 Behind Leader`,
  - `Assist Prestige Gained`.

These are useful context clues, but they do not yet publish outcome reads for either side of the help event.

### Existing stats-screen support

The live `Stats` screen already behaves as the quick scouting and shared-context surface, and it already supports segregated table-size display patterns such as:

- `2-player`,
- `3+ players`.

That existing split is the right model for helping-context reads as well.

### Existing event groundwork

The repo already has assist-context plumbing in:

- `utils/assistContextMetrics.ts`,
- `utils/playerProfileMoonrakers.ts`,
- the `Moonrakers Intel` player-profile path,
- server-authored analytics migrations and payload wrappers.

The main missing piece is not event capture. It is publishing explicit outcome splits and surfacing them cleanly.

## Approved Approach

Use a balanced contract pass:

1. extend the helping-context model to publish explicit outcome split summaries,
2. keep those summaries table-size segmented first,
3. surface the same core split families on both the player profile and the `Stats` screen,
4. pair each surfaced row with both neutral evidence and short suggestion text.

This keeps the logic trustworthy, avoids a React-only interpretation layer, and fits the repo's current server-authored analytics direction.

## Data Design

### Source of truth

The new helping outcome reads should be based on tracked helping events with exact assist direction and timing.

That means the split summaries should only be generated from timed assist events, not from inferred-only legacy totals.

Inferred legacy assist data can still support the existing aggregate assist-context counters, but it should not generate recommendation rows.

### Table-size segregation

Every helping outcome split must live inside one of these top-level buckets first:

- `2-player`
- `3+ players`

No display row or suggestion should mix events from both buckets.

### Split families

Within each table-size bucket, publish two helping-context split families.

#### 1. Helper prestige band

- `below 6`
- `6+`

This bucket should be determined from the helper's pre-assist prestige.

#### 2. Helper position versus helped player

- `behind target`
- `near even`
- `ahead of target`

This family should be determined from the helper's pre-assist prestige relative to the helped player.

Recommended thresholds:

- `behind target`: helper trails the helped player by `2+` prestige
- `near even`: helper is within `1` prestige of the helped player
- `ahead of target`: helper leads the helped player by `2+` prestige

These thresholds are intentionally simple and readable. They also avoid collapsing everything into a vague "prestige difference" number that would be harder to interpret on the surface.

### Published fields per split row

Each split row should publish:

- `key`
- `tableSizeBucket`
- `family`
- `label`
- `sampleSize`
- `helperWinRate`
- `helpedPlayerWinRate`
- `sampleSizeLabel`
- `helperWinRateLabel`
- `helpedPlayerWinRateLabel`
- `evidenceLine`
- `suggestionLine`

The `evidenceLine` should stay descriptive and neutral.

Example shape:

- `Helpers won 42% across 5 timed assists while below 6 prestige in 3+ player games.`

The `suggestionLine` should stay short and guidance-oriented.

Example shape:

- `Helping before stabilizing your own score looks risky here.`

### Recommendation behavior

The recommendation text should be derived from the split row itself, primarily from:

- helper win rate,
- helped-player win rate,
- sample size,
- relative contrast between the two sides.

It should not invent confidence where the sample is weak.

If a row meets the minimum sample but still has a noisy outcome, the recommendation should stay modest:

- `This looks mixed so far.`
- `The target is gaining more than the helper in this spot.`
- `This is the strongest helper recovery spot in the current sample.`

## Thin-Data Rules

- Require at least `3` timed assists for a surfaced split row.
- If a table-size bucket has no qualifying rows, render nothing for that bucket.
- If one table-size bucket qualifies and the other does not, show only the qualifying bucket.
- Keep the existing raw assist-context counters visible even when the new outcome rows do not qualify.

## Surface Design

### Player profile

The player-profile `Moonrakers Intel` section should keep the current `Assist Context` block intact and add a new block directly below it:

- `Helping Outcome Reads`

That new block should render two subsections when data exists:

- `2-player`
- `3+ players`

Within each subsection, show compact cards or rows for every qualifying surfaced helping split from both families.

Each row should show:

- the split label,
- helper win rate,
- helped-player win rate,
- sample size,
- neutral evidence line,
- recommendation line.

The current raw cards remain important because they explain the shape of the context. The new block adds outcome interpretation without replacing those counters.

### Stats screen

The shared `Stats` surface should place the new helping read in the `Playstyle` tab, not the `Overview` tab.

Reason:

- this keeps helping-context guidance attached to support and playstyle identity,
- it avoids crowding `Overview` with another recommendation strip,
- it matches the route role where support fingerprints already belong.

Add a `Helping Context` cluster to the `Playstyle` tab with separate subsections for:

- `2-player`
- `3+ players`

Each surfaced row should show the same shape as the player-profile version:

- split label,
- helper win rate,
- helped-player win rate,
- sample size,
- neutral evidence line,
- recommendation line.

### Glossary and page linking

Any new surfaced helping terms introduced by this rollout must be added to the glossary and linked on the page.

Concretely:

- add any new glossary terms and copy bodies to `utils/definitionCatalog.ts`,
- add any necessary label or metric aliases so those terms resolve through `resolveDefinitionTarget`,
- make the new surfaced labels glossary-aware on both surfaces instead of rendering them as plain static text.

At minimum, this should cover any new user-facing helping labels that do not already exist in the glossary, such as:

- the new helping outcome section title if it becomes a glossary term,
- helper/helped win-rate labels if they are newly introduced as glossary-backed terms,
- any new split labels that are meant to behave like glossary terms rather than plain bucket copy.

On-page linking should follow the existing app pattern:

- use `DefinitionTermText` for tappable glossary-backed labels where the label itself appears on the surface,
- or route through `buildDefinitionsRoute` when the interaction is attached to a larger pressable card or dedicated definitions action.

The goal is that the new helping analytics do not introduce disconnected language that cannot be opened from the surface.

### Shared wording expectations

The copy should deliberately carry both modes:

- neutral evidence,
- recommendation-style guidance.

That means the same surfaced row should feel like:

- first, a fact,
- second, a suggestion.

This matches the user's request to surface both.

## Architecture

### Server-authored payload work

The implementation should extend the relevant server-authored analytics contracts instead of only layering display logic on top of existing raw counters.

Concretely:

- `public.get_stats_screen` should gain a helping-context summary section suitable for the `Playstyle` tab,
- `public.get_player_profile_screen` should gain helping outcome rows alongside the existing support and assist-context data.

### Local fallback and utility alignment

The local Moonrakers player-profile fallback, including `buildMoonrakersIntelProfile`, should mirror the same split families and thin-data rules so the local fallback does not drift from the published payload contract.

### Display helpers

The `Stats` route should continue the current display-helper direction by normalizing any new helping-context rows in a helper module instead of packing row-shaping logic directly into `app/stats.tsx`.

### Definitions alignment

The implementation should treat glossary support as part of the feature, not as optional polish after the analytics rows work.

That means:

- new helping terminology should ship with matching definition catalog entries when needed,
- the new stats/player-profile labels should be wired to the definitions flow in the same implementation pass,
- the definitions catalog and surface wiring should stay consistent with the final visible labels used on the page.

## Testing

Add or extend targeted tests for:

- assist-event classification into:
  - `below 6`,
  - `6+`,
  - `behind target`,
  - `near even`,
  - `ahead of target`
- helper and helped-player win-rate rollups per split
- table-size segregation between `2-player` and `3+ players`
- minimum-sample gating
- player-profile Moonrakers output shape for the new helping outcome block
- stats-screen display normalization for the new helping rows
- definition catalog coverage for any newly introduced helping terms
- definition-target resolution or label-alias coverage for the new surfaced helping labels
- surface wiring coverage confirming the new glossary-backed labels are linked from the player-profile and stats surfaces

The intent is to verify:

- the math,
- the segmentation,
- the recommendation gating,
- the route-ready display transformation.

## Success Criteria

This work is successful if:

- the player profile shows helping win-rate reads without replacing the current raw assist-context cards,
- the `Stats` `Playstyle` tab shows shared helping guidance,
- every surfaced helping row is segregated into `2-player` or `3+ players`,
- both helper and helped-player win-rate effects are visible,
- the output includes both neutral evidence and recommendation-style guidance,
- inferred-only assist totals do not generate misleading recommendation rows.
