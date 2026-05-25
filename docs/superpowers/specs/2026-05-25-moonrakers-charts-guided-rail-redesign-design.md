# Moonrakers Charts Guided-Rail Redesign

Date: 2026-05-25
Status: Drafted for user review
Owner: Codex

## Summary

Moonrakers will redesign the charts hub setup flow in `app/charts/index.tsx` so it feels lighter, more guided, and less control-dense.

The selected chart will continue to be chosen outside the setup flow on the browse surface. Once a chart is chosen, setup will open as a connected guided rail with three stages:

1. `Scope`
2. `Metric`
3. `Style`

The setup experience will auto-advance between stages, collapse completed stages into compact summaries, and keep the top hero extremely light so the rail becomes the main interaction surface.

## Goals

- Reduce the perceived control density on the charts hub.
- Make the setup flow easier to read in the correct order.
- Keep the route feeling powerful without showing every decision at once.
- Preserve the existing chart-selection browse surface.
- Keep `app/charts/index.tsx` as a configuration/orchestration route rather than an analytics-computation surface.

## Non-Goals

- Redesigning the actual chart detail screens in `app/charts/[chartKey].tsx`.
- Moving chart analytics computation back into the client.
- Converting chart selection itself into a wizard step.
- Reworking unrelated analytics or history surfaces in this pass.

## Confirmed Product Decisions

- Chart selection stays outside the setup rail.
- The setup rail begins only after a chart is already selected.
- The rail order is `Scope -> Metric -> Style`.
- Stage completion auto-advances to the next stage.
- Completed stages collapse into compact summary cards with `Edit`.
- The hero should be lighter than the current `HeroCard` treatment and closer to a heading bar.
- The hero should carry less setup detail, not more.
- The rail should feel like one connected progress system, not a set of unrelated cards.

## Current Route Context

Today, `app/charts/index.tsx` uses a sticky hero plus a long stacked setup surface that can show:

- focus player
- compare player
- metric
- line view
- ELO view
- opponent
- players in scope

All of those sections can appear in one adjustment flow, which makes the screen capable but visually crowded. The route already has useful primitives such as:

- the selected chart hero
- setup sections
- tabs, search pickers, and multi-select scope controls
- route-local configuration state

The redesign should reuse those primitives where possible while changing hierarchy and pacing.

## UX Direction

### Outer Browse Surface

The user still lands on the charts browse surface first and chooses a chart card there.

This part remains outside the guided rail so the mental model stays:

- browse chart types
- choose one
- then configure that chart

This avoids turning the whole route into a four-step wizard and keeps the hub feeling browseable.

### Setup Entry

Opening setup moves the route into a focused guided-rail state for the selected chart.

The page should visually communicate:

- which chart is selected
- what the current setup summary is
- which stage is active now
- what will come next

### Stage Order

The sequence is:

1. `Scope`
2. `Metric`
3. `Style`

That order intentionally matches the product questions:

- `whose story are we telling?`
- `what are we measuring?`
- `how should we render it?`

## Hero Design

The top hero should no longer behave like a full summary card with too much state packed into it.

Instead, it should feel like a lightweight heading bar with:

- chart title
- one short takeaway sentence
- compact chips for the current setup state
- `Edit Setup`
- `Back to Command`

The hero should not try to explain every stage in prose.

### Hero Content Rules

Allowed hero content:

- chart title
- one sentence hook/takeaway
- 2 to 4 compact state chips such as:
  - selected focus player
  - number of scoped players
  - chosen metric
  - style mode

Avoid:

- large descriptive blocks
- repeated section labels already visible in the rail
- detailed multi-line setup summaries

The rail, not the hero, should carry the main interaction weight.

## Guided Rail System

The setup body should become a connected vertical progress rail rather than a simple stack of equal cards.

### Visual Behavior

- the active step is expanded and visually dominant
- completed steps collapse into compact linked summaries
- future steps stay visible but muted and locked
- the rail should visually read as one connected flow

The user should understand at a glance:

- where they are
- what they already chose
- what is next

### Progress States

Each stage has one of three states:

1. `Active`
2. `Completed`
3. `Locked`

#### Active

- fully expanded
- strongest border/fill treatment
- clearest step label

#### Completed

- collapsed summary row
- short value summary
- `Edit` action
- quieter than the active step

#### Locked

- visible but compact
- muted copy like `Unlocks after Scope`
- not interactive until the prior step is complete

## Stage Definitions

### Stage 1: Scope

This stage answers: `whose story are we telling?`

It owns:

- focus player
- compare player when relevant
- players in scope
- player search and multi-select helpers

This should be the largest of the three stages because it does the most conceptual work.

#### Scope Content Order

1. quick focus-player picks
2. focus-player search
3. compare-player controls when relevant
4. scoped-player multi-select

#### Scope Completion

When valid, it auto-advances to `Metric`.

Its collapsed summary should read like:

- `Nova`
- `Nova vs Duke`
- `Nova - 4 players in scope`

The exact summary copy can vary by chart type, but it should stay short.

### Stage 2: Metric

This stage answers: `what are we measuring?`

It should show only metric choices relevant to the selected chart.

Recommended metrics should appear first, with secondary metrics in a tighter group beneath or after them.

If the selected chart effectively has a fixed metric, this stage should resolve immediately and collapse without forcing redundant interaction.

#### Metric Completion

When chosen, it auto-advances to `Style`.

Collapsed summary example:

- `Current ELO`
- `Total Prestige`
- `Assist Rate`

### Stage 3: Style

This stage answers: `how should this be rendered?`

It owns display-only or presentation-mode decisions such as:

- line mode
- ELO tab
- opponent filter
- other chart-specific view modes

It should be the smallest and quietest stage because it is the least conceptually important.

#### Style Completion

This stage should contain the primary `Open Chart` CTA once it is valid.

Collapsed summary example:

- `Raw`
- `Context`
- `Context - Duke`

## Auto-Advance Rules

The rail should auto-advance after a valid selection is made for the current stage.

This does not mean the previous stage disappears. It means:

- the completed stage collapses into summary form
- the next stage scrolls/focuses into place
- the user can still tap `Edit` on a completed stage to reopen it

Auto-advance should feel fast but not jumpy.

Use small, readable transitions rather than dramatic motion.

## Editing Behavior

Each completed stage should expose an `Edit` affordance.

When reopened:

- that stage expands
- later dependent stages may need to invalidate or reset if the changed value makes them stale

For example:

- changing `Scope` can invalidate `Metric` and `Style`
- changing `Metric` can invalidate `Style`
- changing `Style` should not invalidate earlier stages

## CTA Placement

The main action hierarchy should become:

1. `Open Chart` inside the final `Style` step
2. `Edit Setup` in the hero as a secondary route-level control
3. `Back to Command` as a quiet route exit

The page should not present multiple equally loud actions at once.

## Copy Direction

Stage labels should stay short and stable:

- `Scope`
- `Metric`
- `Style`

Collapsed summaries should prioritize concrete chosen values over explanatory prose.

Locked-stage helper copy should be brief:

- `Unlocks after Scope`
- `Unlocks after Metric`

## Implementation Boundaries

This redesign should stay inside `app/charts/index.tsx` plus any small local helper extraction needed to keep the file manageable.

Preferred implementation shape:

- keep chart-selection rails intact
- refactor setup rendering into smaller local sections/components
- avoid changing analytics source-of-truth behavior
- avoid adding new client-side analytics derivation

Possible extractions if needed:

- hero heading bar component
- guided rail stage component
- collapsed stage summary component
- stage validation helpers

## Success Criteria

The redesign is successful when:

- the charts hub feels less dense without losing power
- the user can read setup in a clear order
- the hero feels lighter than today
- the setup rail is obviously the main interaction surface
- completed stages summarize choices clearly
- the user can still revise earlier choices without confusion

## Verification Direction

When implemented, verification should cover:

- source-level checks that the guided rail structure exists
- route behavior checks for stage progression and state collapse
- no regression in chart-route parameter forwarding
- TypeScript verification
- a runtime smoke check on the charts hub if available
