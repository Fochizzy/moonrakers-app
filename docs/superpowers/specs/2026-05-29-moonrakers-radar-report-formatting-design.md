# Moonrakers Radar Report Formatting Design

Date: 2026-05-29

## Summary

This design restructures the long-form comparison narrative in `components/charts/RadarChart/RadarChart.tsx` so the `Deep Comparison Report` reads as a stack of smaller cards instead of one dense article block.

The goal is to preserve the same report content while making the mobile presentation easier to scan:

1. keep the existing `Comparison Summary` card in place,
2. replace the single deep-report article card with stacked section cards,
3. keep the existing compare-player trait grids attached to their comparison cards,
4. avoid any data-contract or route changes.

## Goals

- Make the long-form comparison narrative easier to scan on narrow mobile screens.
- Preserve the current report copy and data model.
- Improve hierarchy between the intro, overview, per-player analysis, and consistency read.
- Keep the existing compare-player cards as the main place where trait pressure is explored.
- Add focused tests that lock in the new structure.

## Non-Goals

- No change to how radar metrics are computed.
- No new API payload fields.
- No new route, tab, or drill-down surface.
- No rewrite of the trait glossary interaction.
- No copy rewrite beyond small heading or subtitle adjustments needed for the new layout.

## Current State

The radar surface currently renders three main text-heavy regions after the plot:

1. a `Comparison Summary` card,
2. a stack of per-player comparison cards with trait grids,
3. a single `Deep Comparison Report` card containing every overview and player section in one article block.

That last report card uses `deepReportSections` and renders every section through one `reportSectionStack`, which creates a long uninterrupted text block on mobile even though the content is already logically segmented.

## Proposed Layout

### Card order

Keep the order below the chart as:

1. `Comparison Summary`
2. comparison cards for each selected player
3. `Deep Comparison Report` intro card
4. `Overview` card
5. one narrative card per compare player
6. `Consistency Outlook` card
7. `Trait Definitions`

This preserves the current reading flow while turning the long report into smaller, more readable stops.

### Deep report structure

Replace the single `deepReportCard` article block with a `deepReportStack` of cards:

- one compact intro card containing `Deep Comparison Report` and its subtitle,
- one standalone card for the `Overview` section,
- one standalone card for each player section such as `P1. Corey`,
- one standalone card for `Consistency Outlook`.

Each report card should keep the existing section title plus its current paragraphs. The change is presentation-only: the sections are still derived from `deepReportSections`.

### Player narrative card hierarchy

Each per-player report card should use clearer internal hierarchy than the current article list:

- title row with the `P1`/`P2`/`P3` identity visible first,
- prominent player name,
- muted supporting subtitle that frames the matchup lens,
- paragraph blocks with more breathing room than the current article stack.

This should visually echo the existing comparison cards without duplicating the trait grid inside the deep-report layer.

### Data and rendering boundaries

The compare-player trait grids should stay inside the existing comparison cards rather than moving into the report cards.

`deepReportSections` should remain the single source for the narrative content. The implementation should only change how sections are grouped and rendered, not how they are authored.

## Styling Direction

- Keep the current dark card language and border treatment.
- Increase separation between narrative sections by using discrete cards instead of dividers alone.
- Preserve the existing typography family and general sizing scale.
- Use tighter subtitle styling and slightly more spacing between paragraph blocks to reduce the wall-of-text effect.

The result should feel like a cleanup of the existing Moonrakers chart surface, not a new visual system.

## Testing Strategy

Update the focused radar-chart tests so they prove:

- the comparison summary still renders below the chart,
- the deep comparison report still exists,
- the narrative now renders as distinct stacked sections instead of one monolithic article seam,
- the trait glossary still follows the comparison report content,
- the existing tap-to-highlight glossary helper copy remains in place.

Static source assertions are sufficient for this pass because the change is a presentation-layer reorganization inside one component.

## Implementation Notes

- Keep the change scoped to `components/charts/RadarChart/RadarChart.tsx` and the targeted radar-chart script tests unless a tiny shared style helper becomes necessary.
- Preserve the current report copy to avoid mixing formatting work with content work.
- Follow the repo's existing card and spacing patterns rather than introducing a brand-new visual treatment.
