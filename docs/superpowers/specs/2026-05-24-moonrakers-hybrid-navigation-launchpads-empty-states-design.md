# Moonrakers Hybrid Navigation, Launchpads, And State-Aware Empty States Design

Date: 2026-05-24
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will reduce the number of hops between the Command Center and the app's most-used destinations without flattening the product into a generic menu wall.

The approved direction is a hybrid navigation model:

- keep the three existing Home tabs,
- keep `Hubs` as an exploration surface,
- remove the need to route through the extra `Data` and `Players` bridge stops for common tasks,
- promote a compact `Quick Launch` block onto the default Home `Game` tab.

This design also upgrades three related surfaces so the new navigation actually feels useful:

- `Saved groups` in profile management become searchable and sortable, with `Most Played` as the default ranking.
- the player profile becomes a launchpad with one-tap actions such as `Compare with...`, `Open charts`, and `Recent games`.
- analytics empty states become state-aware, so the next action changes based on whether the account is missing players, missing games, or only missing player-specific detail.

## Confirmed Product Decisions

- Use the hybrid navigation approach rather than aggressive flattening or conservative polish only.
- Promote `Compare`, `Charts`, `Profiles`, and `History` as the Home quick-launch destinations.
- Place those shortcuts in a `Quick Launch` block on the Home `Game` tab.
- Keep `Hubs`, but remove the need to go through the extra `Data` and `Players` bridge screens for the common paths.
- Keep `Stats`, `Insights`, and `ELO` as deeper analytics destinations rather than primary Home shortcuts.
- Default `Saved groups` sorting to `Most Played`.
- Add sort overrides for `Recent` and `A-Z`.
- When `Compare with...` is tapped from a player profile, open the compare route with the current player already locked as the focus and let the user choose the rival there.
- Empty-state CTAs must be state-aware rather than always showing the same button set.
- If the account has no usable players yet, the primary empty-state CTA is `Open roster` and the secondary CTA is `Profiles`.
- If players exist but there are no tracked games yet, the primary empty-state CTA is `Start tracked game` and the secondary CTA is `Import backup`.
- If a player-specific analytics tab is empty but league data exists elsewhere, the CTA set should narrow to route-local recovery actions such as `Choose another player` or `Open charts`.
- True error states must stay diagnostic and must not be replaced by optimistic setup CTAs.
- `Import backup` must land on a real visible route, which in this design is `History`.

## Goals

- Reduce friction between the Command Center and the most valuable destinations.
- Preserve the Command Center's identity as a game-first control surface instead of turning it into a route directory.
- Make saved groups feel intelligent and history-aware rather than alphabetized storage.
- Turn player profiles into action-oriented surfaces instead of read-only analytics pages.
- Make empty analytics states honest, actionable, and sensitive to the user's real account state.
- Reuse existing game-history and routing signals where possible instead of inventing disconnected ranking logic.

## Non-Goals

- Removing the `Hubs` tab entirely.
- Promoting every analytics destination to Home.
- Rebuilding analytics contracts or changing Supabase as part of this pass.
- Rewriting compare, charts, or player profile calculations from scratch.
- Replacing current delete/import ownership semantics for shared groups or cloud-saved games.
- Implementing a brand-new dedicated import route in this same navigation pass.

## Current Architecture Context

The Home route in [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) already acts as the Command Center and is split into three tabs via `SegmentedControl`:

- `game`
- `leaderboard`
- `hubs`

The Home `Game` tab already owns the highest-frequency flows:

- starting a game,
- selecting players,
- loading saved groups,
- clearing selection,
- continuing an active game.

The `Hubs` tab currently acts as the entry point for broader discovery, but the route metadata in [utils/appHubs.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/appHubs.ts) still creates an extra bridge layer:

- `Data` leads to [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx), which then fans out into `Compare`, `Charts`, `Stats`, `ELO`, and `Insights`.
- `Players` leads to [app/players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/players.tsx), which then fans out into `Roster`, `Profiles`, and `Player Card`.

That bridge structure makes good sense for breadth, but it forces extra taps for routes the user already knows they want.

The saved-group management UI in [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) currently:

- sorts players alphabetically,
- sorts groups alphabetically,
- displays saved groups as a flat list with player avatars,
- does not expose a group search field,
- does not expose sort overrides,
- does not show usage or recency hints.

