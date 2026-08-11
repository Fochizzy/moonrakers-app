# Moonrakers Web Definitions And Chart Metric Controls Design

Date: 2026-07-06
Status: Approved for planning and implementation
Owner: Codex

## Summary

Moonrakers web needs two related fixes:

- make glossary access feel native on the website by exposing the existing Definitions page and hyperlinking glossary-backed terms across website reading surfaces
- restore in-page metric switching on chart detail pages so multi-metric charts do not force users back through the setup flow just to change one metric

The chosen direction deliberately reuses the current app architecture:

- keep `app/definitions.tsx` as the canonical glossary page on web
- expand the existing `DefinitionRichText` auto-linking path instead of replacing the base `Text` component globally
- keep chart setup in `app/charts/index.tsx`, but add a compact shared metric rail to `app/charts/[chartKey].tsx` so chart detail pages can switch metrics directly

## Confirmed Product Decisions

- The website should expose a reachable Definitions page, not a separate web-only glossary.
- Terms across the website should be aggressively hyperlinkable when they map cleanly to the shared glossary.
- Auto-linking should target reading surfaces, not every control label in the app shell.
- Chart detail pages should allow metric changes in place for multi-metric charts.
- `Back to Adjust` remains useful for scope, player, and setup changes, but metric changes should no longer require leaving the chart page.

## Goals

- Make glossary access obvious and consistent on the web.
- Deep-link glossary terms directly to the right `/definitions` category or metric target.
- Restore missing chart metric controls on the website.
- Reuse existing route params and chart dataset queries instead of inventing a second chart state system.
- Keep the fix narrow enough that it does not rewrite the chart components or navigation architecture.

## Non-Goals

- Replacing the existing Definitions screen
- Creating a second glossary data source
- Auto-linking every `Text` instance in the codebase, including buttons and segmented controls
- Rebuilding chart setup or chart RPC contracts
- Redesigning the chart visuals

## Current Context

### Existing Glossary Support

The repo already contains:

- `app/definitions.tsx` as the shared Definitions route
- `utils/definitionCatalog.ts` as the glossary source of truth
- `utils/definitionTargets.ts` as the shared alias resolver
- `components/ui/DefinitionTermText.tsx` for single-label deeplinks
- `components/ui/DefinitionRichText.tsx` for inline auto-linked copy

This means the glossary problem is mostly a surface-coverage issue, not a missing feature from scratch.

### Existing Chart Metric Support

The chart setup route in `app/charts/index.tsx` already exposes metric choices through `metricOptions` and syncs them into route params.

The chart detail route in `app/charts/[chartKey].tsx` already accepts `metric` and passes it into `getChartDataset`.

The regression is that the detail page suppresses or bypasses metric switching on the rendered charts:

- charts such as line, bar, bump, consistency band, heatmap, and replay are rendered with a fixed `statKey`
- `Sparkline` and `StackedBarChart` already support metric switching internally, but the detail route disables those selectors

That makes the detail route metric-aware but not truly metric-adjustable.

## Website Glossary Design

### Canonical Page

`app/definitions.tsx` remains the only Definitions page on both app and web. The website should link to this route directly and continue to support deep links like:

- `/definitions`
- `/definitions?category=elo`
- `/definitions?metric=elo_current`

### Auto-Linking Strategy

Aggressive auto-linking should be implemented through `DefinitionRichText`, not by replacing `components/ui/Text.tsx`.

Reason:

- the repo already uses `DefinitionRichText` successfully on several analytics surfaces
- the base `Text` layer is also used by buttons, tabs, pressables, and dense controls where nested links would be brittle on React Native Web
- extending `DefinitionRichText` coverage gives the website broad hyperlinking on visible reading copy without destabilizing controls

### Target Surfaces

The rollout should focus on website-facing reading surfaces first:

- hero copy
- section titles and subtitles
- analytics and hub card text
- chart descriptions and helper copy
- metric-heavy narrative text
- glossary-backed labels that are currently rendered as plain `Text`

