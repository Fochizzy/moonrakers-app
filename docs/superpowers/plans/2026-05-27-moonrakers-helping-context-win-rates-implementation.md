# Moonrakers Helping Context Win Rates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add helper-focused helping-context win-rate reads to Moonrakers analytics, keep them segregated by `2-player` vs `3+ players`, surface them on `Stats` and player profile, and wire any new terms into the glossary.

**Architecture:** Add one reusable helping-outcome rollup layer on top of tracked assist events, then publish that same shape through both the local Moonrakers profile builder and a new Supabase migration patch for `public.get_stats_screen` and `public.get_player_profile_screen`. Render the same row shape on both surfaces with a small shared UI card, while keeping glossary labels and definition links in the same pass so the new language ships fully wired.

**Tech Stack:** React Native, Expo Router, TypeScript, Node/CJS script tests, Supabase SQL migrations, glossary definitions

---

## File Structure

- Modify: `utils/assistContextMetrics.ts`
  - Keep `buildAssistContextEvents()` and `buildAssistContextGameSamples()` intact.
  - Add a helping-outcome rollup export that classifies timed assists by table-size bucket, helper prestige band, and helper-vs-target prestige gap.
- Modify: `scripts/assist-context-metrics.test.cjs`
  - Add one focused fixture that produces deterministic `2-player` and `3+ players` helping rows for the new rollup helper.
- Modify: `utils/playerProfileMoonrakers.ts`
  - Extend `MoonrakersIntelProfile` with a `helpingOutcomeReads` block.
  - Build local fallback rows with sample gating, evidence lines, and suggestion lines.
- Modify: `scripts/player-profile-moonrakers.test.cjs`
  - Add assertions for `helpingOutcomeReads` bucket segregation, sample gating, and row copy.
- Create: `supabase/migrations/20260527154500_moonrakers_helping_context_win_rates.sql`
  - Patch both `public.get_stats_screen` and `public.get_player_profile_screen` so the server-authored payloads publish the same helping-outcome row family.
- Create: `scripts/helping-context-payload-migration.test.cjs`
  - Guard that the newest migration patches both functions and publishes the new keys, labels, and table-size buckets.
- Create: `components/analytics/HelpingOutcomeCard.tsx`
  - Render one shared row/card shape with glossary-backed helper/helped labels, evidence text, and recommendation text.
- Modify: `lib/cloud/analytics/statsScreenDisplay.ts`
  - Add a focused normalizer for the new `playstyle.helpingOutcomeReads` payload shape.
- Modify: `scripts/stats-screen-server-rows.test.ts`
  - Extend the display-helper test with helping-outcome normalization assertions.
- Modify: `app/stats.tsx`
  - Normalize the new helping rows from the `playstyle` payload.
  - Render a `Helping Context` cluster inside `renderPlaystyleTab()`, split into `2-player` and `3+ players`.
- Modify: `components/player/MoonrakersIntelSection.tsx`
  - Add a `Helping Outcome Reads` block below `Assist Context`, split into `2-player` and `3+ players`.
- Create: `scripts/helping-context-surface-links.test.cjs`
  - Static guard that `Stats` and `MoonrakersIntelSection` both render the new block and keep glossary-aware labels/definition links.
- Modify: `utils/definitionCatalog.ts`
  - Add glossary entries for any new helping terms used as visible labels.
- Modify: `utils/definitionTargets.ts`
  - Add metric keys and label aliases for the new glossary-backed helping labels.
- Modify: `scripts/assist-context-definitions.test.cjs`
  - Extend the existing assist-context glossary test with the new term coverage.

### Task 1: Add Helping Outcome Rollups on Top of Assist Events

**Files:**
- Modify: `utils/assistContextMetrics.ts:3-585`
- Modify: `scripts/assist-context-metrics.test.cjs:1-280`

- [ ] **Step 1: Write the failing rollup test**

Extend `scripts/assist-context-metrics.test.cjs` to import a new helper named `buildHelpingOutcomeRollups`, then add this focused fixture and assertion block near the bottom of the file:

```js
const {
  buildAssistContextEvents,
  buildAssistContextGameSamples,
  buildHelpingOutcomeRollups,
} = require("../utils/assistContextMetrics.ts");

const helpingOutcomeGames = [
  {
    id: "duel-1",
    winnerId: "a",
    players: [{ id: "a" }, { id: "b" }],
    rounds: [
      { playerId: "a", prestige: 6, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "b", prestige: 2, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
    ],
  },
  {
    id: "duel-2",
    winnerId: "a",
    players: [{ id: "a" }, { id: "b" }],
    rounds: [
      { playerId: "a", prestige: 6, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
    ],
  },
  {
    id: "duel-3",
    winnerId: "a",
    players: [{ id: "a" }, { id: "b" }],
    rounds: [
      { playerId: "a", prestige: 7, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
    ],
  },
  {
    id: "crew-1",
    winnerId: "b",
    players: [{ id: "a" }, { id: "b" }, { id: "c" }],
    rounds: [
      { playerId: "b", prestige: 3, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "b", prestige: 2, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
    ],
  },
  {
    id: "crew-2",
    winnerId: "b",
    players: [{ id: "a" }, { id: "b" }, { id: "c" }],
    rounds: [
      { playerId: "b", prestige: 4, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
    ],
  },
  {
    id: "crew-3",
    winnerId: "b",
    players: [{ id: "a" }, { id: "b" }, { id: "c" }],
    rounds: [
      { playerId: "b", prestige: 3, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
    ],
  },
];

assert.deepEqual(buildHelpingOutcomeRollups(helpingOutcomeGames), [
  {
    key: "two-player:prestige-band:six-plus",
    tableSizeBucket: "two-player",
    family: "prestige-band",
    label: "Helper 6+",
    sampleSize: 3,
    helperWinRate: 1,
    helpedPlayerWinRate: 0,
  },
  {
    key: "two-player:target-gap:ahead-target",
    tableSizeBucket: "two-player",
    family: "target-gap",
    label: "Helper Ahead of Target",
    sampleSize: 3,
    helperWinRate: 1,
    helpedPlayerWinRate: 0,
  },
  {
    key: "three-plus:prestige-band:below-six",
    tableSizeBucket: "three-plus",
    family: "prestige-band",
    label: "Helper Below 6",
    sampleSize: 3,
    helperWinRate: 0,
    helpedPlayerWinRate: 1,
  },
  {
    key: "three-plus:target-gap:behind-target",
    tableSizeBucket: "three-plus",
    family: "target-gap",
    label: "Helper Behind Target",
    sampleSize: 3,
    helperWinRate: 0,
    helpedPlayerWinRate: 1,
  },
]);
```