The Home screen already contains a stronger ranking signal for groups. In [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx), `rankedGroups` are derived from:

- direct `groupId` usage counts,
- recency timestamps,
- combo-use inference based on matching player sets.

That existing logic is the correct source of truth for `Most Played` behavior.

The player profile detail route in [app/player-profile/[playerId].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/[playerId].tsx) already contains:

- a searchable player switcher,
- tabbed profile breakdowns,
- opponent filtering for context matchups,
- metric cards,
- a `Recent Games` section,
- route-level access to the player id, game rows, and current opponent context.

It is therefore already close to being a launchpad; it just does not yet expose explicit action buttons.

Analytics empty states are partially in place today:

- [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx) has loading and error-aware hero copy, but no action row when the payload is effectively empty.
- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) has multiple empty cards and route-local empty messages, but they are informational rather than action-oriented.
- the app currently has import and backup helpers in `lib` and `utils`, but not a clearly visible dedicated import route under `app/`.

## Recommended Architecture

### Core Direction

Use a hybrid navigation model with four coordinated changes:

1. promote key routes directly from Home,
2. leave `Hubs` in place for breadth and discoverability,
3. reduce bridge dependence rather than deleting the hub system,
4. reinforce the promoted routes with stronger route-local action surfaces.

This is intentionally a layered product model:

- Home `Game` tab becomes the fast path,
- `Hubs` remains the browse path,
- destination routes become more action-oriented once opened.

### Why This Approach

The app already has a strong game-first identity in [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx). Completely flattening navigation would weaken that identity by crowding Home with too many equal-weight destinations. Leaving everything as-is would preserve hierarchy but not solve the extra-hop problem.

The hybrid model is the best fit because it:

- improves speed without erasing structure,
- keeps the default Home tab useful for setup and play,
- lets new users still discover the rest of the app through `Hubs`,
- avoids forcing an all-or-nothing route rewrite.

## Navigation Design

### Home Command Center

Add a compact `Quick Launch` block to the Home `Game` tab in [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx).

Recommended placement:

- below the main `Start Game` affordance,
- above the longer player and saved-group sections,
- visible without requiring the user to switch away from the default gameplay surface.

Recommended layout:

- a 2x2 compact action grid,
- consistent with the visual language of the existing `SectionCard` and action surfaces,
- same density family as the existing Home controls rather than large promo cards.

Quick Launch destinations:

- `Compare`
- `Charts`
- `Profiles`
- `History`

Recommended route mapping:

- `Compare` -> `APP_ROUTES.compare`
- `Charts` -> `APP_ROUTES.charts`
- `Profiles` -> `APP_ROUTES.playerDirectory`
- `History` -> `APP_ROUTES.history`

### Hubs And Bridge Reduction

Keep the `Hubs` tab, but shift its role from "required middle step" to "browse and discover".

Recommended behavior:

- the user can still reach analytics and player hubs through `Hubs`,
- the user no longer needs to depend on `Data` or `Players` bridge routes for the common journeys already promoted to Home,
- the app does not need to remove [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx) or [app/players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/players.tsx),
- those routes remain valid as richer category surfaces.

This means the product becomes flatter in practice without deleting the current organization outright.

### Route Consistency

The promoted routes should keep their current back-navigation and local identity.

Examples:

- analytics destinations can still include `Back to Command`,
- player profile and history keep their own local controls,
- Home remains the common recovery destination.

The design goal is to reduce route entry friction, not to collapse every surface into Home.

## Saved Groups Design

### Surface Scope

Apply the saved-group discovery improvements inside [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx), specifically in the `Saved groups` panel.

Do not merge `Create saved group` and `Saved groups` into one surface. Creation and browsing serve different intents and should remain visually distinct.

### Search Behavior

Add a `Search groups` input above the saved-group list.

Recommended match behavior:

1. group name match,
2. member name match,
3. no additional fuzzy logic in this pass.

This keeps search useful without expanding into an expensive ranking engine.

### Sorting

Add three sort chips:

- `Most Played`
- `Recent`
- `A-Z`

Default selected chip:

- `Most Played`

Recommended sort semantics:

- `Most Played`: sort by the same game-history-driven usage signal that Home already uses for group ranking.
- `Recent`: sort by the most recent known use timestamp, newest first.
- `A-Z`: sort alphabetically by normalized group name.

### Source Of Truth

Reuse the Home group ranking logic instead of inventing a new utility with different behavior.

