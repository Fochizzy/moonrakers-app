# Moonrakers Server-Authored Analytics Design

Date: 2026-05-23
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will move all graphs, charts, and statistics onto a server-authored analytics pipeline in Supabase.

This is stricter than the current cloud-backed store model. Supabase will not only store the raw games. It will also own the analytics computation and return chart-ready and stats-ready payloads through rollups and RPCs. The React Native app will stop deriving analytics datasets from in-memory `players`, `games`, `groups`, or chart helper pipelines, and will instead render analytics payloads fetched from Supabase.

The gameplay and history layers can continue to use shared cloud-backed game records, but any screen whose job is to show statistics, insights, rankings, correlations, or chart datasets must consume server-authored analytics responses.

## Confirmed Product Decisions

- All graphs, charts, and statistics must come from Supabase-authored analytics outputs.
- Client-side analytics derivation is no longer acceptable for those surfaces.
- The stricter rule applies even when the raw data already came from Supabase.
- The client may still render and format server-returned analytics data.
- History and gameplay flows may continue to read canonical shared game records directly, as long as analytics surfaces do not derive their own chart or stats datasets from them.
- Imported legacy games must participate in the same server-authored analytics pipeline once they are written into Supabase.

## Goals

- Make Supabase the source of truth for analytics computation, not just analytics storage.
- Remove client-side derivation from chart, graph, and stats screens.
- Ensure imported games and newly completed games feed the same analytics model.
- Keep screen behavior and visual polish stable while replacing the data source underneath.
- Make analytics payloads explicit, typed, testable, and refreshable.

## Non-Goals

- Rewriting live gameplay state around server-rendered turns.
- Replacing the local in-memory store for all app behavior.
- Rebuilding the visual chart components unless the server contract requires small prop changes.
- Solving unrelated history, roster, or profile UX issues during this migration.
- Shipping a temporary mixed analytics model where some charts still derive locally.

## Current Architecture Context

The current app already hydrates shared game data from Supabase in [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx), [lib/cloud/loadCloudSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/loadCloudSnapshot.ts), and [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts). That means authenticated users already receive cloud-backed `players`, `groups`, `games`, and a lightweight `statsSnapshot`.

However, the current analytics screens still derive most of their own datasets on-device:

- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx)
  - builds leaderboard, league summary, correlations, selectable games, and player analytics locally.
- [app/insights.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/insights.tsx)
  - computes unified games, relationship graphs, global meta cards, and top insights locally.
- [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx)
  - uses local counts for analytics hub stats.
- [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/[chartKey].tsx)
  - builds route-level datasets for line charts, replay charts, radar charts, relationship graphs, stacked metrics, and comparison scopes from store data.
- [app/charts/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/index.tsx)
  - configures chart routing from local player scope and local metric assumptions.

The core client-side analytics derivation helpers currently include:

- [utils/analyticsPlayers.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/analyticsPlayers.ts)
- [utils/charts/index.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/charts/index.ts)
- [utils/statsEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/statsEngine.ts)
- [utils/derivedMetricsEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/derivedMetricsEngine.ts)
- [utils/correlationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/correlationEngine.ts)
- [utils/individualCorrelationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/individualCorrelationEngine.ts)
- [utils/gameCorrelationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/gameCorrelationEngine.ts)

The current Supabase rollup layer is not yet rich enough for the stricter requirement. In [supabase/migrations/20260422224000_moonrakers_rollups_and_save_completed_game.sql](C:/Users/izzyh/Desktop/moonrakers-app/supabase/migrations/20260422224000_moonrakers_rollups_and_save_completed_game.sql), the global and group rollups currently store only high-level counts such as `gamesPlayed`, `playersRegistered`, and `lastGameId`.

## Recommended Architecture

### Core Direction

Adopt a server-authored analytics boundary with two layers:

- `Persistent analytics rollups`
  - Small, frequently reused summary payloads stored in tables for fast reads.
- `Analytics RPCs`
  - Screen-level or chart-level functions that compute and return typed JSON payloads directly from canonical database records.

The app will fetch analytics datasets from Supabase through dedicated client wrappers and will render those results without rebuilding the analytics math locally.

### Why This Split

This split avoids two bad extremes:

- a giant monolithic analytics snapshot that becomes expensive to refresh and awkward to version,
- or a separate table or view for every chart, which would create too much schema sprawl.

The rollup layer handles small shared summary surfaces. The RPC layer handles chart-ready and screen-ready datasets that depend on filters, focus players, or selected scopes.

## Supabase Analytics Model

### Canonical Source Records

The analytics layer must derive only from canonical saved data in Supabase:

- `games`
- `game_participants`
- `game_rounds`
- `groups`
- `group_members`
- `profiles`

No analytics contract should depend on client-only fields or local cache state.

### Rollup Tables

Keep and expand the existing rollup tables:

- `public.global_stats_rollups`
- `public.group_stats_rollups`

Add a new per-user analytics rollup table:

- `public.personal_stats_rollups`
  - keyed by `profile_id`
  - stores fast-read summary payloads for the signed-in user's personal stats home surfaces