- [ ] **Step 2: Run the rollup test to verify it fails**

Run:

```powershell
node .\scripts\assist-context-metrics.test.cjs
```

Expected: FAIL with a message similar to `buildHelpingOutcomeRollups is not a function` or an assertion failure because the new rollup rows do not exist yet.

- [ ] **Step 3: Write the minimal rollup implementation**

Add these types and the new export inside `utils/assistContextMetrics.ts`:

```ts
export type HelpingOutcomeTableSizeBucket = "two-player" | "three-plus";
export type HelpingOutcomeFamily = "prestige-band" | "target-gap";

export type HelpingOutcomeRollup = {
  key: string;
  tableSizeBucket: HelpingOutcomeTableSizeBucket;
  family: HelpingOutcomeFamily;
  label: string;
  sampleSize: number;
  helperWinRate: number;
  helpedPlayerWinRate: number;
};

function resolveTableSizeBucket(game: Game): HelpingOutcomeTableSizeBucket | null {
  const tableSize = Array.isArray(game?.players)
    ? game.players.length
    : Object.keys(game?.totals ?? {}).length;

  if (tableSize === 2) return "two-player";
  if (tableSize >= 3) return "three-plus";
  return null;
}

function resolvePrestigeBand(event: AssistContextEvent) {
  return event.preAssistPrestige >= 6 ? "six-plus" : "below-six";
}

function resolveTargetGapBand(event: AssistContextEvent) {
  if (event.preAssistPrestige >= event.targetPrestige + 2) {
    return "ahead-target";
  }

  if (event.preAssistPrestige <= event.targetPrestige - 2) {
    return "behind-target";
  }

  return "near-even";
}

function buildHelpingLabel(
  family: HelpingOutcomeFamily,
  bucketKey: string,
) {
  if (family === "prestige-band") {
    return bucketKey === "six-plus" ? "Helper 6+" : "Helper Below 6";
  }

  if (bucketKey === "ahead-target") return "Helper Ahead of Target";
  if (bucketKey === "behind-target") return "Helper Behind Target";
  return "Helper Near Even";
}

export function buildHelpingOutcomeRollups(games: Game[]): HelpingOutcomeRollup[] {
  const events = buildAssistContextEvents(games);
  const gameById = new Map((games ?? []).map((game) => [String(game?.id ?? ""), game]));
  const aggregates = new Map<
    string,
    {
      tableSizeBucket: HelpingOutcomeTableSizeBucket;
      family: HelpingOutcomeFamily;
      bucketKey: string;
      label: string;
      sampleSize: number;
      helperWins: number;
      helpedWins: number;
    }
  >();

  for (const event of events) {
    const game = gameById.get(event.gameId);
    const tableSizeBucket = game ? resolveTableSizeBucket(game) : null;
    if (!tableSizeBucket) continue;

    const winnerId = String(getWinnerId(game) ?? "");
    const bucketPairs = [
      ["prestige-band", resolvePrestigeBand(event)],
      ["target-gap", resolveTargetGapBand(event)],
    ] as const;

    for (const [family, bucketKey] of bucketPairs) {
      const key = `${tableSizeBucket}:${family}:${bucketKey}`;
      const current = aggregates.get(key) ?? {
        tableSizeBucket,
        family,
        bucketKey,
        label: buildHelpingLabel(family, bucketKey),
        sampleSize: 0,
        helperWins: 0,
        helpedWins: 0,
      };

      current.sampleSize += 1;
      current.helperWins += winnerId === event.assisterId ? 1 : 0;
      current.helpedWins += winnerId === event.targetId ? 1 : 0;
      aggregates.set(key, current);
    }
  }

  return Array.from(aggregates.values())
    .map((entry) => ({
      key: `${entry.tableSizeBucket}:${entry.family}:${entry.bucketKey}`,
      tableSizeBucket: entry.tableSizeBucket,
      family: entry.family,
      label: entry.label,
      sampleSize: entry.sampleSize,
      helperWinRate:
        entry.sampleSize > 0 ? entry.helperWins / entry.sampleSize : 0,
      helpedPlayerWinRate:
        entry.sampleSize > 0 ? entry.helpedWins / entry.sampleSize : 0,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
```

- [ ] **Step 4: Run the rollup test to verify it passes**

Run:

```powershell
node .\scripts\assist-context-metrics.test.cjs
```

