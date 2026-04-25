# Moonrakers Assist Network Exact Composition Design

Date: 2026-04-25
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will replace the current `Relationship Graph` chart in `Your Profile` with a single `Assist Network` chart that is driven by the standard charts-page setup flow.

This chart will no longer try to combine two graph concepts in one surface. The old relationship-flow mode will be deleted. In its place, the profile chart slot will become a dedicated assist network that:

- uses directed edges
- shows real per-edge assist counts from normalized round data
- supports compact count labels on visible edges
- filters by exact table composition when `Players in scope` is used on the charts page

The key product rule is that scope on this chart means exact table membership, not inclusive presence. If the scope is `James + Greg`, only games whose participant set is exactly `James + Greg` belong in the sample. Games with `James + Izzy + Greg` must stay separate.

## Confirmed Product Decisions

- The chart belongs on the charts page under `Your Profile`.
- It replaces the current `Relationship Graph` card.
- The existing relationship-graph concept can be deleted rather than preserved as a second mode.
- The chart must use the standard charts-page setup system rather than custom local controls.
- `Players in scope` on this chart means exact table composition.
- `James + Greg` data and `James + Izzy + Greg` data must remain separate.
- The implementation should change the data source first, then layer edge labels on top.
- The visible graph should stay directional and readable, with labels shown in a compact way rather than turning the graph into a wall of text.

## Goals

- Turn the profile support graph into one clear assist-network product instead of a mixed relationship/assist hybrid.
- Make the chart obey exact-player-combination scope rules when launched from the shared charts setup.
- Build the network from real assist events so count mode and edge badges mean actual assist frequency.
- Preserve the current charts-page interaction model so this feature feels native to the rest of the analytics hub.
- Keep the chart on the unified saved-plus-imported games pipeline already used by the current chart system.

## Non-Goals

- Adding a second special-purpose filter panel outside the normal charts setup flow.
- Preserving the old relationship-flow graph as an alternate mode.
- Changing scope semantics for unrelated charts that already use `Players in scope`.
- Fabricating assist counts from totals-only data that lacks source-target event detail.
- Reworking unrelated profile or charts-page layout outside what is needed to support the new chart.

## Current Architecture Context

The charts hub already exposes the right setup surface in [app/charts/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/index.tsx). Today it supports:

- focus player
- compare player where applicable
- metric selection
- graph mode for graph charts
- assist metric for the assist-network variant
- `Players in scope` via `selectedGroupIds`

The current profile chart entry is defined in [components/charts/chartCatalog.ts](C:/Users/izzyh/Desktop/moonrakers-app/components/charts/chartCatalog.ts) as `relationship_graph` inside the `profile` section.

The chart detail route in [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/%5BchartKey%5D.tsx):

- resolves players from the unified charts pipeline
- builds `relationships` with `buildRelationships(resolvedPlayers, unifiedGames)`
- builds snapshots with `buildUnifiedSnapshots(unifiedGames, resolvedPlayers)`
- passes scoped players and relationships into [components/charts/RelationshipGraph.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/charts/RelationshipGraph.tsx)

The current relationship aggregation in [utils/charts.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/charts.ts) is totals-based. `buildRelationships(...)` builds directed weights from assist-source maps on totals entries. That is enough for weighted support flow, but not enough to produce reliable real-count badges for assists.

The normalized unified game model already contains round-level assist detail:

- `NormalizedRound.assistRecipients`
- `NormalizedRound.assistPrestigeRecipients`

Those fields are normalized for both saved and imported games in [utils/charts.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/charts.ts). That makes the unified rounds pipeline the correct source of truth for real assist counts.

## Recommended Architecture

### 1. Replace The Profile Chart In Place

Keep the current profile chart slot and route identity, but repurpose it from a dual-purpose `Relationship Graph` into a dedicated `Assist Network`.

Recommended product-level changes:

- rename the chart title from `Relationship Graph` to `Assist Network`
- update the hook and detail subtitle to describe assist flow specifically
- remove the old graph-variant copy about switching between relationship flow and assist-network views

This is the lowest-risk integration path because the charts hub, chart detail route, and setup sheet already know how to launch this chart slot.

### 2. Delete The Relationship-Flow Variant

Remove the old `relationship` versus `assist_network` branching from the charts-page experience.

That means:

- no graph-variant selector in the setup sheet for this chart
- no relationship-flow renderer path for this chart in the detail route
- no product copy implying that the user can switch between two graph types

The chart becomes one product with two setup dimensions that still matter:

- `Graph mode`
- `Assist metric`

### 3. Build A Dedicated Assist-Network Data Builder

Add a chart-specific assist-network aggregation layer on top of unified games.

This builder should:

1. accept unified normalized games and optional scoped player ids
2. optionally filter games by exact player-set match
3. aggregate directed assist edges from normalized round data
4. return per-edge metrics needed by the graph and readout cards

The output should include, at minimum:

- `sourceId`
- `targetId`
- `assistCount`
- `assistPrestige`
- `assistEfficiency`

The node summary should derive from those edges rather than from the old totals-based relationship map.

### 4. Treat Scope As Exact Table Composition For This Chart Only

When the user launches this chart with `Players in scope`, the selected ids define the exact participant set that a game must match.

Rules:

- If no scoped ids are provided, use the full unified game sample.
- If scoped ids are provided, a game is included only when its normalized participant id set exactly matches the selected set.
- Order does not matter.
- Extra players disqualify the game.
- Missing selected players disqualify the game.

Examples:

- Scope `James + Greg` includes only two-player games with exactly James and Greg.
- Scope `James + Izzy + Greg` includes only three-player games with exactly those three players.
- A `James + Greg + Sam` game is excluded from `James + Greg`.

This exact-match meaning is intentionally chart-specific. Other charts may continue to interpret scope more broadly.

### 5. Use Round-Level Assist Events For Counts

Real count labels must come from normalized round data, not from totals-level source maps.

Recommended counting rules:

- Each positive recipient entry in `assistRecipients` counts as one assist event from the acting player to that recipient for that round.
- `assistPrestigeRecipients` contributes edge prestige totals only for the same directed links already confirmed by `assistRecipients`.
- If a round records prestige by recipient but the binary recipient map is missing, that round must not create new counted edges. The implementation should prefer truthful undercounting over inferred counts.
- The builder must not hardcode `assistCount = 1` per aggregated source-target pair.

This change is the prerequisite for truthful count mode and truthful edge badges.

### 6. Keep Count Labels Compact And Readable

The graph should remain visually readable even when multiple edges are visible.

Recommended rendering rules:

- keep directional arrows
- continue using edge width and color intensity for the selected assist metric
- add small edge labels or badges for visible edges only
- default the badge copy to count-first language such as `x3`
- place labels near the curve midpoint with enough contrast against the stage

Count labels should be shown only for the rendered visible edge set after filtering and top-edge limiting. The graph should not attempt to label every hidden or suppressed edge.

## UI Design

### Charts Hub

The charts hub in [app/charts/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/index.tsx) should keep the standard setup model.

For this chart, the setup should include:

- `Focus player`
- `Graph mode`
- `Assist metric`
- `Players in scope`

It should no longer include:

- `Graph view`

The `Players in scope` section keeps the same chips and interaction pattern used elsewhere. Only the chart's downstream interpretation changes.

### Chart Detail Screen

The detail route in [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/%5BchartKey%5D.tsx) should launch the new assist network directly when the chart key is selected.

Expected behavior:

- if fewer than two scoped players are selected, do not apply the exact-table filter and show the full assist-network sample
- if scoped players are selected but there are zero exact-match games, show an explicit empty state
- the subtitle and helper copy should explain that the graph reflects assist flow across the filtered sample

### Readout Cards

The graph readout should continue to surface:

- network hub
- net giver
- net receiver
- strongest link