Controls that should stay plain:

- button labels
- segmented-control items
- search placeholders
- low-level tab chrome

### Access Points

The website should always have at least one obvious path to `/definitions` from high-level navigation or analytics surfaces. If the current Hubs entry is not sufficient on the website, add a more direct entry where users naturally look for help while browsing analytics.

## Chart Detail Metric Controls Design

### Shared Detail-Page Metric Rail

`app/charts/[chartKey].tsx` should render a compact metric-control section when the current chart has more than one metric option available from the dataset payload.

That shared rail should:

- read metric choices from `datasetData.metricOptions` and `datasetData.metricDataMap` when available
- fall back to route-driven or local chart data only when the server payload does not provide metric options
- treat the selected metric as route state by updating the `metric` param
- trigger the existing dataset query refresh through route-param changes

This keeps the detail page stateless from the chart component point of view and reuses the current server/local fallback behavior.

### Internal Chart Selectors

For charts that already support metric switching inside the component, the detail route should stop disabling those controls.

Specifically:

- `Sparkline` should receive metric options plus `activeMetricKey` / `onChangeMetric`
- `StackedBarChart` should receive metric options plus `activeMetricKey` / `onChangeMetric`, and should not have selectors forced off on the detail page

These controls should stay synchronized with the detail route `metric` param rather than managing a disconnected local metric choice.

### Fixed-Metric Charts

Some charts remain intentionally fixed-metric:

- `prestige_over_time`
- `radar`
- `relationship_graph`
- `head_to_head`
- `rivalry_graph`
- `elo`

Those charts do not need the shared metric rail unless the payload actually exposes more than one metric option for them.

### Multi-Metric Charts

Charts that should expose metric changes on the detail page when options exist:

- `line_chart`
- `multi_line_chart`
- `sparkline`
- `bar_chart`
- `bump_chart`
- `consistency_band`
- `heatmap`
- `replay_chart`
- `stacked_bar_chart`

The detail route should treat those as metric-adjustable by default.

## Routing And State Rules

- The detail page remains route-driven.
- `metric` is the source of truth for the selected metric.
- `router.setParams` or equivalent detail-route updates should keep the current chart page in place while swapping metrics.
- Existing `Back to Adjust`, `Back to Charts`, and `Command` actions stay intact.
- The detail route should not fork into a separate setup-only state model.

## Testing Strategy

Add focused regression coverage for:

- web-facing Definitions access points
- broader `DefinitionRichText` coverage on website reading surfaces
- detail-route metric control rendering when a chart has metric options
- route-param updates when a detail metric is changed
- `Sparkline` and `StackedBarChart` detail wiring no longer suppressing metric selectors
- multi-metric chart detail pages continuing to pass the selected metric into the correct chart component props

Preferred test style:

- narrow source assertions in `scripts/*.test.cjs`
- keep tests focused on route wiring, component props, and visible control seams rather than broad snapshot-style checks

## Risks And Mitigations

### Risk: Over-linking controls or nested pressables

If auto-linking moves into the base `Text` layer, buttons and tabs may become unstable on web.

Mitigation:

- keep auto-linking in `DefinitionRichText`
- expand coverage at the component/surface level, not globally

### Risk: Detail-page metric controls drift from setup-route state

If the detail page manages metrics locally without updating the route, browser refresh and shareable URLs will break.

Mitigation:

- keep `metric` in the route params as the source of truth
- drive chart queries from that route state

### Risk: Mixed server/local fallback behavior loses metric options

Some fallback paths may not have server-authored metric option lists.

Mitigation:

- show the shared metric rail only when multiple metric options truly exist
- preserve fixed-metric rendering when option data is unavailable

## Rollout Recommendation

Implement this as one coordinated web polish slice:

1. restore chart detail metric controls first, because that is an active website regression
2. expand glossary auto-linking coverage through `DefinitionRichText`
3. verify a reachable Definitions entry remains visible on the website
4. run focused script coverage for both glossary and chart-detail behavior