Recommended shared inputs:

- existing groups array,
- saved games / cloud games,
- `groupId`,
- `groupName`,
- matching player-set inference where needed.

This ensures a group that rises to the top on the Command Center also rises to the top in profile management.

### Tiny Usage Hint

Each saved-group card should show a tiny secondary hint under the group name.

Recommended display order:

- `12 missions / last used May 24`
- fallback `12 missions`
- fallback `last used May 24`
- fallback `5 players`

The hint should stay compact and secondary so it improves scanning without turning the card into a metrics wall.

### Group Ownership And Delete Rules

Do not change shared-group deletion semantics in this pass.

Existing behavior stays:

- only eligible shared groups expose delete controls,
- shared-group delete still removes the group for all members,
- search and sort improvements do not alter permission behavior.

## Player Profile Launchpad Design

### Surface Placement

Add a compact `Quick Actions` block high on [app/player-profile/[playerId].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/[playerId].tsx).

Recommended placement:

- below the top identity and top-line metric summary,
- above the deeper tabbed analysis sections,
- before the route becomes long-scrolling and analytical.

That keeps the launchpad visible when the user arrives with intent rather than only after they scroll through metrics.

### Actions

The launchpad includes:

- `Compare with...`
- `Open charts`
- `Recent games`

### Compare Handoff

`Compare with...` opens the compare route with the current player already locked as the focus player.

Expected compare behavior:

- the current profile player is preselected,
- the compare route opens normally,
- the user chooses the rival there,
- no modal rival picker is required on the profile route itself.

This keeps the profile action quick and keeps compare selection logic inside the compare feature.

### Charts Handoff

`Open charts` should open the charts flow with the current player carried forward when the chart route can accept that context cleanly.

Preferred behavior:

- if chart setup already supports focused-player defaults, pass the current player id through,
- if the current chart route cannot fully honor scoped-player startup, still route to charts directly instead of blocking the action,
- avoid inventing a custom per-profile chart route in this pass.

### Recent Games Action

`Recent games` should jump or scroll to the existing `Recent Games` section inside the profile route.

Do not create a duplicate recent-games route for this action. The data and section already exist on the page, and the design goal is faster access, not route multiplication.

### Existing Profile Tools

Keep the current player search, tab system, and opponent filters intact.

The launchpad is additive:

- it does not replace current player switching,
- it does not remove the `Context Matchup` tools,
- it does not compress the profile into a shallow action menu.

The profile remains both a deep analysis route and a command surface for that player.

## State-Aware Empty States

### Core Rule

Empty states must reflect the user's current account state rather than always showing the same generic actions.

There are three approved healthy-empty scenarios:

1. no usable players,
2. players exist but no tracked games,
3. player-specific analytics empty while league-level data exists elsewhere.

True failure states remain separate.

### Scenario 1: No Usable Players

When the account has no usable players yet:

- primary CTA: `Open roster`
- secondary CTA: `Profiles`

Recommended use:

- analytics hub,
- stats overview,
- other broad analytics destinations that cannot do meaningful work without player entities.

### Scenario 2: Players Exist, But No Tracked Games

When players exist but there are no tracked games yet:

- primary CTA: `Start tracked game`
- secondary CTA: `Import backup`

This is the correct state for:

- newly set-up accounts,
- accounts that have finished profile setup and roster work but have not yet produced mission history,
- accounts restored without analytics-ready saved games.

### Scenario 3: Player-Specific Detail Missing, But League Data Exists

When the overall account has league data but the current player-specific view is empty:

- use route-local actions such as `Choose another player`
- or `Open charts`
- or an equivalent player-aware fallback

Do not send the user back to roster or setup in this scenario, because setup is not actually the issue.

This rule is especially important for:

- player tabs in [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx),
- profile-level analytics blocks,
- routes where a chosen player has no qualifying data but the league does.

### Failure States

If the screen is empty because of:

- Supabase auth issues,
- missing configuration,
- fetch errors,
- analytics contract failures,

then preserve the existing diagnostic copy.

Do not show optimistic setup CTAs in place of genuine error handling.

### Shared Visual Pattern

Use one consistent compact action-row or action-card pattern for healthy-empty states across analytics surfaces.

Recommended behavior:

- message explains why the screen is empty,
- button group offers the next step,
- the component can swap button sets based on screen state,
- the same component or pattern is reused by analytics hub and stats first.