Expected: PASS with `assist-context-metrics.test.cjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/assist-context-metrics.test.cjs utils/assistContextMetrics.ts
git commit -m "feat: add helping outcome rollups"
```

### Task 2: Extend Local Moonrakers Intel with Helping Outcome Reads

**Files:**
- Modify: `utils/playerProfileMoonrakers.ts:83-900`
- Modify: `scripts/player-profile-moonrakers.test.cjs:1-775`

- [ ] **Step 1: Write the failing profile test**

Append this focused fixture and assertion block to `scripts/player-profile-moonrakers.test.cjs`:

```js
{
  const helpingPlayers = [
    { id: "a", name: "Astra" },
    { id: "b", name: "Bolt" },
    { id: "c", name: "Comet" },
  ];
  const helpingOutcomeGames = [
    {
      id: "duel-1",
      winnerId: "a",
      players: [{ id: "a" }, { id: "b" }],
      rounds: [
        { playerId: "a", prestige: 6, assistRecipients: {}, assistPrestigeRecipients: {} },
        { playerId: "b", prestige: 2, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
      ],
    },
    {
      id: "duel-2",
      winnerId: "a",
      players: [{ id: "a" }, { id: "b" }],
      rounds: [
        { playerId: "a", prestige: 6, assistRecipients: {}, assistPrestigeRecipients: {} },
        { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
      ],
    },
    {
      id: "duel-3",
      winnerId: "a",
      players: [{ id: "a" }, { id: "b" }],
      rounds: [
        { playerId: "a", prestige: 7, assistRecipients: {}, assistPrestigeRecipients: {} },
        { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
      ],
    },
    {
      id: "crew-1",
      winnerId: "b",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      rounds: [
        { playerId: "b", prestige: 3, assistRecipients: {}, assistPrestigeRecipients: {} },
        { playerId: "b", prestige: 2, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
      ],
    },
    {
      id: "crew-2",
      winnerId: "b",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      rounds: [
        { playerId: "b", prestige: 4, assistRecipients: {}, assistPrestigeRecipients: {} },
        { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
      ],
    },
    {
      id: "crew-3",
      winnerId: "b",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      rounds: [
        { playerId: "b", prestige: 3, assistRecipients: {}, assistPrestigeRecipients: {} },
        { playerId: "b", prestige: 1, assistRecipients: { a: 1 }, assistPrestigeRecipients: { a: 1 } },
      ],
    },
  ];

  const profile = buildMoonrakersIntelProfile({
    playerId: "a",
    players: helpingPlayers,
    games: helpingOutcomeGames,
    samples: buildPlaystyleSamples(helpingPlayers, helpingOutcomeGames),
  });

  assert.equal(profile.hasData, true);
  assert.deepEqual(profile.helpingOutcomeReads.twoPlayer, [
    {
      key: "two-player:prestige-band:six-plus",
      label: "Helper 6+",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "100%",
      helpedPlayerWinRateLabel: "0%",
      evidenceLine: "Helper won 100% across 3 timed assists in 2-player games.",
      suggestionLine: "Helping after reaching 6+ prestige is paying off for the helper here.",
    },
    {
      key: "two-player:target-gap:ahead-target",
      label: "Helper Ahead of Target",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "100%",
      helpedPlayerWinRateLabel: "0%",
      evidenceLine: "Helper won 100% across 3 timed assists in 2-player games.",
      suggestionLine: "Helping while already ahead of the target is favoring the helper in this sample.",
    },
  ]);
  assert.deepEqual(profile.helpingOutcomeReads.threePlus, [
    {
      key: "three-plus:prestige-band:below-six",
      label: "Helper Below 6",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "0%",
      helpedPlayerWinRateLabel: "100%",
      evidenceLine: "Helped players won 100% across 3 timed assists in 3+ player games.",
      suggestionLine: "Helping before stabilizing your own prestige looks risky here.",
    },
    {
      key: "three-plus:target-gap:behind-target",
      label: "Helper Behind Target",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "0%",
      helpedPlayerWinRateLabel: "100%",
      evidenceLine: "Helped players won 100% across 3 timed assists in 3+ player games.",
      suggestionLine: "The target is gaining more than the helper when the helper is already behind.",
    },
  ]);
}
```

- [ ] **Step 2: Run the profile test to verify it fails**

Run:

```powershell
node .\scripts\player-profile-moonrakers.test.cjs
```

Expected: FAIL because `helpingOutcomeReads` is missing from the Moonrakers Intel profile.

- [ ] **Step 3: Write the minimal Moonrakers Intel implementation**

Extend the type block and add one formatter inside `utils/playerProfileMoonrakers.ts`:

