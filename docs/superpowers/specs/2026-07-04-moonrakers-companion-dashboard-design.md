# Moonrakers Companion Dashboard Design

Date: 2026-07-04
Status: Draft for review
Scope: Separate in-repo web app for signed-in player analytics

## Summary

Build a separate Next.js web app inside this repository that gives each player a signed-in personal analytics dashboard backed by the same Supabase auth and analytics contracts the Expo app already uses. The web app should feel like a real desktop dashboard, not a stretched mobile layout, while preserving the meaning and source of the underlying Moonrakers stats.

The web app should support both sign in and account creation from its auth entry point. After account creation, a player who does not yet have a complete Moonrakers profile should be routed through a lightweight onboarding step before entering the dashboard.

## Goals

- Provide a real website experience for Moonrakers analytics.
- Reuse the same Supabase backend and analytics RPC contracts already used by the mobile app.
- Support sign in, create account, password recovery, and verified-session return flows in the web app.
- Keep analytics answers aligned between mobile and web for the same signed-in player.
- Separate shared data logic from platform-specific presentation so the web app can evolve without bending the mobile UI around desktop needs.

## Non-Goals

- Rebuilding the existing Expo app screens as shared cross-platform UI.
- Creating a public or group-wide analytics portal in v1.
- Introducing a second analytics backend or export-based ingestion path.
- Refactoring the mobile app before the web app exists.

## Repo Context

The current app already centralizes analytics reads through reusable helpers rather than burying analytics fetching inside individual screens. The main contract entry points are:

- `lib/cloud/analytics/getAnalyticsHome.ts`
- `lib/cloud/analytics/getStatsScreen.ts`
- `lib/cloud/analytics/getChartDataset.ts`
- `lib/cloud/analytics/getInsightsScreen.ts`
- `lib/cloud/analytics/getEloScreen.ts`
- `lib/cloud/analytics/getPlayerProfileScreen.ts`

This makes a separate web app viable because the backend contract already exists and can be reused without duplicating the analytics schema logic.

## Recommended Architecture

Create a separate web application in this repository, likely at `apps/dashboard`, using Next.js App Router.

The resulting structure should conceptually split into three layers:

1. Shared analytics contract layer
   - Platform-neutral helpers, payload types, and normalization utilities for Supabase analytics reads.
   - This layer should be consumed by both the Expo app and the Next.js app.

2. Web server/data layer
   - Next.js server-side auth verification, route protection, profile readiness checks, and page-specific data access.
   - This layer should shape page-safe payloads for the browser and keep protected reads close to the server.

3. Web presentation layer
   - Desktop-first routes, layouts, chart views, and filter controls designed specifically for the browser.
   - This layer should not reuse React Native screen components.

This architecture gives one analytics truth source and two presentation surfaces.

## Route Map

The first-pass route map should be:

- `/auth`
  - Sign in
  - Create account
  - Password recovery
  - Return path for email verification and session restoration
- `/onboarding`
  - Lightweight profile bootstrap for newly created accounts that are not yet Moonrakers-ready
- `/`
  - Analytics home dashboard equivalent to the mobile analytics hub
- `/stats`
  - Personal stats surface driven by the existing server-authored stats payload
- `/charts`
  - Chart browser and chart setup landing page
- `/charts/[chartKey]`
  - Individual chart detail pages
- `/insights`
  - Correlations, takeaways, and insight summaries
- `/elo`
  - Ranking and rating history views
- `/profile`
  - Signed-in player profile summary

## Auth and Account Creation

The web app must allow users to create accounts directly from the auth page. Account creation is part of v1, not a later add-on.

Desired auth flow:

1. A user opens `/auth`.
2. The user can either sign in or create an account.
3. Supabase Auth handles the session and any email verification flow.
4. After a verified session exists, the server checks whether the user has a complete Moonrakers profile.
5. If required profile fields are missing, the user is redirected to `/onboarding`.
6. After onboarding is complete, the user lands on the dashboard home route.

This distinction matters because a valid auth user is not automatically the same thing as a ready analytics profile. The app already expects a profile record with Moonrakers-specific identity fields such as `player_name`, so the website should honor that same readiness boundary.

## Profile Bootstrap

`/onboarding` should be intentionally small and focused. Its purpose is not to recreate the whole player-management experience from the app. Its purpose is to collect the minimum fields required for a player to become analytics-ready.

Expected responsibilities:

- Confirm or set the primary display identity used by Moonrakers analytics.
- Create or update the linked profile record expected by the existing app/backend contract.
- Prevent entry into analytics routes until the profile is complete.

