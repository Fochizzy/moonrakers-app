# Moonrakers Radar Report Readability Design

Date: 2026-05-29

## Summary

This design is a follow-on readability pass for the `Deep Comparison Report` in `components/charts/RadarChart/RadarChart.tsx`.

The stacked-card structure from the previous pass stays in place. This pass only makes the report easier to read by giving each paragraph its own inset panel and adding stronger spacing and separation inside each report card.

The goals are to:

1. keep every interpretation and data point exactly as written,
2. preserve the current card order and report structure,
3. reduce the dense wall-of-text feel on mobile screens,
4. avoid changing the underlying radar data model or report-generation helpers.

## Goals

- Keep all current report copy intact.
- Make the `Overview`, player cards, and `Consistency Outlook` cards easier to scan.
- Add clearer visual separation between the first and second paragraph in each report section.
- Preserve the existing dark Moonrakers chart language.
- Keep the implementation scoped to the current `RadarChart` render and focused source tests.

## Non-Goals

- No copy rewrite, shortening, summarization, or removal.
- No change to the stacked-card order introduced in the previous pass.
- No changes to `deepReportSections` generation logic.
- No changes to radar metrics, comparison math, or glossary behavior.
- No new navigation or interaction affordance.

## Current State

The report is already split into discrete cards, but each card still presents its body copy as plain text blocks directly on the card background. On a narrow mobile screen that can still feel dense, especially when both paragraphs are long and visually similar.

The readability issue is not the information architecture anymore. It is the text treatment inside each card.

## Proposed Layout

### Keep the current report structure

Do not change the existing order:

1. intro card,
2. `Overview`,
3. per-player report cards,
4. `Consistency Outlook`,
5. `Trait Definitions`.

Do not change any titles, subtitles, or paragraph text.

### Paragraph panel treatment

Inside each report section card, each paragraph should render inside its own inset panel instead of directly on the card background.

Each inset paragraph panel should:

- sit below the section header with clear spacing,
- have its own subtle radius, border, and background tint,
- use the same paragraph text content already generated today,
- create stronger visual separation between paragraph one and paragraph two.

This keeps the content identical while breaking the reading task into smaller visual units.

### Visual hierarchy

Keep the current header structure, but make the body read more like:

- header,
- first paragraph panel,
- second paragraph panel.

The first paragraph remains the primary interpretation block. The second paragraph remains the follow-through interpretation block. The difference is only visual grouping and breathing room.

## Styling Direction

- Keep the current card shells and border language.
- Add more internal padding to the report cards if needed so the new paragraph panels do not feel cramped.
- Give paragraph panels a slightly darker or more inset background than the outer card.
- Increase the gap between paragraph panels compared with the current plain text stack.
- Slightly increase body line-height only if needed to support the new panel treatment.

This should feel like a readability polish, not a redesign.

## Testing Strategy

Update the focused radar source tests so they prove:

- the deep comparison report still renders,
- report section cards still exist,
- the new inset paragraph panel structure exists in source,
- the trait glossary still follows the report.

The existing focused script tests plus a `tsc --noEmit` compile check are sufficient for this pass.

## Implementation Notes

- Keep the change scoped to `components/charts/RadarChart/RadarChart.tsx` and the two focused radar script tests.
- Prefer new style names that clearly describe the inset paragraph treatment.
- Do not mix readability polish with copy edits or broader chart refactors.