```ts
export type MoonrakersHelpingOutcomeRow = {
  key: string;
  label: string;
  sampleSizeLabel: string;
  helperWinRateLabel: string;
  helpedPlayerWinRateLabel: string;
  evidenceLine: string;
  suggestionLine: string;
};

export type MoonrakersHelpingOutcomeReads = {
  twoPlayer: MoonrakersHelpingOutcomeRow[];
  threePlus: MoonrakersHelpingOutcomeRow[];
};

function buildHelpingOutcomeSuggestion(helperWinRate: number, helpedWinRate: number, label: string) {
  if (helperWinRate >= helpedWinRate + 0.15) {
    if (label === "Helper 6+") {
      return "Helping after reaching 6+ prestige is paying off for the helper here.";
    }

    if (label === "Helper Ahead of Target") {
      return "Helping while already ahead of the target is favoring the helper in this sample.";
    }

    return "This is the strongest helper spot in the current sample.";
  }

  if (helpedWinRate >= helperWinRate + 0.15) {
    if (label === "Helper Below 6") {
      return "Helping before stabilizing your own prestige looks risky here.";
    }

    if (label === "Helper Behind Target") {
      return "The target is gaining more than the helper when the helper is already behind.";
    }

    return "The target is gaining more than the helper in this spot.";
  }

  return "This looks mixed so far.";
}

function buildHelpingOutcomeReads(games: Game[]): MoonrakersHelpingOutcomeReads {
  const rows = buildHelpingOutcomeRollups(games).filter((row) => row.sampleSize >= 3);

  const formatRow = (row: HelpingOutcomeRollup): MoonrakersHelpingOutcomeRow => ({
    key: row.key,
    label: row.label,
    sampleSizeLabel: `${row.sampleSize} timed assists`,
    helperWinRateLabel: formatPercent(row.helperWinRate),
    helpedPlayerWinRateLabel: formatPercent(row.helpedPlayerWinRate),
    evidenceLine:
      row.helpedPlayerWinRate > row.helperWinRate
        ? `Helped players won ${formatPercent(row.helpedPlayerWinRate)} across ${row.sampleSize} timed assists in ${row.tableSizeBucket === "two-player" ? "2-player" : "3+ player"} games.`
        : `Helper won ${formatPercent(row.helperWinRate)} across ${row.sampleSize} timed assists in ${row.tableSizeBucket === "two-player" ? "2-player" : "3+ player"} games.`,
    suggestionLine: buildHelpingOutcomeSuggestion(
      row.helperWinRate,
      row.helpedPlayerWinRate,
      row.label,
    ),
  });

  return {
    twoPlayer: rows
      .filter((row) => row.tableSizeBucket === "two-player")
      .map(formatRow),
    threePlus: rows
      .filter((row) => row.tableSizeBucket === "three-plus")
      .map(formatRow),
  };
}
```

Then add `helpingOutcomeReads: buildHelpingOutcomeReads(relevantGames)` to the `hasData: true` Moonrakers Intel return shape.

- [ ] **Step 4: Run the profile test to verify it passes**

Run:

```powershell
node .\scripts\player-profile-moonrakers.test.cjs
```

Expected: PASS with `player-profile-moonrakers.test.cjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/player-profile-moonrakers.test.cjs utils/playerProfileMoonrakers.ts
git commit -m "feat: add helping outcome reads to moonrakers intel"
```

### Task 3: Patch the Server-Authored Payloads

**Files:**
- Create: `supabase/migrations/20260527154500_moonrakers_helping_context_win_rates.sql`
- Create: `scripts/helping-context-payload-migration.test.cjs`

- [ ] **Step 1: Write the failing migration guard**

Create `scripts/helping-context-payload-migration.test.cjs` with this content:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const requiredSnippets = [
  "create or replace function public.get_stats_screen",
  "create or replace function public.get_player_profile_screen",
  "helpingOutcomeReads",
  "twoPlayer",
  "threePlus",
  "Helper 6+",
  "Helper Below 6",
  "Helper Ahead of Target",
  "Helper Behind Target",
  "helperWinRate",
  "helpedPlayerWinRate",
  "suggestionLine",
  "assist_recipients",
  "assist_prestige_recipients",
];

const fileName = fs
  .readdirSync(migrationsDir)
  .sort()
  .reverse()
  .find((name) => {
    const source = fs.readFileSync(path.join(migrationsDir, name), "utf8");
    return requiredSnippets.every((snippet) =>
      source.toLowerCase().includes(snippet.toLowerCase()),
    );
  });

assert.ok(
  fileName,
  "expected a migration that patches stats and player profile with helping outcome reads",
);

console.log("helping-context-payload-migration.test.cjs passed");
```

- [ ] **Step 2: Run the migration guard to verify it fails**

Run:

```powershell
node .\scripts\helping-context-payload-migration.test.cjs
```

Expected: FAIL because no migration includes the helping-outcome payload keys yet.

- [ ] **Step 3: Write the minimal migration patch**

Create `supabase/migrations/20260527154500_moonrakers_helping_context_win_rates.sql` and patch both functions with one shared pattern:

```sql
create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
set search_path = 'public'
as $$
declare
  helping_outcome_reads jsonb := jsonb_build_object('twoPlayer', '[]'::jsonb, 'threePlus', '[]'::jsonb);
