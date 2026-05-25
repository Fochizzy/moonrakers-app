# Moonrakers Full Analytics Polish Wave Design

Date: 2026-05-25
Status: Approved for implementation
Owner: Codex

## Summary

This pass standardizes the analytics UX across the remaining outlier surfaces while keeping Supabase as the source of truth for published analytics. The work introduces a shared analytics-state presentation layer, makes fallback provenance explicit, strengthens recovery messaging, promotes playstyle as a flagship feature, and pushes glossary links into more of the places where users currently have to infer meaning.

## Goals

- Standardize loading, error, empty, and recovery states across analytics surfaces.
- Make `server data` versus `fallback data` visually explicit on chart detail and other analytics surfaces.
- Strengthen `AnalyticsRecoveryCard` so it works as a trust-building diagnostic surface instead of a plain empty-state block.
- Promote playstyle from a thin stats subsection into a more spotlighted analytics feature.
- Push `DefinitionsJumpLink` deeper into playstyle and analytics-heavy surfaces.
- Pull remaining analytics-adjacent visual outliers toward the shared `PageShell` / `SectionCard` language.

## In Scope

- Shared analytics state UI under `components/analytics/*`
- Route adoption in:
  - `app/analytics.tsx`
  - `app/stats.tsx`
  - `app/insights.tsx`
  - `app/elo.tsx`
  - `components/home/HomeLeaderboardTab.tsx`
  - `app/charts/[chartKey].tsx`
- Playstyle spotlight improvements in `app/stats.tsx`
- Stronger playstyle definitions affordances in `components/player/MoonrakersIntelSection.tsx`
- Visual-system cleanup for `app/game-trends.tsx`

## Out of Scope

- New SQL contracts or Supabase RPC changes
- Replacing server-authored analytics with local derivation
- Breaking large routes into smaller files in this batch
- Reworking the full player profile layout end to end

## Design

### Shared Analytics State Layer

Add a reusable analytics-state section component that wraps `SectionCard` and standardizes:

- loading presentation
- error presentation
- empty presentation
- CTA-based recovery presentation
- optional data provenance badge

This component should keep the route code focused on choosing the state, not hand-rolling the presentation.

### Stronger Recovery Card

Upgrade `components/analytics/AnalyticsRecoveryCard.tsx` to support:

- tone variants
- provenance badges
- optional glossary link
- compact or full-height layout reuse

This card should work both for true recovery states and for “data is shown, but it is fallback data” notices.

### Provenance and Fallback Messaging

Make provenance explicit where analytics can fall back:

- `Server data`
- `Supabase fallback`
- `Device fallback`

The first critical target is `app/charts/[chartKey].tsx`, which already has the right logic but not a strong enough UI explanation.

### Playstyle Spotlight

Upgrade the playstyle tab in `app/stats.tsx` so it feels like a feature rather than placeholder scaffolding:

- stronger section title and summary framing
- clearer “how to read this” language
- more visible glossary entry points
- better empty-state wording when the payload is thin

### Definitions Push

Use `DefinitionsJumpLink` more aggressively in analytics-heavy contexts:

- playstyle spotlight cards
- Moonrakers Intel playstyle / condition metrics
- recovery and fallback surfaces where metric ambiguity is highest

### Visual System Alignment

Move `app/game-trends.tsx` off its local card system and onto the shared `PageShell` / `SectionCard` language so it reads as part of the same product.

## Verification

Verification should prove:

- the shared analytics-state component exists and is adopted by the targeted analytics routes
- chart detail fallback surfaces show explicit provenance language
- playstyle spotlight and definitions links appear in the intended stats/profile surfaces
- the touched files stay locally type-clean where practical