This keeps onboarding short while preserving backend consistency.

## Shared Code Boundary

The web app should reuse shared data logic, not shared mobile UI.

Safe to share:

- Analytics RPC callers
- Shared analytics payload types
- Platform-neutral normalization and parsing utilities
- Profile-readiness helpers, if extracted to a platform-neutral form
- Route-agnostic helper functions that compute derived display data from server payloads

Do not share directly:

- React Native screen files
- React Native layout primitives and styling systems
- Mobile-first chart components tuned for native behavior
- Expo navigation logic

If an existing helper mixes data concerns with React Native presentation assumptions, extract the data logic into a shared module and keep the UI-specific logic separate.

## Web UX Direction

The website should be desktop-first from the start.

Desired characteristics:

- Persistent left navigation for the main analytics areas
- Top identity/session bar showing signed-in player context
- Wider chart canvases and multi-column layouts where helpful
- Side-by-side filters on stats and chart pages
- Faster drill-down between home, stats, charts, insights, ELO, and profile

The web app should not attempt to match the mobile layout line-for-line. It should preserve meaning and route coverage while taking advantage of desktop space.

## Data Flow

For protected analytics routes, the flow should be:

1. Next.js verifies the Supabase-backed user session on the server.
2. The server confirms profile readiness.
3. The route-level data access layer calls the shared analytics contract helpers.
4. The route returns only the data the page needs.
5. Client components handle local interactivity and lightweight state, but not privileged data access.

This keeps auth checks close to the data source and limits accidental data exposure.

## Error Handling

The web app should mirror the recovery behavior already present in the mobile analytics surfaces.

Required states:

- No session: redirect to `/auth` with a clear reason when useful
- Incomplete profile: redirect to `/onboarding`
- No tracked players or no tracked games: show actionable empty states
- Analytics backend unavailable: show retryable error states
- Stale or degraded analytics response: show a visible freshness or degraded-state cue

This avoids the common failure mode where the website invents a second set of business rules and confuses users who move between app and web.

## Security Model

The browser should only receive the access it needs for the signed-in player. No privileged database access should be exposed to the client.

Security decisions:

- Use Supabase's current Next.js SSR approach with cookie-backed clients.
- Use a Proxy-based token refresh flow for server-rendered routes.
- On protected server reads, validate user identity with claims rather than trusting a raw cookie snapshot alone.
- Keep sensitive data access in a small server-side data access layer.
- Return page-safe payloads rather than whole backend objects wherever possible.

This design follows current Supabase SSR guidance and aligns with Next.js guidance to keep authorization near the data access layer.

## Testing Strategy

Testing should focus on the risky joins between auth, profile readiness, and analytics contract reuse.

### Shared contract tests

- Verify the shared analytics callers still invoke the expected RPC names and parameter shapes.
- Protect against contract drift between the mobile and web consumers.

### Web route and component tests

- Auth page sign-in and create-account state transitions
- Onboarding redirect behavior when profile readiness is incomplete
- Protected route redirects when session state is missing or expired
- Loading, empty, error, and ready states for dashboard routes

### End-to-end coverage

- Create account
- Complete onboarding
- Reach dashboard home
- Open at least one downstream analytics surface such as a chart detail route

This gives confidence in the highest-risk journey first.

## Rollout Shape

The web app should still be built in slices even though the target is a full analytics mirror.

Suggested implementation order:

1. App scaffolding, auth plumbing, and protected layout shell
2. Account creation plus onboarding flow
3. Home dashboard
4. Stats and profile routes
5. Charts index and chart detail routes
6. Insights and ELO routes
7. Test hardening and deployment preparation

This sequence ships the foundation first without changing the agreed product scope.

## Key Trade-Off

The chosen approach takes a little more upfront structure than simply forcing Expo web to behave like a dashboard, but it gives a better long-term website result. The cost is maintaining a second UI surface. The payoff is that the web experience can be properly desktop-native while still sharing the same analytics truth layer as mobile.

## Final Decision

Proceed with a separate in-repo Next.js web app that:

- uses the same Supabase auth and analytics backend as the mobile app
- lets users create accounts directly from the web auth page
- routes incomplete accounts through a small profile bootstrap flow
- reuses shared analytics contract logic instead of duplicating backend semantics
- implements a desktop-first analytics dashboard rather than stretching the mobile UI to fit the browser

## References

- Supabase SSR for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Next.js authentication guide: https://nextjs.org/docs/app/guides/authentication