begin
  -- keep the existing body intact above this point, then add:
  with assist_helping_events as (
    select
      g.id as game_id,
      case when table_size.count_players = 2 then 'twoPlayer' else 'threePlus' end as table_size_bucket,
      case when helper_state.pre_assist_prestige >= 6 then 'Helper 6+' else 'Helper Below 6' end as prestige_band_label,
      case
        when helper_state.pre_assist_prestige >= target_state.pre_assist_prestige + 2 then 'Helper Ahead of Target'
        when helper_state.pre_assist_prestige <= target_state.pre_assist_prestige - 2 then 'Helper Behind Target'
        else 'Helper Near Even'
      end as target_gap_label,
      case when g.winner_profile_id = helper_state.helper_profile_id then 1 else 0 end as helper_win_flag,
      case when g.winner_profile_id = target_state.target_profile_id then 1 else 0 end as helped_win_flag
    from public.games as g
    join lateral (
      select count(*)::int as count_players
      from public.game_participants as gp
      where gp.game_id = g.id
    ) as table_size on true
    join public.game_rounds as gr on gr.game_id = g.id
    join lateral jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as assist_edge(helper_profile_id_text, assist_count_text) on true
    -- derive helper_state.pre_assist_prestige and target_state.pre_assist_prestige using the same running-prestige semantics as the local helper
    where g.status = 'finished'
      and profile_id = auth.uid()
  ),
  helping_outcome_rows as (
    select
      table_size_bucket,
      family,
      label,
      count(*)::int as sample_size,
      coalesce(avg(helper_win_flag::numeric), 0)::numeric as helper_win_rate,
      coalesce(avg(helped_win_flag::numeric), 0)::numeric as helped_player_win_rate
    from (
      select
        table_size_bucket,
        'prestige-band'::text as family,
        prestige_band_label as label,
        helper_win_flag,
        helped_win_flag
      from assist_helping_events
      union all
      select
        table_size_bucket,
        'target-gap'::text as family,
        target_gap_label as label,
        helper_win_flag,
        helped_win_flag
      from assist_helping_events
    ) unioned
    group by table_size_bucket, family, label
    having count(*) >= 3
  )
  select jsonb_build_object(
    'twoPlayer',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', lower(replace(table_size_bucket || ':' || family || ':' || label, ' ', '-')),
          'label', label,
          'sampleSize', sample_size,
          'sampleSizeLabel', format('%s timed assists', sample_size),
          'helperWinRate', helper_win_rate,
          'helpedPlayerWinRate', helped_player_win_rate,
          'helperWinRateLabel', concat(round(helper_win_rate * 100)::int, '%'),
          'helpedPlayerWinRateLabel', concat(round(helped_player_win_rate * 100)::int, '%'),
          'evidenceLine',
            case
              when helped_player_win_rate > helper_win_rate
                then format('Helped players won %s%% across %s timed assists in 2-player games.', round(helped_player_win_rate * 100)::int, sample_size)
              else format('Helper won %s%% across %s timed assists in 2-player games.', round(helper_win_rate * 100)::int, sample_size)
            end,
          'suggestionLine',
            case
              when label = 'Helper 6+' and helper_win_rate >= helped_player_win_rate + 0.15 then 'Helping after reaching 6+ prestige is paying off for the helper here.'
              when label = 'Helper Below 6' and helped_player_win_rate >= helper_win_rate + 0.15 then 'Helping before stabilizing your own prestige looks risky here.'
              when label = 'Helper Ahead of Target' and helper_win_rate >= helped_player_win_rate + 0.15 then 'Helping while already ahead of the target is favoring the helper in this sample.'
              when label = 'Helper Behind Target' and helped_player_win_rate >= helper_win_rate + 0.15 then 'The target is gaining more than the helper when the helper is already behind.'
              when helped_player_win_rate >= helper_win_rate + 0.15 then 'The target is gaining more than the helper in this spot.'
              when helper_win_rate >= helped_player_win_rate + 0.15 then 'This is the strongest helper spot in the current sample.'
              else 'This looks mixed so far.'
            end
        )
      ) filter (where table_size_bucket = 'twoPlayer'),
      '[]'::jsonb
    ),
    'threePlus',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', lower(replace(table_size_bucket || ':' || family || ':' || label, ' ', '-')),
          'label', label,
          'sampleSize', sample_size,
          'sampleSizeLabel', format('%s timed assists', sample_size),
          'helperWinRate', helper_win_rate,
          'helpedPlayerWinRate', helped_player_win_rate,
          'helperWinRateLabel', concat(round(helper_win_rate * 100)::int, '%'),
          'helpedPlayerWinRateLabel', concat(round(helped_player_win_rate * 100)::int, '%'),
          'evidenceLine',
            case
              when helped_player_win_rate > helper_win_rate
                then format('Helped players won %s%% across %s timed assists in 3+ player games.', round(helped_player_win_rate * 100)::int, sample_size)
              else format('Helper won %s%% across %s timed assists in 3+ player games.', round(helper_win_rate * 100)::int, sample_size)
            end,
          'suggestionLine',
            case
              when label = 'Helper 6+' and helper_win_rate >= helped_player_win_rate + 0.15 then 'Helping after reaching 6+ prestige is paying off for the helper here.'
              when label = 'Helper Below 6' and helped_player_win_rate >= helper_win_rate + 0.15 then 'Helping before stabilizing your own prestige looks risky here.'
              when label = 'Helper Ahead of Target' and helper_win_rate >= helped_player_win_rate + 0.15 then 'Helping while already ahead of the target is favoring the helper in this sample.'
              when label = 'Helper Behind Target' and helped_player_win_rate >= helper_win_rate + 0.15 then 'The target is gaining more than the helper when the helper is already behind.'
              when helped_player_win_rate >= helper_win_rate + 0.15 then 'The target is gaining more than the helper in this spot.'
              when helper_win_rate >= helped_player_win_rate + 0.15 then 'This is the strongest helper spot in the current sample.'
              else 'This looks mixed so far.'
            end
        )
      ) filter (where table_size_bucket = 'threePlus'),
      '[]'::jsonb
    )
  )
  into helping_outcome_reads
  from helping_outcome_rows;

  -- set playstyle.helpingOutcomeReads in get_stats_screen
  -- set moonrakers_intel.helpingOutcomeReads in get_player_profile_screen
