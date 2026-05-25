# Moonrakers Broader Visual Sweep Design

## Goal

Finish the remaining analytics visual-system outlier work without reopening analytics logic or server contracts.

## Scope

This pass is intentionally narrow:

- Convert `app/game-trends.tsx` from its route-local `StarryNight` + custom `SectionCard` presentation onto the shared analytics shell.
- Keep the existing trend calculations, section order, anchors, and navigation behavior.
- Reuse `PageShell`, `HeroCard`, and shared `SectionCard` so the route reads like the newer analytics screens.
- Fix the player-card navigation target to use the canonical player profile route helper while the file is open.

This pass does not change:

- Supabase analytics payloads
- game-trend calculations
- chart fallback logic
- glossary/definitions coverage beyond what already exists

## Approach

`app/game-trends.tsx` becomes a route-wide presentation cleanup rather than a data rewrite. The route keeps its existing memoized trend rows and section-scroll behavior, but replaces the bespoke backdrop/card system with the shared analytics primitives.

The hero area should match the analytics family:

- shared `PageShell` background preset
- compact `HeroCard`
- shared action buttons for back/home navigation
- section cards that follow the same header and spacing rhythm as `analytics`, `stats`, and `elo`

## Success Criteria

- `app/game-trends.tsx` imports and uses shared `PageShell`, `HeroCard`, and UI `SectionCard`
- the file no longer defines a route-local `SectionCard`
- the file no longer uses `StarryNight`
- existing trend sections still render in the same order and keep anchor navigation
- player-card taps route through `buildPlayerProfileRoute(...)`
