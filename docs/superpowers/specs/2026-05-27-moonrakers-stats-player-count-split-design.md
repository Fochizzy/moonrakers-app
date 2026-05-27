# Moonrakers Stats Player Count Split Design

Date: 2026-05-27

## Summary

This design updates the live Moonrakers `Stats` screen so table-size guidance no longer collapses two-player and multiplayer results into one shared recommendation.

The change should:

- keep exact `2-player` data separate from `3+ players` data,
- surface separate quick reads in the `Overview` tab,
- show matching grouped evidence in the `Games` tab,
- reuse the existing Supabase-authored `groupMeta.playerCountSplit` payload instead of introducing a new analytics source.

## Goals

- Separate `2-player` and `3+ players` table-size suggestions on the live `Stats` screen.
- Keep the recommendation tied to visible evidence instead of a single unsupported summary pill.
- Reuse the existing server-authored payload already published to the route.
- Keep the implementation local to the current `Stats` display layer and tests.

## Non-Goals

- No Supabase schema change.
- No new RPC or rollup contract.
- No rewrite of the existing flat game-history rows.
- No new top-level tab or analytics route.
- No attempt to produce a recommendation when a bucket has no usable sample.

## Current State

The current `Stats` route already receives `groupMeta.playerCountSplit` from Supabase, where each row describes one exact table size with fields such as:

- `playerCount`
- `games`
- `wins`
- `winRate`
- `avgPrestige`
- `avgAssists`
- `avgFailures`

The route currently uses only one compressed suggestion in `Overview -> Group Meta`:

- `Best table size`

That single pill hides the difference between exact `2-player` results and larger-table results. The `Games` tab also renders only a flat chronological list of recent game rows, so the user cannot quickly inspect the supporting table-size evidence on-screen.

## Approved Approach

Use a hybrid display change:

1. Split the quick recommendation in `Overview`
2. Add grouped `2-player` and `3+ players` evidence in `Games`

This gives the user both the recommendation and the supporting summary without changing the backend contract.

## Data Design

### Source

Use `payload.groupMeta.playerCountSplit` as the source of truth.

### Buckets

Map the published rows into two display buckets:

- `2-player`: rows where `playerCount === 2`
- `3+ players`: all rows where `playerCount >= 3`

### Aggregation rules for `3+ players`

When multiple exact table sizes exist inside the `3+ players` bucket, aggregate them into one summary using weighted totals:

- `games`: sum of games
- `wins`: sum of wins
- `winRate`: `wins / games`
- `avgPrestige`: weighted by games
- `avgAssists`: weighted by games
- `avgFailures`: weighted by games

The display layer should preserve the exact counts used to build the summary so the UI can describe sample size honestly.

### Thin-data behavior

- If only one bucket has usable data, show only that bucket.
- If neither bucket has usable data, render nothing new.
- Do not invent a recommendation for a missing bucket.
- Do not label a bucket as "best" when there is no backing sample.

## UI Design

### Overview tab

Replace the single `Best table size` pill inside `Group Meta` with two bucketed reads:

- `2-player`
- `3+ players`

Each read should prioritize fast interpretation over raw density.

Recommended content shape:

- main value: win rate for that bucket
- detail line: games tracked plus one or two supporting stats such as average prestige

If both buckets are present, the user should be able to compare them side by side immediately. The surrounding `Avg prestige spread` and `Chaos index` pills should remain unchanged.

### Games tab

Keep the existing recent game rows, but add a grouped table-size summary above them.

Recommended section order:

1. `By Table Size`
2. existing recent game list

The grouped summary should show one card per bucket:

- `2-player`
- `3+ players`

Each card should include:

- games
- wins
- win rate
- average prestige
- average assists
- average failures

This gives the recommendation visible support without forcing the user to infer it from individual game rows.

## Implementation Shape

### Display helpers

Add a small normalization layer in `lib/cloud/analytics/statsScreenDisplay.ts` that:

- reads raw `playerCountSplit` rows,
- groups them into `2-player` and `3+ players`,
- returns display-ready summary rows for `Overview` and `Games`.

This keeps aggregation logic out of `app/stats.tsx` and matches the current direction already used for correlation rows and game rows.

### Route wiring

Update `app/stats.tsx` to:

- normalize `groupMeta.playerCountSplit`,
- render split `Group Meta` table-size reads in `Overview`,
- render grouped table-size evidence in `Games` above the existing flat list.

### Existing in-flight work

The repo already has live edits on this branch adding display normalization for correlation rows and game rows. This design should extend that same pattern rather than introducing a second display-mapping style.

## Testing

Extend the current stats display helper test coverage to include:

- exact `2-player` rows staying isolated,
- `3-player`, `4-player`, and `5-player` rows collapsing into one `3+ players` summary,
- weighted win-rate and average calculations for the aggregated bucket,
- single-bucket payloads,
- empty payload behavior.

The goal is to verify the display transformation directly without needing a full app runtime.

## Success Criteria

This change is successful if:

- the `Overview` tab no longer compresses all table sizes into one combined suggestion,
- the user can compare `2-player` and `3+ players` guidance at a glance,
- the `Games` tab shows matching grouped evidence for those same buckets,
- the implementation reuses the existing Supabase payload and does not require a backend change.
