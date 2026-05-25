# Moonrakers Focused Analytics Finish Design

Date: 2026-05-25
Status: Approved for implementation
Owner: Codex

## Summary

This design finishes the remaining visible analytics migration work by moving the Home leaderboard tab and the dedicated ELO screen onto a server-authored Supabase payload while preserving the current richer ELO breakdown UI.

The existing analytics migration is already in place for the analytics hub, stats screen, insights screen, and chart routes. The remaining gap is that `app/index.tsx` still derives leaderboard values locally from `calculateElo(...)`, and `app/elo.tsx` still derives its leaderboard, summary cards, context splits, and insights locally from store-backed game data.

## Goals

- Make Supabase the source of truth for the Home leaderboard and ELO screen.
- Preserve the current rich ELO UI: player search, opponent context filter, leaderboard rail, top cards, section cards, and insight copy.
- Keep Home and the ELO screen aligned to the same current ELO ordering and summary numbers.
- Add a dedicated contract instead of overloading the chart dataset RPC with screen-only semantics.

## Non-Goals

- Reworking the broader charts contract.
- Redesigning the ELO screen layout.
- Cleaning up unrelated local analytics helpers in this batch.
- Refactoring the entire Home screen or ELO screen into smaller files as part of this pass.

## Current Gap

- `app/index.tsx` computes the inline leaderboard locally with `calculateElo(...)` and local aggregate math.
- `app/elo.tsx` computes `eloMap`, per-player rows, section cards, and active insights locally.
- The current server-authored analytics contract includes chart setup options for `elo`, but the SQL payload for `get_chart_dataset('elo', ...)` remains placeholder-shaped and does not author the richer ELO screen breakdowns.

## Recommended Approach

Add a dedicated Supabase ELO screen contract and reuse it for both visible surfaces.

### Supabase

Create a new migration that adds:

- `private.get_elo_screen_payload(...)`
- `public.get_elo_screen(profile_id uuid default auth.uid(), focus_player_id uuid default null, opponent_id uuid default null, sort_key text default 'elo')`

The server payload should author:

- `generatedAt`
- `playerOptions`
- `selectedPlayerId`
- `selectedOpponentId`
- `leaderboardRows`
- `summary`
- `topCards`
- `sections`
- `insight`
- `emptyState`

The SQL layer should compute the same semantics the screen currently exposes:

- current ELO
- peak ELO
- confidence
- recent form
- wins and losses
- filtered opponent context metrics
- sort-aware leaderboard rows

### Client

Add a wrapper under `lib/cloud/analytics/getEloScreen.ts` and a matching payload type in `lib/cloud/analytics/types.ts`.

### Home

Replace the local inline leaderboard derivation in `HomeLeaderboardTab` with the server-authored ELO payload. The UI stays local; the ranking and displayed metrics come from Supabase.

### ELO Screen

Replace local `calculateElo(...)`, `rowsByPlayer`, and section-card derivation with the server-authored ELO payload. The screen keeps local UI state for:

- active tab
- player search
- selected player
- selected opponent

but no longer computes analytics meaning locally.

## Verification

This batch should prove:

- the new migration defines and grants the ELO screen RPC
- the client wrapper forwards `profileId`, `focusPlayerId`, `opponentId`, and `sortKey`
- `app/index.tsx` stops deriving leaderboard analytics locally
- `app/elo.tsx` stops importing or using `calculateElo(...)`
- Home and ELO both consume the same server-authored payload shape