This teaches the user that blank-but-healthy screens are recoverable and intentional.

## History As The Backup / Import Landing Surface

Because there is no dedicated visible import route under `app/` today, `Import backup` should route to [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx).

This design requires `History` to expose a visible backup/import entry point, because the CTA must land on a real user-facing surface rather than a hidden helper path.

Recommended responsibility split:

- analytics empty-state CTA -> route to `History`
- `History` -> visible entry point for backup/import actions
- import helpers in `lib/migration` and `utils` remain the underlying implementation paths

This keeps the CTA honest and aligns import/export with the archive/history mental model already present in the product.

## Data Flow

### Quick Launch

Home `Game` tab quick-launch buttons read no new backend data. They are pure route shortcuts layered on top of current route definitions in [utils/appRoutes.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/appRoutes.ts).

### Saved Groups

Saved-group ranking should consume:

- groups from store state,
- completed games from store state,
- the same usage and recency derivation logic already proven on Home.

Preferred flow:

1. derive usage metadata once from games,
2. merge that metadata into saved-group display rows,
3. filter by search query,
4. sort by selected chip.

### Player Profile Launchpad

The profile launchpad consumes:

- current `playerId` route param,
- router,
- current profile-level player context already resolved by the screen.

No new remote call is required. The work is orchestration and routing, not data acquisition.

### Empty-State Decisions

Healthy-empty CTA selection should derive from already-available local or hydrated state:

- whether usable players exist,
- whether any tracked games exist,
- whether player-specific selectors have options,
- whether league-level analytics data exists,
- whether the screen is in `loading` or `error`.

The key design rule is that CTA choice must be deterministic from current screen state, not from brittle copy parsing.

## Error Handling

### Navigation

If a quick-launch destination cannot accept ideal scoped params, still open the base destination rather than failing the action.

Example:

- `Open charts` should still open charts even if scoped-player setup cannot be prefilled perfectly.

### Groups

If game-history metadata is incomplete for a group:

- continue showing the group,
- degrade the hint text,
- fall back to `A-Z` data when necessary,
- do not hide the group only because usage metadata is missing.

### Player Profile

If a selected player has no recent games:

- keep the profile shell,
- keep the launchpad,
- let `Recent games` land on the existing empty section,
- do not suppress action affordances just because a subsection is sparse.

### Analytics

If an analytics route is in an error state:

- show the current error copy,
- do not swap into healthy-empty action mode,
- preserve trust by distinguishing "no data yet" from "data load failed".

## Testing Strategy

### Navigation Tests

Add focused tests for:

- Home `Quick Launch` block rendering on the `Game` tab,
- shortcut routing for `Compare`, `Charts`, `Profiles`, and `History`,
- no regression to existing `Start Game`, player selection, or group selection flows.

### Groups Tests

Add tests for:

- default `Most Played` ordering,
- `Recent` ordering,
- `A-Z` ordering,
- group-name search,
- member-name search,
- usage-hint rendering when missions and recency exist,
- fallback hint rendering when usage data is absent.

### Profile Tests

Add tests for:

- `Compare with...` opening compare with the current player preselected,
- `Open charts` route handoff,
- `Recent games` launchpad behavior,
- no regression to current player switching and opponent filtering.

### Empty-State Tests

Add tests for:

- no-player CTA set,
- players-with-no-games CTA set,
- player-specific-empty CTA set when league data exists,
- diagnostics preserved for true error states,
- `Import backup` routing to `History`.

### Regression Focus

Prioritize small route-focused tests and plain Node route/JSX assertions where possible, consistent with the current repo's script-based regression style.

This pass changes navigation affordances and decision logic, so the main risk is not heavy rendering failure; it is silent routing or state-branch regressions.

## Implementation Notes For Planning

Planning should treat this as four coordinated but separable workstreams:

1. Home quick-launch block and bridge reduction follow-through,
2. saved-group search/sort/hints,
3. player profile launchpad,
4. state-aware analytics empty states plus History import entry point.

Recommended plan order:

1. implement and verify Home quick-launch block,
2. implement and verify saved-group search/sort/hints,
3. implement and verify player profile launchpad,
4. implement and verify state-aware empty states and History import landing,
5. run cross-route regression checks for navigation consistency.

This order gives the product faster wins early while saving the more state-branch-heavy analytics work for last.
