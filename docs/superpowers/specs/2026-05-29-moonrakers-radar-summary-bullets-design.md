# Moonrakers Radar Summary Bullets Design

Date: 2026-05-29

## Summary

This design is a follow-on formatting pass for the radar summary surfaces in `components/charts/RadarChart/RadarChart.tsx`.

The goal is to keep every generated summary sentence exactly as it is today, while making the top `Comparison Summary` card and the per-player comparison summaries easier to scan by rendering each sentence as a bullet row instead of a plain stacked text block.

## Goals

- Keep all summary copy intact.
- Apply the same bullet-row pattern to both summary surfaces.
- Improve wrapping and scanability on mobile without changing the report logic.
- Reuse one shared rendering pattern so the two summary areas stay visually consistent.

## Non-Goals

- No change to summary sentence generation.
- No copy rewrite, shortening, or reordering.
- No change to the deeper `Deep Comparison Report` cards.
- No change to radar metrics, comparison math, or glossary behavior.

## Current State

The top `Comparison Summary` card and the summary block inside each player comparison card both render their summary sentences as plain stacked `Text` elements using the same `summaryLine` style.

That keeps the implementation simple, but it makes the summaries feel denser than they need to be, especially when multiple long lines wrap on mobile.

## Proposed Layout

### Shared bullet-row treatment

Render each summary sentence as one row with:

- a dedicated bullet marker column on the left,
- a flexible text column on the right,
- slightly larger vertical spacing between rows than the current plain text stack.

This should be a shared render pattern used by:

1. the top `Comparison Summary` / `Profile Summary` card,
2. each comparison-card summary block under the player header.

### Copy handling

Do not modify the strings in `summaryLines` or `summaryForSeries`.

The bullet treatment is purely presentational. Wrapping should happen within the text column rather than around an inline bullet character.

## Styling Direction

- Keep the current summary card shells.
- Use a subtle bullet marker that matches the Moonrakers dark-card aesthetic.
- Give the text column room to wrap cleanly without crowding the bullet.
- Preserve the current summary typography unless a small line-height adjustment is needed for the new row layout.

The result should feel like a formatting improvement, not a redesign.

## Testing Strategy

Update the focused radar source tests so they prove:

- the summary surfaces still exist,
- the shared summary bullet-row structure exists in source,
- the broader radar seam still includes `Comparison Summary`, `Deep Comparison Report`, and `Trait Definitions`.

The existing two radar script tests plus `tsc --noEmit` are sufficient for this pass.

## Implementation Notes

- Keep the change scoped to `components/charts/RadarChart/RadarChart.tsx` and the two focused radar script tests.
- Prefer a small shared helper component for the bullet rows instead of duplicating the row markup twice.
- Do not mix this pass with copy edits or deeper report-card changes.
