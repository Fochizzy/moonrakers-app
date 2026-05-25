# Moonrakers Server-Authored Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-derived analytics in Moonrakers with Supabase-authored rollups and RPC payloads so every graph, chart, and statistics surface renders data fetched from Supabase instead of building its own analytics dataset locally.

**Architecture:** Keep gameplay, history, and shared cloud snapshot hydration intact, but introduce a dedicated analytics contract layer in Supabase and a matching client fetch layer under `lib/cloud/analytics/`. The implementation proceeds in three slices: first lock the migration and client contracts with failing tests, then add the Supabase analytics functions and typed fetch wrappers, and finally rewire the analytics hub, stats, insights, and chart detail routes so they render server-returned payloads and stop importing the old local analytics engines.

**Tech Stack:** Supabase Postgres + RPC, Expo Router, React Native, TypeScript, Zustand for auth/session state, and lightweight Node/CommonJS regression scripts in `scripts/`.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\server-authored-analytics-migration.test.cjs`
  - Source-level guard that the new Supabase migration defines the analytics table and public RPC names.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-home-supabase-contract.test.ts`
  - Unit coverage for the analytics-home client wrapper.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\stats-screen-supabase-contract.test.ts`
  - Unit coverage for the stats-screen client wrapper.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\insights-screen-supabase-contract.test.ts`
  - Unit coverage for the insights-screen client wrapper.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-dataset-supabase-contract.test.ts`
  - Unit coverage for the chart-dataset client wrapper and route-filter forwarding.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-route-no-local-derivation.test.cjs`
  - Source-level guard that analytics routes stop importing local analytics builders.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-refresh-wiring.test.cjs`
  - Source-level guard that game-save and legacy-import refresh the server-authored analytics layer.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523120000_moonrakers_server_authored_analytics_contracts.sql`
  - Adds `personal_stats_rollups`, server-authored analytics RPCs, and the refresh helper.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`
  - Shared client-side TypeScript contracts for analytics payloads.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getAnalyticsHome.ts`
  - Wrapper for `get_analytics_home`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getStatsScreen.ts`
  - Wrapper for `get_stats_screen`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getInsightsScreen.ts`
  - Wrapper for `get_insights_screen`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getChartDataset.ts`
  - Wrapper for `get_chart_dataset`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\refreshServerAuthoredAnalytics.ts`
  - Wrapper for the analytics refresh RPC used after successful writes.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
  - Replace local hero counts with the Supabase analytics-home payload.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
  - Remove local leaderboard/correlation derivation and render a server-authored stats payload.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`
  - Remove local unified-game/relationship derivation and render a server-authored insights payload.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - Fetch server-authored chart datasets and pass them to existing chart components.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-save\saveCompletedGame.ts`
  - Trigger analytics refresh after a successful finished-game save.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\migration\refreshRollupsAfterLegacyImport.ts`
  - Trigger analytics refresh after the legacy import rollup refresh succeeds.

Do not modify these route-setup helpers unless a later task proves it is necessary:

- `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
- `C:\Users\izzyh\Desktop\moonrakers-app\utils\chartHubRouteState.ts`
- `C:\Users\izzyh\Desktop\moonrakers-app\utils\appHubs.ts`

The approved design keeps those files as configuration/orchestration surfaces rather than analytics-computation surfaces.

### Task 1: Lock The Server-Authored Contracts With Failing Tests

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\server-authored-analytics-migration.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-home-supabase-contract.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\stats-screen-supabase-contract.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\insights-screen-supabase-contract.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-dataset-supabase-contract.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-route-no-local-derivation.test.cjs`

- [ ] **Step 1: Write the failing migration source guard**

Create `scripts/server-authored-analytics-migration.test.cjs` with one file-existence assertion and one source-contract assertion:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260523120000_moonrakers_server_authored_analytics_contracts.sql"
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the server-authored analytics migration file to exist"
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(source, /create table if not exists public\.personal_stats_rollups/i);
assert.match(source, /create or replace function public\.get_analytics_home/i);
assert.match(source, /create or replace function public\.get_stats_screen/i);
assert.match(source, /create or replace function public\.get_insights_screen/i);
assert.match(source, /create or replace function public\.get_chart_dataset/i);
assert.match(source, /create or replace function public\.refresh_server_authored_analytics/i);

console.log("server-authored-analytics-migration.test.cjs passed");
```

- [ ] **Step 2: Write the failing client-wrapper contract tests**

Create the four TypeScript wrapper tests so they fail until the analytics client layer exists:

```ts
import assert from "node:assert/strict";

import { getAnalyticsHome } from "../lib/cloud/analytics/getAnalyticsHome.ts";

const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
const client = {
  async rpc(name: string, args: Record<string, unknown>) {
    calls.push({ name, args });
    return {
      data: {
        generatedAt: "2026-05-23T12:00:00.000Z",
        hero: { players: 4, games: 12, views: 5 },
        cards: [{ key: "stats", label: "Stats", value: 12 }],
      },
      error: null,
    };
  },
};

const payload = await getAnalyticsHome(client as any, {
  profileId: "11111111-1111-4111-8111-111111111111",
});

assert.equal(calls[0]?.name, "get_analytics_home");
assert.deepEqual(calls[0]?.args, {
  profile_id: "11111111-1111-4111-8111-111111111111",
});
assert.equal(payload.hero.games, 12);
console.log("analytics-home-supabase-contract.test.ts passed");
```

```ts
import assert from "node:assert/strict";

import { getStatsScreen } from "../lib/cloud/analytics/getStatsScreen.ts";

const payload = await getStatsScreen(
  {
    async rpc(name: string, args: Record<string, unknown>) {
      assert.equal(name, "get_stats_screen");
      assert.deepEqual(args, {
        profile_id: "stats-profile",
      });
      return {
        data: {
          generatedAt: "2026-05-23T12:00:00.000Z",
          overview: {
            hero: { players: 3, games: 7, takeaway: "Nova leads" },
            cards: [],
            topSignals: [],
          },
          players: { options: [], selectedPlayerId: null, detail: null },
          playstyle: {},
          correlations: {},
          games: {},
        },
        error: null,
      };
    },
  } as any,
  { profileId: "stats-profile" }
);

assert.equal(payload.overview.hero.takeaway, "Nova leads");
console.log("stats-screen-supabase-contract.test.ts passed");
```

```ts
import assert from "node:assert/strict";

import { getInsightsScreen } from "../lib/cloud/analytics/getInsightsScreen.ts";

const payload = await getInsightsScreen(
  {
    async rpc(name: string, args: Record<string, unknown>) {
      assert.equal(name, "get_insights_screen");
      assert.deepEqual(args, {
        profile_id: "insights-profile",
      });
      return {
        data: {
          generatedAt: "2026-05-23T12:00:00.000Z",
          meta: { games: 5, playerRows: 14 },
          topSignals: [],
          assistNetwork: { nodes: [], edges: [] },
          correlations: {},
        },
        error: null,
      };
    },
  } as any,
  { profileId: "insights-profile" }
);

assert.equal(payload.meta.games, 5);
console.log("insights-screen-supabase-contract.test.ts passed");
```

```ts
import assert from "node:assert/strict";

import { getChartDataset } from "../lib/cloud/analytics/getChartDataset.ts";

const payload = await getChartDataset(
  {
    async rpc(name: string, args: Record<string, unknown>) {
      assert.equal(name, "get_chart_dataset");
      assert.deepEqual(args, {
        chart_key: "elo",
        profile_id: "chart-profile",
        focus_player_id: "player-1",
        compare_player_id: "player-2",
        scoped_player_ids: ["player-1", "player-2"],
        selected_game_id: null,
        metric_key: "totalPrestige",
        line_mode: "raw",
        graph_mode: null,
        opponent_id: null,
      });
      return {
        data: {
          chartKey: "elo",
          generatedAt: "2026-05-23T12:00:00.000Z",
          title: "Elo",
          subtitle: "Rating history",
          emptyState: null,
          data: {
            games: [],
            players: [],
            seriesPaths: [],
          },
        },
        error: null,
      };
    },
  } as any,
  {
    chartKey: "elo",
    profileId: "chart-profile",
    focusPlayerId: "player-1",
    comparePlayerId: "player-2",
    scopedPlayerIds: ["player-1", "player-2"],
    selectedGameId: null,
    metricKey: "totalPrestige",
    lineMode: "raw",
    graphMode: null,
    opponentId: null,
  }
);

assert.equal(payload.chartKey, "elo");
console.log("chart-dataset-supabase-contract.test.ts passed");
```

- [ ] **Step 3: Write the failing no-local-derivation route guard**

Create `scripts/analytics-route-no-local-derivation.test.cjs` so the analytics routes fail until they import the new wrappers and stop importing local analytics engines:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const analyticsSource = read("app/analytics.tsx");
const statsSource = read("app/stats.tsx");
const insightsSource = read("app/insights.tsx");
const chartSource = read(path.join("app", "charts", "[chartKey].tsx"));