These values must be recalculated from the exact-composition filtered sample, not from global relationships.

Recommended copy upgrade:

- strongest-link helper should mention the active metric when useful
- empty states should clearly say there are no exact-match games for the selected table

## Data Flow

### Input

Use the existing unified charts pipeline:

`collectUnifiedGames(store) -> resolveAllGamesToPlayers(...) -> canonicalizeGames(...) -> buildUnifiedSnapshots(...)`

For assist-network aggregation, the more relevant branch becomes:

`collectUnifiedGames(store) -> resolved normalized games -> exact-table filter -> round-level assist aggregation`

### Exact-Table Filter

Add a reusable helper that accepts:

- unified normalized games
- scoped player ids

It should derive each game's normalized participant set from `game.players` first and use totals keys only as a careful fallback if needed.

It should compare normalized sets using:

- same size
- same ids

### Edge Aggregation

For each included game:

- iterate normalized rounds or timeline entries using the same canonical player ids
- for each acting player, read assist recipients and prestige recipients
- accumulate by directed pair

Per-edge output should include:

- total count
- total prestige
- efficiency as `prestige / max(1, count)`

Per-node output should include:

- total outgoing count and prestige
- total incoming count and prestige
- support balance
- any hub/involvement values used by the graph inspector

## Error Handling And Empty States

- If no games exist at all, show the normal empty analytics state.
- If players are scoped but no exact-match tables exist, show a chart-specific empty message instead of falling back to inclusive results.
- If some games are missing round-level assist detail, include only the trustworthy edge data available from games that do have it.
- If the filtered sample has players but no assist edges, show a no-assists-yet state rather than pretending there is relationship data.

## Testing Strategy

### Data Tests

Add focused tests for the new assist-network builder covering:

- exact two-player match includes only exact two-player games
- three-player selection excludes matching subsets and supersets
- directed counts aggregate correctly across multiple rounds and games
- prestige and count metrics can diverge while still producing correct efficiency
- empty exact-match sample returns an empty graph result

### Route And Setup Tests

Add tests covering:

- profile chart catalog entry now reads as `Assist Network`
- setup no longer shows the old graph-variant selector for this chart
- assist metric setup still appears for the chart
- scoped ids are still passed through the standard chart-launch params

### Rendering Tests

Add a lightweight rendering test or regression check to confirm:

- directed arrows still render
- visible edges can render compact count labels
- the chart can show an explicit no-exact-match empty state

## Migration And Compatibility Notes

- The safest path is to keep the existing chart slot key if route compatibility matters and update the product naming around it.
- Any remaining helper paths that still mention relationship-graph switching should be updated or removed.
- Legacy helper references such as old hub preview aliases should either map cleanly to the new assist-network product or be deleted if unused.

## Implementation Outline

1. Rename the catalog entry and product copy from `Relationship Graph` to `Assist Network`.
2. Remove the old graph-variant setup and renderer branching.
3. Add an exact-table-composition filter helper for this chart path.
4. Add a dedicated assist-network aggregation helper based on normalized rounds.
5. Update the graph component model so assist count is real instead of hardcoded per pair.
6. Add compact count badges to visible edges.
7. Update readout and empty-state copy.
8. Add focused tests for filtering, aggregation, and setup behavior.

## Risks And Mitigations

- Risk: legacy imported games may not always have complete round assist detail.
  - Mitigation: treat real edge counts as available only when normalized round recipient data exists; never fabricate counts from aggregated totals.

- Risk: changing scope semantics globally would surprise other charts.
  - Mitigation: keep exact-composition filtering local to the assist-network chart pipeline.

- Risk: removing the old relationship-flow variant could leave dead setup or alias code behind.
  - Mitigation: explicitly delete variant-specific setup handling and add regression coverage for the new single-chart behavior.

## Open Questions

There are no remaining product questions blocking planning. The key behavior decisions for placement, scope semantics, and relationship-graph deletion have been resolved.