Rollups should store compact summary payloads only, such as:

- overview totals,
- last-updated markers,
- leaderboard highlights,
- player-count and game-count cards,
- screen-level summary chips that do not need route-specific filtering.

They should not try to embed every chart series for every possible scope.

### RPC Layer

Add server functions that return chart-ready or stats-ready JSON.

Recommended first-wave RPCs:

- `public.get_analytics_home(profile_id uuid default auth.uid())`
  - returns analytics hub cards, hero counts, and high-level takeaways.
- `public.get_stats_screen(profile_id uuid default auth.uid())`
  - returns overview cards, ranked player list, player detail panels, playstyle payloads, game-level stat summaries, and correlation sections.
- `public.get_insights_screen(profile_id uuid default auth.uid())`
  - returns global meta cards, top signals, relationship summary cards, and correlation datasets.
- `public.get_chart_dataset(chart_key text, profile_id uuid default auth.uid(), focus_player_id uuid default null, compare_player_id uuid default null, scoped_player_ids uuid[] default null, selected_game_id uuid default null, metric_key text default null, line_mode text default null, graph_mode text default null, opponent_id uuid default null)`
  - returns a chart-specific dataset already shaped for the requested route.

These RPCs may internally call private helper functions, but the public contract should stay small and stable.

## Client Architecture

### New Client Boundaries

Add a dedicated analytics fetch layer, for example:

- `lib/cloud/analytics/getAnalyticsHome.ts`
- `lib/cloud/analytics/getStatsScreen.ts`
- `lib/cloud/analytics/getInsightsScreen.ts`
- `lib/cloud/analytics/getChartDataset.ts`
- `lib/cloud/analytics/types.ts`

These wrappers should:

- call the new Supabase RPCs or rollup tables,
- normalize payloads only for transport safety,
- not derive any new analytics meaning.

### Screen Responsibilities

#### Analytics Hub

[app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx) should stop counting `players.length` and `games.length` from the local store for the hero stats. Instead it should fetch a Supabase-authored home payload and render those values directly.

#### Stats Screen

[app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) should stop calling:

- `buildAnalyticsPlayerDirectory(...)`
- `buildLeaderboard(...)`
- `buildLeagueSummary(...)`
- `buildDerivedPlayerStats(...)`
- `buildGlobalCorrelations(...)`
- `buildIndividualCorrelations(...)`
- `buildGameCorrelations(...)`

Instead it should render a typed payload returned by `get_stats_screen(...)`.

#### Insights Screen

[app/insights.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/insights.tsx) should stop building:

- `collectUnifiedGames(...)`
- `canonicalizeGames(...)`
- `buildRelationships(...)`
- local top-signal aggregations

Instead it should render `get_insights_screen(...)`.

#### Chart Detail Screen

[app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/[chartKey].tsx) should stop building per-route chart datasets from the store. It may still own route parsing and chart selection, but it must fetch chart-ready data from `get_chart_dataset(...)`.

The individual chart components can remain mostly intact if the new payloads match the props they already expect. When a chart currently expects snapshots or relationships, Supabase should return that shape explicitly rather than asking the client to reconstruct it.

#### Chart Setup Screen

[app/charts/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/index.tsx) may continue to own setup state such as selected player, metric, and line mode. Its responsibility is route configuration, not analytics computation.

## Data Contract Direction

### Contract Principles

Every analytics response should:

- be fully renderable without running analytics engines in the client,
- include only the fields the screen needs,
- include a `generatedAt` timestamp,
- include clear empty-state semantics,
- avoid requiring the client to merge local and remote analytics fragments.

### Example Stats Contract Shape

```ts
type StatsScreenPayload = {
  generatedAt: string;
  overview: {
    hero: {
      players: number;
      games: number;
      takeaway: string;
    };
    cards: Array<{
      key: string;
      label: string;
      value: string | number;
      accent?: string;
      metricKey?: string;
    }>;
    topSignals: Array<{
      key: string;
      label: string;
      value: number;
      strength: string;
      tone: string;
      meaning: string;
    }>;
  };
  players: {
    options: Array<{
      id: string;
      name: string;
      color?: string | null;
      assignedCardArtIndex?: number | null;
    }>;
    selectedPlayerId: string | null;
    detail: Record<string, unknown> | null;
  };
  playstyle: Record<string, unknown>;
  correlations: Record<string, unknown>;
  games: Record<string, unknown>;
};
```

Field names may be refined during implementation, but the contract must remain analytics-complete when it reaches the app.

### Example Chart Contract Shape

```ts
type ChartDatasetPayload = {
  chartKey: string;
  generatedAt: string;
  title?: string;
  subtitle?: string;
  emptyState?: {
    title: string;
    subtitle?: string;
  } | null;
  data: Record<string, unknown>;
};
```

For example:

- line charts should receive final series and labels,
- replay charts should receive final replay points,
- radar charts should receive normalized stat polygons,
- relationship graphs should receive final nodes and edges,
- stacked bar charts should receive grouped rows and segment values,
- comparison charts should receive already-filtered matchup datasets.

## Refresh And Write Model

### Completed Game Save