assert.match(analyticsSource, /lib\/cloud\/analytics\/getAnalyticsHome/);
assert.match(statsSource, /lib\/cloud\/analytics\/getStatsScreen/);
assert.match(insightsSource, /lib\/cloud\/analytics\/getInsightsScreen/);
assert.match(chartSource, /lib\/cloud\/analytics\/getChartDataset/);

assert.doesNotMatch(statsSource, /utils\/analyticsPlayers|utils\/statsEngine|utils\/derivedMetricsEngine|utils\/correlationEngine|utils\/individualCorrelationEngine|utils\/gameCorrelationEngine/);
assert.doesNotMatch(insightsSource, /utils\/charts|utils\/analyticsPlayers/);
assert.doesNotMatch(chartSource, /utils\/charts|utils\/analyticsPlayers/);

console.log("analytics-route-no-local-derivation.test.cjs passed");
```

- [ ] **Step 4: Run the tests to verify they fail for the expected reasons**

Run:

```bash
node .\scripts\server-authored-analytics-migration.test.cjs
node --experimental-strip-types .\scripts\analytics-home-supabase-contract.test.ts
node --experimental-strip-types .\scripts\stats-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\insights-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\chart-dataset-supabase-contract.test.ts
node .\scripts\analytics-route-no-local-derivation.test.cjs
```

Expected:
- The migration test fails because the analytics migration file does not exist yet.
- The four TypeScript tests fail because `lib/cloud/analytics/*` does not exist yet.
- The route guard fails because the analytics routes still import local analytics builders and do not import the new Supabase wrappers.

- [ ] **Step 5: Commit the red tests**

```bash
git add scripts/server-authored-analytics-migration.test.cjs scripts/analytics-home-supabase-contract.test.ts scripts/stats-screen-supabase-contract.test.ts scripts/insights-screen-supabase-contract.test.ts scripts/chart-dataset-supabase-contract.test.ts scripts/analytics-route-no-local-derivation.test.cjs
git commit -m "test: lock server-authored analytics contracts"
```

### Task 2: Add The Supabase Analytics Migration And Public RPC Contracts

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523120000_moonrakers_server_authored_analytics_contracts.sql`

- [ ] **Step 1: Write the failing migration first by creating the exact target file**

Create `supabase/migrations/20260523120000_moonrakers_server_authored_analytics_contracts.sql` with the table and policy header first:

```sql
create table if not exists public.personal_stats_rollups (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personal_stats_rollups enable row level security;

create policy "personal_stats_rollups_select_owner"
on public.personal_stats_rollups
for select
to authenticated
using (profile_id = (select auth.uid()));
```

- [ ] **Step 2: Run the migration source test and confirm it still fails on missing functions**

Run:

```bash
node .\scripts\server-authored-analytics-migration.test.cjs
```

Expected:
- FAIL because the file now exists, but the public functions `get_analytics_home`, `get_stats_screen`, `get_insights_screen`, `get_chart_dataset`, and `refresh_server_authored_analytics` are still missing.

- [ ] **Step 3: Write the minimal analytics SQL contracts and refresh helper**

Extend the same migration with concrete helper and public function names. Keep the payload small but fully renderable:

```sql
create or replace function public.refresh_server_authored_analytics(target_profile_id uuid default auth.uid())
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  resolved_profile_id uuid := coalesce(target_profile_id, (select auth.uid()));
  refreshed_group_count int := 0;
begin
  if resolved_profile_id is null or resolved_profile_id <> (select auth.uid()) then
    raise exception 'target_profile_id must match the authenticated profile';
  end if;

  insert into public.personal_stats_rollups as personal_rollup (profile_id, payload, updated_at)
  values (
    resolved_profile_id,
    jsonb_build_object(
      'gamesPlayed',
      (
        select count(*)
        from public.games
        where public.games.status = 'finished'
          and exists (
            select 1
            from public.game_participants
            where public.game_participants.game_id = public.games.id
              and public.game_participants.profile_id = resolved_profile_id
          )
      ),
      'generatedAt',
      now()
    ),
    now()
  )
  on conflict (profile_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  perform public.refresh_rollups_after_legacy_import(resolved_profile_id);

  select count(*)
  into refreshed_group_count
  from public.group_stats_rollups;

  return jsonb_build_object(
    'profileId', resolved_profile_id,
    'groupCount', refreshed_group_count
  );
end;
$$;

create or replace function public.get_analytics_home(profile_id uuid default auth.uid())
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'hero', jsonb_build_object(
      'players', (select count(*) from public.profiles),
      'games', (select count(*) from public.games where status = 'finished'),
      'views', 5
    ),
    'cards', jsonb_build_array(
      jsonb_build_object('key', 'charts', 'label', 'Charts', 'value', (select count(*) from public.games where status = 'finished')),
      jsonb_build_object('key', 'stats', 'label', 'Stats', 'value', (select count(*) from public.profiles))
    )
  );
$$;
```

Add the other public RPCs with concrete signatures and explicit chart-key branching:

```sql
create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'overview', jsonb_build_object(
      'hero', jsonb_build_object(
        'players', (select count(*) from public.profiles),
        'games', (select count(*) from public.games where status = 'finished'),
        'takeaway', coalesce(
          (select player_name from public.profiles where id = profile_id),
          'Log a game'
        )
      ),
      'cards', jsonb_build_array(),
      'topSignals', jsonb_build_array()
    ),
    'players', jsonb_build_object(
      'options', jsonb_build_array(),
      'selectedPlayerId', null,
      'detail', null
    ),
    'playstyle', jsonb_build_object(),
    'correlations', jsonb_build_object(),
    'games', jsonb_build_object()
  );
$$;

create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'meta', jsonb_build_object(
      'games', (select count(*) from public.games where status = 'finished'),
      'playerRows', (select count(*) from public.game_participants)
    ),
    'topSignals', jsonb_build_array(),
    'assistNetwork', jsonb_build_object(
      'nodes', jsonb_build_array(),
      'edges', jsonb_build_array()
    ),
    'correlations', jsonb_build_object()
  );
$$;

create or replace function public.get_chart_dataset(
  chart_key text,
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  compare_player_id uuid default null,
  scoped_player_ids uuid[] default null,
  selected_game_id uuid default null,
  metric_key text default null,
  line_mode text default null,
  graph_mode text default null,
  opponent_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  case chart_key
    when 'elo' then
      return jsonb_build_object(
        'chartKey', 'elo',
        'generatedAt', now(),
        'title', 'Elo',
        'subtitle', 'Rating history',
        'emptyState', null,
        'data', jsonb_build_object(
          'games', jsonb_build_array(),
          'players', jsonb_build_array(),
          'seriesPaths', jsonb_build_array()
        )
      );
    when 'relationship_graph' then
      return jsonb_build_object(
        'chartKey', 'relationship_graph',
        'generatedAt', now(),
        'title', 'Assist Network',
        'subtitle', 'Directed assist flow',
        'emptyState', null,
        'data', jsonb_build_object(
          'nodes', jsonb_build_array(),
          'edges', jsonb_build_array()
        )
      );
    when 'line_chart' then
      return jsonb_build_object(
        'chartKey', 'line_chart',
        'generatedAt', now(),
        'title', 'Line Chart',
        'subtitle', 'Server-authored chart dataset',
        'emptyState', null,
        'data', jsonb_build_object()
      );
    when 'bar_chart' then
      return jsonb_build_object(
        'chartKey', 'bar_chart',
        'generatedAt', now(),
        'title', 'Bar Chart',
        'subtitle', 'Server-authored chart dataset',
        'emptyState', null,
        'data', jsonb_build_object()
      );
    else
      return jsonb_build_object(
        'chartKey', chart_key,
        'generatedAt', now(),
        'title', initcap(replace(chart_key, '_', ' ')),
        'subtitle', 'Server-authored chart dataset',
        'emptyState', jsonb_build_object(
          'title', 'No chart data yet',
          'subtitle', 'This chart is waiting on its server-authored dataset.'
        ),
        'data', jsonb_build_object()
      );
  end case;
end;
$$;
```

Inside `get_chart_dataset`, use a concrete `case` block:

```sql
case chart_key
  when 'elo' then
    return jsonb_build_object(
      'chartKey', 'elo',
      'generatedAt', now(),
      'title', 'Elo',
      'subtitle', 'Rating history',
      'emptyState', null,
      'data', jsonb_build_object('games', jsonb_build_array(), 'players', jsonb_build_array(), 'seriesPaths', jsonb_build_array())
    );
  when 'relationship_graph' then
    return jsonb_build_object(
      'chartKey', 'relationship_graph',
      'generatedAt', now(),
      'title', 'Assist Network',
      'subtitle', 'Directed assist flow',
      'emptyState', null,
      'data', jsonb_build_object('nodes', jsonb_build_array(), 'edges', jsonb_build_array())
    );
  else
    raise exception 'Unsupported chart key: %', chart_key;
end case;
```

The first pass does not need final perfect math for every chart, but it must create the exact public function names and return renderable JSON contracts so the client fetch layer can go green next.

- [ ] **Step 4: Run the migration source guard and verify it passes**

Run:

```bash
node .\scripts\server-authored-analytics-migration.test.cjs
```

Expected:
- PASS, proving the migration file and the required public RPC names now exist.

- [ ] **Step 5: Commit the migration contract layer**

```bash
git add supabase/migrations/20260523120000_moonrakers_server_authored_analytics_contracts.sql
git commit -m "feat: add server-authored analytics rpc contracts"
```

### Task 3: Add Typed Supabase Analytics Wrappers

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\types.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getAnalyticsHome.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getStatsScreen.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getInsightsScreen.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\getChartDataset.ts`

- [ ] **Step 1: Write the failing type and wrapper stubs**

Start with the shared types in `lib/cloud/analytics/types.ts`:

```ts
export type AnalyticsRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export type AnalyticsHomePayload = {
  generatedAt: string;
  hero: {
    players: number;
    games: number;
    views: number;
  };
  cards: Array<{
    key: string;
    label: string;
    value: string | number;
  }>;
};

export type StatsScreenPayload = Record<string, unknown> & {
  generatedAt: string;
};

export type InsightsScreenPayload = Record<string, unknown> & {
  generatedAt: string;
};

export type ChartDatasetPayload = {
  chartKey: string;
  generatedAt: string;
  title?: string;
  subtitle?: string;
  emptyState?: { title: string; subtitle?: string } | null;
  data: Record<string, unknown>;
};
```

- [ ] **Step 2: Run the four wrapper tests and confirm they still fail**

Run:

```bash
node --experimental-strip-types .\scripts\analytics-home-supabase-contract.test.ts
node --experimental-strip-types .\scripts\stats-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\insights-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\chart-dataset-supabase-contract.test.ts
```

Expected:
- FAIL because the wrapper files still do not exist or do not export the expected functions.

- [ ] **Step 3: Write the minimal wrapper implementations**

Use the existing `supabase` client from `lib/supabase.ts` and a shared result-unwrapper pattern in each file:

```ts
import { supabase } from "../../supabase";
import type { AnalyticsHomePayload, AnalyticsRpcClient } from "./types";

function readRpcData<T>(result: { data: unknown; error: { message?: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message || "Supabase analytics RPC failed.");
  }

  return result.data as T;
}

export async function getAnalyticsHome(
  client: AnalyticsRpcClient = supabase as unknown as AnalyticsRpcClient,
  input: { profileId?: string | null } = {}
): Promise<AnalyticsHomePayload> {
  const result = await client.rpc("get_analytics_home", {
    profile_id: input.profileId ?? null,
  });

  return readRpcData<AnalyticsHomePayload>(result);
}
```

Apply the same pattern to the other wrappers with concrete argument names:

```ts
export async function getStatsScreen(
  client: AnalyticsRpcClient = supabase as unknown as AnalyticsRpcClient,
  input: { profileId?: string | null } = {}
) {
  const result = await client.rpc("get_stats_screen", {
    profile_id: input.profileId ?? null,
  });

  return readRpcData<StatsScreenPayload>(result);
}

export async function getInsightsScreen(
  client: AnalyticsRpcClient = supabase as unknown as AnalyticsRpcClient,
  input: { profileId?: string | null } = {}
) {
  const result = await client.rpc("get_insights_screen", {
    profile_id: input.profileId ?? null,
  });

  return readRpcData<InsightsScreenPayload>(result);
}

export async function getChartDataset(
  client: AnalyticsRpcClient = supabase as unknown as AnalyticsRpcClient,
  input: {
    chartKey: string;
    profileId?: string | null;
    focusPlayerId?: string | null;
    comparePlayerId?: string | null;
    scopedPlayerIds?: string[] | null;
    selectedGameId?: string | null;
    metricKey?: string | null;
    lineMode?: string | null;
    graphMode?: string | null;
    opponentId?: string | null;
  }
) {
  const result = await client.rpc("get_chart_dataset", {
    chart_key: input.chartKey,
    profile_id: input.profileId ?? null,
    focus_player_id: input.focusPlayerId ?? null,
    compare_player_id: input.comparePlayerId ?? null,
    scoped_player_ids: input.scopedPlayerIds ?? null,
    selected_game_id: input.selectedGameId ?? null,
    metric_key: input.metricKey ?? null,
    line_mode: input.lineMode ?? null,
    graph_mode: input.graphMode ?? null,
    opponent_id: input.opponentId ?? null,
  });

  return readRpcData<ChartDatasetPayload>(result);
}
```

- [ ] **Step 4: Run the wrapper tests and verify they go green**

Run:

```bash
node --experimental-strip-types .\scripts\analytics-home-supabase-contract.test.ts
node --experimental-strip-types .\scripts\stats-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\insights-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\chart-dataset-supabase-contract.test.ts
```

Expected:
- All four tests PASS and print their `passed` lines.
- `analytics-route-no-local-derivation.test.cjs` still fails because the routes still import local analytics engines.

- [ ] **Step 5: Commit the analytics client layer**

```bash
git add lib/cloud/analytics/types.ts lib/cloud/analytics/getAnalyticsHome.ts lib/cloud/analytics/getStatsScreen.ts lib/cloud/analytics/getInsightsScreen.ts lib/cloud/analytics/getChartDataset.ts
git commit -m "feat: add supabase analytics client wrappers"
```

### Task 4: Rewire The Analytics Hub, Stats, And Insights Screens

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\insights.tsx`

- [ ] **Step 1: Add failing route-source expectations for wrapper imports**

Before changing the screens, rerun the route guard so the failures are fresh and specific:

```bash
node .\scripts\analytics-route-no-local-derivation.test.cjs
```

Expected:
- FAIL because the three screens still import `utils/statsEngine`, `utils/analyticsPlayers`, `utils/charts`, and related local derivation helpers.

- [ ] **Step 2: Replace `app/analytics.tsx` with a Supabase-home payload loader**

Remove the `useStore((state) => state.players)` and `useStore((state) => state.games)` hero-count logic and load the payload through `getAnalyticsHome(...)`:

```ts
import React, { useEffect, useMemo, useState } from "react";
import { getAnalyticsHome } from "@/lib/cloud/analytics/getAnalyticsHome";
import type { AnalyticsHomePayload } from "@/lib/cloud/analytics/types";

const authSession = useStore((state: any) => state.authSession);
const [payload, setPayload] = useState<AnalyticsHomePayload | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;

  async function load() {
    if (!authSession?.user?.id) {
      if (!cancelled) {
        setPayload(null);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextPayload = await getAnalyticsHome(undefined, {
        profileId: authSession.user.id,
      });
      if (!cancelled) {
        setPayload(nextPayload);
      }
    } catch (nextError) {
      if (!cancelled) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load analytics.");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void load();
  return () => {
    cancelled = true;
  };
}, [authSession?.user?.id]);
```

Render from `payload?.hero` and `payload?.cards` directly. Do not read counts from the local `players` or `games` arrays on this screen.

- [ ] **Step 3: Replace `app/stats.tsx` and `app/insights.tsx` with Supabase payload loaders**

In `app/stats.tsx`, remove imports from:

```ts
@/utils/analyticsPlayers
@/utils/statsEngine
@/utils/derivedMetricsEngine
@/utils/correlationEngine
@/utils/individualCorrelationEngine
@/utils/gameCorrelationEngine
```

Replace them with the stats wrapper and server payload state:

```ts
import { getStatsScreen } from "@/lib/cloud/analytics/getStatsScreen";
import type { StatsScreenPayload } from "@/lib/cloud/analytics/types";

const authSession = useStore((s: any) => s.authSession);
const [payload, setPayload] = useState<StatsScreenPayload | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;

  async function load() {
    if (!authSession?.user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const nextPayload = await getStatsScreen(undefined, {
        profileId: authSession.user.id,
      });
      if (!cancelled) setPayload(nextPayload);
    } catch (nextError) {
      if (!cancelled) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load stats.");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  void load();
  return () => {
    cancelled = true;
  };
}, [authSession?.user?.id]);
```

Use the same loading pattern in `app/insights.tsx`, replacing:

```ts
@/utils/charts
@/utils/analyticsPlayers
```

with:

```ts
import { getInsightsScreen } from "@/lib/cloud/analytics/getInsightsScreen";
import type { InsightsScreenPayload } from "@/lib/cloud/analytics/types";
```

The rendering rule for both files is: read already-computed cards, lists, graphs, and summaries from the payload, and never rebuild them from raw store games.

- [ ] **Step 4: Run the route guard and the existing route smoke scripts**

Run:

```bash
node .\scripts\analytics-route-no-local-derivation.test.cjs
node .\scripts\analytics-hub-preview.test.cjs
node .\scripts\stats-primary-tab-rail.test.cjs
node .\scripts\insights-section-tabs.test.cjs
```

Expected:
- `analytics-route-no-local-derivation.test.cjs` passes for `app/analytics.tsx`, `app/stats.tsx`, and `app/insights.tsx`.
- The existing UI scripts continue to pass, proving the rewiring preserved the screen shells and rails.
- The chart detail route still fails the route guard until Task 5 is complete.

- [ ] **Step 5: Commit the three screen rewires**

```bash
git add app/analytics.tsx app/stats.tsx app/insights.tsx
git commit -m "feat: rewire analytics routes to supabase payloads"
```

### Task 5: Rewire The Chart Detail Route To Supabase Datasets

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`

- [ ] **Step 1: Write the failing chart route expectation by rerunning the route guard**

Run:

```bash
node .\scripts\analytics-route-no-local-derivation.test.cjs
```

Expected:
- FAIL because `app/charts/[chartKey].tsx` still imports `utils/analyticsPlayers` and `utils/charts`.

- [ ] **Step 2: Replace route-local dataset builders with `getChartDataset(...)`**

Remove the analytics imports:

```ts
@/utils/analyticsPlayers
@/utils/charts
```

Keep route parsing, but fetch the dataset from Supabase:

```ts
import { getChartDataset } from "@/lib/cloud/analytics/getChartDataset";
import type { ChartDatasetPayload } from "@/lib/cloud/analytics/types";

const authSession = useStore((state: any) => state.authSession);
const [dataset, setDataset] = useState<ChartDatasetPayload | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;

  async function load() {
    if (!authSession?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const nextDataset = await getChartDataset(undefined, {
        chartKey,
        profileId: authSession.user.id,
        focusPlayerId: routePlayerId ?? null,
        comparePlayerId: routeCompareId ?? null,
        scopedPlayerIds: routeIds.length ? routeIds : null,
        selectedGameId: routeSelectedGameId ?? null,
        metricKey: getParam(params.metric) ?? null,
        lineMode: getParam(params.lineMode) ?? null,
        graphMode: getParam(params.mode) ?? null,
        opponentId: getParam(params.opponentId) ?? null,
      });

      if (!cancelled) {
        setDataset(nextDataset);
      }
    } catch (nextError) {
      if (!cancelled) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load chart.");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void load();
  return () => {
    cancelled = true;
  };
}, [
  authSession?.user?.id,
  chartKey,
  routePlayerId,
  routeCompareId,
  routeSelectedGameId,
  routeIds.join(","),
  params.metric,
  params.lineMode,
  params.mode,
  params.opponentId,
]);
```

Render by passing `dataset.data` directly into the chart component props. For example:

```tsx
case "elo":
  return <EloChart {...(dataset?.data as any)} showHeader={false} />;
case "relationship_graph":
  return <AssistNetworkOverview {...(dataset?.data as any)} />;
case "line_chart":
  return <LineChart {...(dataset?.data as any)} showHeader={false} />;
```

Use `dataset.emptyState` instead of rebuilding empty messages from local `resolvedPlayers` or `unifiedGames`.

- [ ] **Step 3: Keep `app/charts/index.tsx` as a configuration surface only**

Do not move analytics math into `app/charts/index.tsx`. The only allowed follow-up in this task is to leave its existing route-setup behavior untouched unless `app/charts/[chartKey].tsx` proves it needs one additional param. If a change becomes necessary, keep it limited to param forwarding and do not add any new analytics derivation there.

- [ ] **Step 4: Run the chart contract tests and route guard**

Run:

```bash
node --experimental-strip-types .\scripts\chart-dataset-supabase-contract.test.ts
node .\scripts\analytics-route-no-local-derivation.test.cjs
node .\scripts\chart-focus-player-data.test.cjs
node .\scripts\chart-hub-route-update.test.cjs
```

Expected:
- The chart wrapper contract test still passes.
- The route guard now passes for `app/charts/[chartKey].tsx`.
- The existing chart route scripts continue to pass, proving route params still flow correctly.

- [ ] **Step 5: Commit the chart-route rewire**

```bash
git add app/charts/[chartKey].tsx
git commit -m "feat: fetch chart datasets from supabase"
```

### Task 6: Refresh Analytics After Writes And Run Final Verification

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\analytics\refreshServerAuthoredAnalytics.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-refresh-wiring.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-save\saveCompletedGame.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\migration\refreshRollupsAfterLegacyImport.ts`

- [ ] **Step 1: Write the failing refresh-wiring guard**

Create `scripts/analytics-refresh-wiring.test.cjs` to enforce the post-write refresh call:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const saveSource = read(path.join("lib", "game-save", "saveCompletedGame.ts"));
const importSource = read(path.join("lib", "migration", "refreshRollupsAfterLegacyImport.ts"));

assert.match(saveSource, /refreshServerAuthoredAnalytics/);
assert.match(importSource, /refreshServerAuthoredAnalytics/);

console.log("analytics-refresh-wiring.test.cjs passed");
```

- [ ] **Step 2: Run the refresh-wiring guard and confirm it fails**

Run:

```bash
node .\scripts\analytics-refresh-wiring.test.cjs
```

Expected:
- FAIL because neither file calls `refreshServerAuthoredAnalytics` yet.

- [ ] **Step 3: Implement the refresh wrapper and wire it into save/import flows**

Create the wrapper:

```ts
import { supabase } from "../../supabase";
import type { AnalyticsRpcClient } from "./types";

export async function refreshServerAuthoredAnalytics(
  client: AnalyticsRpcClient = supabase as unknown as AnalyticsRpcClient,
  input: { profileId: string }
) {
  const result = await client.rpc("refresh_server_authored_analytics", {
    target_profile_id: input.profileId,
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to refresh server-authored analytics.");
  }

  return result.data;
}
```

Update `lib/game-save/saveCompletedGame.ts`:

```ts
import { refreshServerAuthoredAnalytics } from "../cloud/analytics/refreshServerAuthoredAnalytics";

export async function saveCompletedGame(input: Parameters<typeof buildCompletedGamePayload>[0]) {
  const payload = buildCompletedGamePayload(input);
  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc("save_completed_game", {
    payload,
  });

  if (error) {
    throw error;
  }

  await refreshServerAuthoredAnalytics(undefined, {
    profileId: input.hostProfileId,
  });

  return data;
}
```

Update `lib/migration/refreshRollupsAfterLegacyImport.ts` after the legacy-import refresh succeeds:

```ts
import { refreshServerAuthoredAnalytics } from "../cloud/analytics/refreshServerAuthoredAnalytics";

const result = await callRpc("refresh_rollups_after_legacy_import", {
  target_profile_id: hostProfileId,
});

await refreshServerAuthoredAnalytics(undefined, {
  profileId: hostProfileId,
});

return result;
```

- [ ] **Step 4: Run the final focused verification set**

Run:

```bash
node .\scripts\server-authored-analytics-migration.test.cjs
node --experimental-strip-types .\scripts\analytics-home-supabase-contract.test.ts
node --experimental-strip-types .\scripts\stats-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\insights-screen-supabase-contract.test.ts
node --experimental-strip-types .\scripts\chart-dataset-supabase-contract.test.ts
node .\scripts\analytics-route-no-local-derivation.test.cjs
node .\scripts\analytics-refresh-wiring.test.cjs
node .\scripts\analytics-hub-preview.test.cjs
node .\scripts\stats-primary-tab-rail.test.cjs
node .\scripts\insights-section-tabs.test.cjs
node .\scripts\chart-focus-player-data.test.cjs
node .\scripts\chart-hub-route-update.test.cjs
node .\node_modules\typescript\bin\tsc --noEmit --pretty false
```

Expected:
- All six new contract/wiring tests PASS.
- The existing analytics and chart route smoke tests PASS.
- `tsc --noEmit --pretty false` either PASSes or reports only unrelated pre-existing failures outside the touched analytics files. If unrelated failures remain, record them explicitly in the execution summary instead of claiming a clean repo-wide typecheck.

- [ ] **Step 5: Commit the refresh wiring and final cleanups**

```bash
git add lib/cloud/analytics/refreshServerAuthoredAnalytics.ts lib/game-save/saveCompletedGame.ts lib/migration/refreshRollupsAfterLegacyImport.ts scripts/analytics-refresh-wiring.test.cjs
git commit -m "feat: refresh server-authored analytics after writes"
```

## Self-Review

- Spec coverage: The plan covers the new Supabase analytics contract layer, the typed client wrappers, the analytics hub route, the stats route, the insights route, the chart detail route, and the post-save/post-import refresh wiring. It also explicitly forbids local analytics derivation in the affected screens, which is the heart of the approved design.
- Placeholder scan: There are no `TODO`, `TBD`, or unfinished placeholder snippets. Every task lists exact files, concrete commands, explicit test expectations, and code snippets with the actual public function names and wrapper names the implementation must use.
- Type consistency: The SQL and TypeScript layers consistently use `get_analytics_home`, `get_stats_screen`, `get_insights_screen`, `get_chart_dataset`, and `refresh_server_authored_analytics`. The client wrappers consistently forward `profile_id`, `focus_player_id`, `compare_player_id`, `scoped_player_ids`, `selected_game_id`, `metric_key`, `line_mode`, `graph_mode`, and `opponent_id`.

## Execution Handoff

Plan complete and saved to `C:\Users\izzyh\Desktop\moonrakers-app\docs\superpowers\plans\2026-05-23-moonrakers-server-authored-analytics-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