end;
$$;
```

Keep the existing function logic intact outside the new helping-outcome CTEs and payload inserts. Do not rewrite unrelated stats/profile sections.

- [ ] **Step 4: Run the migration guard to verify it passes**

Run:

```powershell
node .\scripts\helping-context-payload-migration.test.cjs
```

Expected: PASS with `helping-context-payload-migration.test.cjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/helping-context-payload-migration.test.cjs supabase/migrations/20260527154500_moonrakers_helping_context_win_rates.sql
git commit -m "feat: publish helping outcome reads"
```

### Task 4: Render the New Rows on Stats and Player Profile

**Files:**
- Create: `components/analytics/HelpingOutcomeCard.tsx`
- Modify: `lib/cloud/analytics/statsScreenDisplay.ts:1-320`
- Modify: `scripts/stats-screen-server-rows.test.ts:1-238`
- Modify: `app/stats.tsx:277-787`
- Modify: `components/player/MoonrakersIntelSection.tsx:404-539`
- Create: `scripts/helping-context-surface-links.test.cjs`

- [ ] **Step 1: Write the failing display and surface tests**

Add this normalization assertion to `scripts/stats-screen-server-rows.test.ts`:

```ts
import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsHelpingOutcomeRows,
  normalizeStatsPlayerCountOverviewRows,
  normalizeStatsPlayerCountSummaryRows,
} from "../lib/cloud/analytics/statsScreenDisplay.ts";

const helpingOutcomeBuckets = normalizeStatsHelpingOutcomeRows({
  twoPlayer: [
    {
      key: "two-player:prestige-band:six-plus",
      label: "Helper 6+",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "100%",
      helpedPlayerWinRateLabel: "0%",
      evidenceLine: "Helper won 100% across 3 timed assists in 2-player games.",
      suggestionLine: "Helping after reaching 6+ prestige is paying off for the helper here.",
    },
  ],
  threePlus: [
    {
      key: "three-plus:target-gap:behind-target",
      label: "Helper Behind Target",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "0%",
      helpedPlayerWinRateLabel: "100%",
      evidenceLine: "Helped players won 100% across 3 timed assists in 3+ player games.",
      suggestionLine: "The target is gaining more than the helper when the helper is already behind.",
    },
  ],
});

assert.deepEqual(helpingOutcomeBuckets, {
  twoPlayer: [
    {
      key: "two-player:prestige-band:six-plus",
      label: "Helper 6+",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "100%",
      helpedPlayerWinRateLabel: "0%",
      evidenceLine: "Helper won 100% across 3 timed assists in 2-player games.",
      suggestionLine: "Helping after reaching 6+ prestige is paying off for the helper here.",
    },
  ],
  threePlus: [
    {
      key: "three-plus:target-gap:behind-target",
      label: "Helper Behind Target",
      sampleSizeLabel: "3 timed assists",
      helperWinRateLabel: "0%",
      helpedPlayerWinRateLabel: "100%",
      evidenceLine: "Helped players won 100% across 3 timed assists in 3+ player games.",
      suggestionLine: "The target is gaining more than the helper when the helper is already behind.",
    },
  ],
});
```

Create `scripts/helping-context-surface-links.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const statsSource = fs.readFileSync(path.join(projectRoot, "app", "stats.tsx"), "utf8");
const intelSource = fs.readFileSync(path.join(projectRoot, "components", "player", "MoonrakersIntelSection.tsx"), "utf8");
const cardSource = fs.readFileSync(path.join(projectRoot, "components", "analytics", "HelpingOutcomeCard.tsx"), "utf8");

assert.match(statsSource, /Helping Context/);
assert.match(statsSource, /2-player/);
assert.match(statsSource, /3\+ players/);
assert.match(statsSource, /normalizeStatsHelpingOutcomeRows/);

assert.match(intelSource, /Helping Outcome Reads/);
assert.match(intelSource, /2-player/);
assert.match(intelSource, /3\+ players/);
assert.match(intelSource, /helpingOutcomeReads/);

assert.match(cardSource, /DefinitionTermText/);
assert.match(cardSource, /Helper Win Rate/);
assert.match(cardSource, /Helped Player Win Rate/);

console.log("helping-context-surface-links.test.cjs passed");
```

- [ ] **Step 2: Run the display and surface tests to verify they fail**

Run:

```powershell
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
node .\scripts\helping-context-surface-links.test.cjs
```

Expected: FAIL because the new normalizer, shared card, and surfaced sections do not exist yet.

- [ ] **Step 3: Write the minimal UI and display implementation**

Create `components/analytics/HelpingOutcomeCard.tsx`:

```tsx
import React from "react";
import { StyleSheet, View } from "react-native";

import DefinitionTermText from "@/components/ui/DefinitionTermText";
import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";

export type HelpingOutcomeCardRow = {
  key: string;
  label: string;
  sampleSizeLabel: string;
  helperWinRateLabel: string;
  helpedPlayerWinRateLabel: string;
  evidenceLine: string;
  suggestionLine: string;
};

export default function HelpingOutcomeCard({ row }: { row: HelpingOutcomeCardRow }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{row.label}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <DefinitionTermText label="Helper Win Rate" metric="helperHelpWinRate" style={styles.metaLabel} />
          <Text style={styles.metaValue}>{row.helperWinRateLabel}</Text>
        </View>
        <View style={styles.metaItem}>
          <DefinitionTermText label="Helped Player Win Rate" metric="helpedHelpWinRate" style={styles.metaLabel} />
          <Text style={styles.metaValue}>{row.helpedPlayerWinRateLabel}</Text>
        </View>
      </View>
      <Text style={styles.sample}>{row.sampleSizeLabel}</Text>
      <Text style={styles.evidence}>{row.evidenceLine}</Text>
      <Text style={styles.suggestion}>{row.suggestionLine}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    gap: 8,
  },
  title: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "900" },
  metaRow: { flexDirection: "row", gap: 10 },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  metaValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "900" },
  sample: { color: COLORS.textMuted, fontSize: 11 },
  evidence: { color: COLORS.textPrimary, fontSize: 12, lineHeight: 17 },
  suggestion: { color: COLORS.cyan, fontSize: 12, lineHeight: 17, fontWeight: "700" },
});
```

Add this normalizer to `lib/cloud/analytics/statsScreenDisplay.ts`:

```ts
export type StatsHelpingOutcomeRow = {
  key: string;
  label: string;
  sampleSizeLabel: string;
  helperWinRateLabel: string;
  helpedPlayerWinRateLabel: string;
  evidenceLine: string;
  suggestionLine: string;
};

