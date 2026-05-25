# Moonrakers Broad Polish Wave Design

## Goal

Ship one coordinated cleanup and polish pass across the older game-flow and player-facing surfaces so the app feels more unified, the player-card ELO path is less likely to drift from the newer analytics work, and the repo is easier to verify safely.

## Scope

This batch covers seven linked improvements:

1. Move the remaining older game/player routes toward the shared `PageShell` / `HeroCard` / `SectionCard` system where it is low-risk to do so.
2. Upgrade the full player profile route to use the shared shell so it no longer feels like a separate visual system.
3. Replace direct `calculateElo(...)` usage on player-card surfaces with one canonical helper path.
4. Push definitions links into older meaning-heavy player and summary surfaces.
5. Remove obviously stale local traps such as `app/PlayerProfileScreen.tsx` and the redundant `utils/number.ts`.
6. Add top-level verification scripts in `package.json`.
7. Extract a small number of focused helpers while touching the biggest routes so new polish does not add more monolithic logic.

## Design

### Shared Shell Sweep

The strongest visual-system wins are the routes that still render their own background, hero, and section stack even though the rest of the app already shares those patterns. This pass upgrades:

- `app/add-players.tsx`
- `app/player-cards.tsx`
- `app/summary.tsx`
- `app/player-profile/[playerId].tsx`

The goal is not to flatten each screen into the exact same layout. We keep route-specific behavior, sticky regions, and custom card content where needed. The shared shell work only standardizes the surrounding frame, hero language, and section rhythm.

`app/game.tsx` stays intentionally custom for now because its sticky turn-entry flow is tightly coupled to the current full-screen interaction model. This batch improves its maintainability through small extraction only, rather than forcing it into the same shell prematurely.

### Player-Card ELO Source Cleanup

`app/player-cards.tsx` and `components/ColorPlayerCard.tsx` still import `calculateElo(...)` directly. This creates two separate fallback rating paths outside the newer server-fed leaderboard work.

This batch introduces a single helper module for player-card rating resolution. The helper is responsible for:

- building a safe fallback ELO map from store games
- normalizing the fallback shape consumed by player-card surfaces
- keeping all direct `calculateElo(...)` usage out of route/components

This does not fully convert player cards to an async server-fed model yet, but it removes duplicated local derivation and creates one canonical upgrade point for a later server-backed pass.

### Definitions Push

Older player-card and summary surfaces already present metrics and outcomes that benefit from definitions but do not consistently offer them. This batch adds targeted `DefinitionsJumpLink` affordances on:

- player-card ranking/summary areas
- game summary overview/highlight areas

The links should be additive and quiet, not overwhelming.

### Cleanup and Verification

The stale `app/PlayerProfileScreen.tsx` file with the visible placeholder text and the redundant `utils/number.ts` helper are removed once verified unused. `package.json` grows a small verification layer so the repo has stable entrypoints for:

- `lint`
- `typecheck`
- `test:analytics`
- `test:ui`

The focused suites can be implemented through a small script runner so they stay easy to extend without bloating `package.json`.

## Testing Strategy

Add focused source guards before implementation for:

- shared-shell adoption on the targeted older routes
- player-card ELO helper centralization
- top-level verification scripts
- removal of the stale profile stub and redundant number helper

Then re-run the existing analytics/shared-state/playstyle guards plus full TypeScript verification.