The existing save path in [lib/game-save/saveCompletedGame.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/game-save/saveCompletedGame.ts) already routes finished games through `save_completed_game(...)`.

That backend flow should expand so that a successful save also refreshes the analytics artifacts needed by:

- personal rollups,
- group rollups,
- global rollups,
- chart/query RPC sources if they depend on materialized helper tables.

The client should then refetch the analytics payloads rather than recomputing them locally.

### Legacy Import

The existing legacy import path already calls `refresh_rollups_after_legacy_import(...)`. That refresh behavior must expand to cover the richer analytics model as well. Imported games should become visible in charts and stats only through the same Supabase analytics contracts used for newly completed games.

### Realtime And Foreground Refresh

The current shared snapshot refresh in [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx) can remain for base game/group data, but analytics screens should also support refetching their own server-authored payloads when:

- the user returns to the screen,
- a relevant game save completes,
- a legacy import completes,
- or a shared group update affects the visible analytics scope.

## Client State Rules

### Allowed Client Work

The client may still:

- parse route params,
- manage tabs and selected players,
- choose which RPC to call,
- cache fetched analytics payloads in memory,
- format numbers and labels for display,
- show loading, error, and empty states.

### Forbidden Client Work

The client should no longer:

- calculate leaderboard rankings from local game arrays for stats screens,
- build chart snapshots from raw totals for analytics routes,
- derive relationship graphs from raw game rows on analytics screens,
- compute correlations for analytics surfaces,
- reconstruct replay analytics from local rounds for chart surfaces,
- merge local raw game state into analytics payloads.

## Error Handling

- If an analytics RPC fails, the screen should show a screen-specific error state and never silently fall back to local analytics derivation.
- If the user has no eligible analytics data yet, the RPC should return an explicit empty-state payload rather than forcing the client to guess.
- If a requested chart filter is invalid, Supabase should return a clean empty dataset or validation error instead of partial malformed data.
- If a rollup is stale or missing, the client may retry or refresh, but it must not fill the gap by recomputing analytics locally.

## Security And Access Model

Analytics reads must respect the app's Supabase access model:

- personal stats may expose the signed-in user's own personal analytics,
- global stats may expose authenticated aggregate analytics,
- group stats may expose only data for groups the signed-in user can read,
- chart RPCs must validate that requested focus players, compare players, selected games, and group scopes are visible to the current authenticated profile.

Any helper functions that use privileged access should live in private schemas and return only safe aggregated data to public callers.

## Testing Strategy

### Database-Level Tests

Add contract-focused verification for:

- `get_analytics_home(...)`
- `get_stats_screen(...)`
- `get_insights_screen(...)`
- `get_chart_dataset(...)`
- rollup refresh after `save_completed_game(...)`
- rollup refresh after `refresh_rollups_after_legacy_import(...)`

These tests should verify:

- payload shape,
- access control,
- imported-game inclusion,
- empty-state behavior,
- and chart-filter correctness.

### Client Tests

Update route-level tests so analytics screens validate:

- they fetch the right RPC payload,
- they render server-returned values,
- they do not require local derivation helpers,
- they handle loading, empty, and error states correctly.

Existing chart regression tests can stay valuable, but their focus should shift from local derivation correctness toward payload consumption correctness.

### Verification Commands

Implementation completion should include:

- Supabase-side verification of the new functions and rollups,
- targeted app tests around analytics routes,
- TypeScript verification for the new analytics client wrappers,
- and a regression pass proving the touched screens no longer import the retired local analytics engines.

## Risks And Mitigations

- Risk: screen contracts become too large and hard to evolve.
  - Mitigation: keep one payload per screen or chart route, not one universal analytics blob.

- Risk: some chart components require data shapes that are awkward to generate server-side.
  - Mitigation: preserve the current prop contracts where practical and make Supabase emit those shapes directly.

- Risk: the app accidentally reintroduces local derivation through convenience helpers.
  - Mitigation: add tests and import-usage checks for the analytics routes.

- Risk: rollups become stale after imports or completed games.
  - Mitigation: tie analytics refresh into the existing save and import backend workflows.

- Risk: scope-filtered charts become expensive if every request recomputes everything.
  - Mitigation: reserve rollups for reusable summaries and use narrower RPCs for route-specific datasets.

## Recommended Implementation Phases

1. Expand Supabase schema and server functions for personal, global, group, and chart analytics contracts.
2. Add typed analytics fetch wrappers under `lib/cloud/analytics/*`.
3. Rewire [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx) to server-authored hub payloads.
4. Rewire [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) to a server-authored stats payload.
5. Rewire [app/insights.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/insights.tsx) to a server-authored insights payload.
6. Rewire [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/[chartKey].tsx) to chart RPC payloads and remove local dataset derivation from analytics routes.
7. Retire or isolate client-side analytics helpers so they no longer back any graph, chart, or stats surface.

## Rollout Outcome

When complete, Moonrakers analytics will no longer be "cloud-backed but locally computed." The app will render Supabase-authored analytics outputs end to end, which means graphs, charts, and statistics will all derive their data from Supabase in the strict sense you requested.