export type StatsHelpingOutcomeBuckets = {
  twoPlayer: StatsHelpingOutcomeRow[];
  threePlus: StatsHelpingOutcomeRow[];
};

function normalizeHelpingOutcomeRow(entry: PayloadRecord): StatsHelpingOutcomeRow {
  return {
    key: toStringValue(entry.key) || "helping-outcome",
    label: toStringValue(entry.label) || "Helping outcome",
    sampleSizeLabel: toStringValue(entry.sampleSizeLabel) || "0 timed assists",
    helperWinRateLabel: toStringValue(entry.helperWinRateLabel) || "0%",
    helpedPlayerWinRateLabel: toStringValue(entry.helpedPlayerWinRateLabel) || "0%",
    evidenceLine: toStringValue(entry.evidenceLine),
    suggestionLine: toStringValue(entry.suggestionLine),
  };
}

export function normalizeStatsHelpingOutcomeRows(value: unknown): StatsHelpingOutcomeBuckets {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadRecord)
    : {};

  return {
    twoPlayer: toArray(record.twoPlayer).map(normalizeHelpingOutcomeRow),
    threePlus: toArray(record.threePlus).map(normalizeHelpingOutcomeRow),
  };
}
```

Update `app/stats.tsx` to import the new normalizer and card component, then render the helping cluster inside `renderPlaystyleTab()`:

```tsx
import HelpingOutcomeCard from "@/components/analytics/HelpingOutcomeCard";

const helpingOutcomeRows = normalizeStatsHelpingOutcomeRows(playstyleSection.helpingOutcomeReads);

{helpingOutcomeRows.twoPlayer.length > 0 || helpingOutcomeRows.threePlus.length > 0 ? (
  <View style={styles.metricSubsection}>
    <DefinitionTermText label="Helping Context" metric="helpingOutcomeReads" style={styles.metricSubsectionTitle} />
    {helpingOutcomeRows.twoPlayer.length > 0 ? (
      <View style={styles.signalSection}>
        <Text style={styles.compactSectionTitle}>2-player</Text>
        {helpingOutcomeRows.twoPlayer.map((row) => (
          <HelpingOutcomeCard key={row.key} row={row} />
        ))}
      </View>
    ) : null}
    {helpingOutcomeRows.threePlus.length > 0 ? (
      <View style={styles.signalSection}>
        <Text style={styles.compactSectionTitle}>3+ players</Text>
        {helpingOutcomeRows.threePlus.map((row) => (
          <HelpingOutcomeCard key={row.key} row={row} />
        ))}
      </View>
    ) : null}
  </View>
) : null}
```

Update `components/player/MoonrakersIntelSection.tsx` with a matching block below `Assist Context`:

```tsx
<SectionBlock title="Helping Outcome Reads">
  <DefinitionTermText
    label="Helping Outcome Reads"
    metric="helpingOutcomeReads"
    style={styles.subsectionLink}
  />
  {profile.helpingOutcomeReads.twoPlayer.length > 0 ? (
    <View style={styles.fullWidthSection}>
      <Text style={styles.subsectionMiniLabel}>2-player</Text>
      <View style={styles.metricGrid}>
        {profile.helpingOutcomeReads.twoPlayer.map((row) => (
          <HelpingOutcomeCard key={row.key} row={row} />
        ))}
      </View>
    </View>
  ) : null}
  {profile.helpingOutcomeReads.threePlus.length > 0 ? (
    <View style={styles.fullWidthSection}>
      <Text style={styles.subsectionMiniLabel}>3+ players</Text>
      <View style={styles.metricGrid}>
        {profile.helpingOutcomeReads.threePlus.map((row) => (
          <HelpingOutcomeCard key={row.key} row={row} />
        ))}
      </View>
    </View>
  ) : null}
</SectionBlock>

const styles = StyleSheet.create({
  // keep the existing styles untouched and add:
  fullWidthSection: {
    width: "100%",
    gap: 10,
  },
  subsectionMiniLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  subsectionLink: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: "700",
  },
});
```

- [ ] **Step 4: Run the display and surface tests to verify they pass**

Run:

```powershell
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
node .\scripts\helping-context-surface-links.test.cjs
```

Expected: PASS for both scripts.

- [ ] **Step 5: Commit**

```powershell
git add app/stats.tsx components/analytics/HelpingOutcomeCard.tsx components/player/MoonrakersIntelSection.tsx lib/cloud/analytics/statsScreenDisplay.ts scripts/stats-screen-server-rows.test.ts scripts/helping-context-surface-links.test.cjs
git commit -m "feat: surface helping outcome reads"
```

### Task 5: Add Glossary Entries and Definition Routing

**Files:**
- Modify: `utils/definitionCatalog.ts:160-210`
- Modify: `utils/definitionTargets.ts:37-297`
- Modify: `scripts/assist-context-definitions.test.cjs:1-31`

- [ ] **Step 1: Write the failing glossary test**

Extend `scripts/assist-context-definitions.test.cjs` with these snippets:

```js
for (const snippet of [
  'key: "helpingOutcomeReads"',
  'title: "Helping Outcome Reads"',
  'key: "helperHelpWinRate"',
  'title: "Helper Win Rate"',
  'key: "helpedHelpWinRate"',
  'title: "Helped Player Win Rate"',
  'helper win rate": "helperHelpWinRate"',
  'helped player win rate": "helpedHelpWinRate"',
  'helping outcome reads": "helpingOutcomeReads"',
]) {
  assert.ok(
    source.includes(snippet),
    `expected definition coverage for ${snippet}`,
  );
}
```

- [ ] **Step 2: Run the glossary test to verify it fails**

Run:

```powershell
node .\scripts\assist-context-definitions.test.cjs
```

Expected: FAIL because the new helping terms are not in the definition catalog or label aliases yet.

- [ ] **Step 3: Write the minimal glossary implementation**

Append these items to the `support` definition group in `utils/definitionCatalog.ts`:

```ts
{
  key: "helpingOutcomeReads",
  title: "Helping Outcome Reads",
  body: "A table-size-segregated view of what happens to the helper's win rate and the helped player's win rate when assists happen from specific helper prestige contexts.",
},
{
  key: "helperHelpWinRate",
  title: "Helper Win Rate",
  body: "The helper's win rate inside the current helping split. Read this beside Helped Player Win Rate to see who benefits more from the assist timing.",
},
{
  key: "helpedHelpWinRate",
  title: "Helped Player Win Rate",
  body: "The helped player's win rate inside the current helping split. Higher than the helper's rate usually means the target is gaining more from that assist context.",
},
```

Then extend `DEFINITION_METRIC_KEYS` and `DEFINITION_LABEL_ALIASES` in `utils/definitionTargets.ts`:

```ts
const DEFINITION_METRIC_KEYS = new Set([
  // existing keys...
  "helpingOutcomeReads",
  "helperHelpWinRate",
  "helpedHelpWinRate",
]);

const DEFINITION_LABEL_ALIASES: Record<string, string> = {
  // existing aliases...
  "helping outcome reads": "helpingOutcomeReads",
  "helper win rate": "helperHelpWinRate",
  "helped player win rate": "helpedHelpWinRate",
};
```

- [ ] **Step 4: Run the glossary test to verify it passes**

Run:

```powershell
node .\scripts\assist-context-definitions.test.cjs
```

Expected: PASS with `assist-context-definitions.test.cjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/assist-context-definitions.test.cjs utils/definitionCatalog.ts utils/definitionTargets.ts
git commit -m "feat: add helping outcome glossary terms"
```

### Task 6: Run the Focused Verification Suite

**Files:**
- No new files.
- Verify the files touched in Tasks 1-5.

- [ ] **Step 1: Run the focused script suite**

Run:

```powershell
node .\scripts\assist-context-metrics.test.cjs
node .\scripts\player-profile-moonrakers.test.cjs
node .\scripts\helping-context-payload-migration.test.cjs
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
node .\scripts\helping-context-surface-links.test.cjs
node .\scripts\assist-context-definitions.test.cjs
```

Expected: PASS for all six scripts.

- [ ] **Step 2: Run TypeScript verification**

Run:

```powershell
node .\node_modules\typescript\bin\tsc --noEmit --pretty false
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Review the final diff**

Run:

```powershell
git diff --stat
git diff -- app/stats.tsx components/analytics/HelpingOutcomeCard.tsx components/player/MoonrakersIntelSection.tsx lib/cloud/analytics/statsScreenDisplay.ts supabase/migrations/20260527154500_moonrakers_helping_context_win_rates.sql utils/assistContextMetrics.ts utils/definitionCatalog.ts utils/definitionTargets.ts utils/playerProfileMoonrakers.ts
```

Expected: The diff is limited to helping-outcome rollups, payload publication, surface rendering, and glossary wiring. No unrelated analytics or chart files should move.

- [ ] **Step 4: Commit the verified feature**

```powershell
git add app/stats.tsx components/analytics/HelpingOutcomeCard.tsx components/player/MoonrakersIntelSection.tsx lib/cloud/analytics/statsScreenDisplay.ts scripts/assist-context-definitions.test.cjs scripts/assist-context-metrics.test.cjs scripts/helping-context-payload-migration.test.cjs scripts/helping-context-surface-links.test.cjs scripts/player-profile-moonrakers.test.cjs scripts/stats-screen-server-rows.test.ts supabase/migrations/20260527154500_moonrakers_helping_context_win_rates.sql utils/assistContextMetrics.ts utils/definitionCatalog.ts utils/definitionTargets.ts utils/playerProfileMoonrakers.ts
git commit -m "feat: add helping context win rate analytics"
```

## Plan Self-Review

- Spec coverage check: this plan covers the local assist-event math, local fallback/profile output, server-authored payload publication, both UI surfaces, the `2-player` vs `3+ players` split, and the glossary/linking requirement.
- Placeholder scan: no unresolved placeholder markers remain.
- Type consistency check: the plan uses one shared row vocabulary across utilities, payloads, and surfaces:
  - `helpingOutcomeReads`
  - `twoPlayer`
  - `threePlus`
  - `helperWinRate`
  - `helpedPlayerWinRate`
  - `evidenceLine`
  - `suggestionLine`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-27-moonrakers-helping-context-win-rates-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
