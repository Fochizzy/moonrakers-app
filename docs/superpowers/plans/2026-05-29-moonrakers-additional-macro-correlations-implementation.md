# Moonrakers Additional Macro Correlations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the expanded assist-context and phase-1 macro correlation rows through the live `get_insights_screen(...)` Supabase contract so the existing Insights `Macro Correlations` grid shows the new metrics without client-side derivation.

**Architecture:** Patch the newest live insights migration instead of adding client logic, and prove the contract with focused migration-text tests. Preserve the existing React consumption path in `app/insights.tsx` and `components/CorrelationStats.tsx` unless a tiny normalization change becomes necessary.

**Tech Stack:** PostgreSQL / Supabase SQL migrations, React Native TypeScript, Node-based contract tests

---

### Task 1: Lock the failing contract around the expanded macro payload

**Files:**
- Modify: `scripts/insights-live-correlation-overlay-fix.test.cjs`
- Modify: `scripts/insights-hybrid-personal-correlations.test.cjs`
- Verify against: `supabase/migrations/20260529153000_moonrakers_insights_hybrid_personal_correlations.sql`

- [ ] **Step 1: Write the failing macro contract assertions**

Add assertions that require the live insights migration to publish:

```js
for (const label of [
  "Assist Target Prestige Gap vs Victory",
  "Assist Leader Prestige Gap vs Victory",
  "Assists at 6+ Prestige vs Victory",
  "Assists Over 5 Behind Leader vs Victory",
  "Assist Prestige Gained vs Victory",
  "Late Lead Conversion",
  "Tempo Control",
  "Seat to Win Correlation",
  "Interaction Index",
]) {
  assert.match(
    source,
    new RegExp(`'label',\\s*'${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}'`),
    `expected the live insights macro payload to publish ${label}`,
  );
}
```

Add an assertion that live computed macro rows win over stale persisted rows:

```js
assert.match(
  source,
  /macro_payload\s*:=\s*case\s+when\s+jsonb_array_length\(macro_payload\)\s*>\s*0\s+then\s+macro_payload\s+else\s+existing_macro\s+end;/i,
  "expected live macro rows to take precedence over persisted macro payloads when fresh values were computed",
);
```

- [ ] **Step 2: Run the focused contract tests to verify RED**

Run:

```powershell
node .\scripts\insights-live-correlation-overlay-fix.test.cjs
node .\scripts\insights-hybrid-personal-correlations.test.cjs
```

Expected:

- the live overlay test fails because the newer macro labels are not present yet,
- the hybrid personal test still reflects the current personal-row contract and may continue passing.

### Task 2: Patch the live Insights macro payload in Supabase

**Files:**
- Modify: `supabase/migrations/20260529153000_moonrakers_insights_hybrid_personal_correlations.sql`

- [ ] **Step 1: Extend the declared live metric state**

Add macro correlation variables for the new live rows:

```sql
  macro_assist_target_gap numeric := 0;
  macro_assist_leader_gap numeric := 0;
  macro_assists_at_six_plus numeric := 0;
  macro_assists_over5_behind numeric := 0;
  macro_assist_prestige_gained numeric := 0;
  macro_late_lead_conversion numeric := 0;
  macro_tempo_control numeric := 0;
  macro_seat_to_win numeric := 0;
  macro_interaction_index numeric := 0;
```

- [ ] **Step 2: Compute the assist-context and phase-1 macro samples**

Use the existing player-game and assist-context sample CTEs already present in the migration and extend the aggregate selection so it returns:

```sql
      coalesce(
        (
          select corr(assist_context_samples.avg_gap_to_target::double precision, assist_context_samples.victory)
          from assist_context_samples
          where assist_context_samples.avg_gap_to_target is not null
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.avg_gap_to_leader::double precision, assist_context_samples.victory)
          from assist_context_samples
          where assist_context_samples.avg_gap_to_leader is not null
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.assists_at_six_plus::double precision, assist_context_samples.victory)
          from assist_context_samples
        )::numeric,
        0
      )
```

and corresponding aggregates for:

- `assists_over_five_behind`,
- `assist_prestige_gained`,
- `late_lead` vs `win_flag`,
- `tempo_control`,
- `start_seat` vs `win_flag`,
- `interaction_index`.

Use repo-aligned semantics:

```sql
contracts_plus_assists := coalesce(gp.contracts, 0)::numeric + coalesce(gp.assists, 0)::numeric;
tempo_control := coalesce(gp.all_contracts_efficiency, 0)::numeric
  + early_lead_rate
  + prestige_per_turn;
```

If a direct SQL field name differs from the TypeScript helper naming, keep the published labels aligned with the repo glossary even if the local SQL alias names differ.

- [ ] **Step 3: Rebuild `macro_payload` with stable row keys**

Replace the four-row-only macro payload with a keyed payload like:

```sql
    macro_payload := jsonb_build_array(
      jsonb_build_object('key', 'contractsFailureRatio', 'metricKey', 'contractsFailureRatio', 'label', 'Contracts / Failures Ratio vs Win Rate', 'value', round(macro_contract_ratio, 2), 'strength', ...),
      jsonb_build_object('key', 'assistsGiven', 'metricKey', 'assistsGiven', 'label', 'Assists Given vs Win Rate', 'value', round(macro_assists_given, 2), 'strength', ...),
      jsonb_build_object('key', 'assistGapToTarget', 'metricKey', 'assistGapToTarget', 'label', 'Assist Target Prestige Gap vs Victory', 'value', round(macro_assist_target_gap, 2), 'strength', ...),
      jsonb_build_object('key', 'assistGapToLeader', 'metricKey', 'assistGapToLeader', 'label', 'Assist Leader Prestige Gap vs Victory', 'value', round(macro_assist_leader_gap, 2), 'strength', ...),
      jsonb_build_object('key', 'assistsAtSixPlus', 'metricKey', 'assistsAtSixPlus', 'label', 'Assists at 6+ Prestige vs Victory', 'value', round(macro_assists_at_six_plus, 2), 'strength', ...),
      jsonb_build_object('key', 'lateLeadConversion', 'metricKey', 'lateLeadConversion', 'label', 'Late Lead Conversion', 'value', round(macro_late_lead_conversion, 2), 'strength', ...),
      jsonb_build_object('key', 'tempoControl', 'metricKey', 'tempoControl', 'label', 'Tempo Control', 'value', round(macro_tempo_control, 2), 'strength', ...),
      jsonb_build_object('key', 'turnOrderWinCorrelation', 'metricKey', 'turnOrderWinCorrelation', 'label', 'Seat to Win Correlation', 'value', round(macro_seat_to_win, 2), 'strength', ...),
      jsonb_build_object('key', 'interactionIndex', 'metricKey', 'interactionIndex', 'label', 'Interaction Index', 'value', round(macro_interaction_index, 2), 'strength', ...)
    );
```

Reuse the existing `Strong` / `Moderate` / `Light` thresholds for every row.

- [ ] **Step 4: Fix live macro precedence**

Replace the stale-first fallback with live-first logic:

```sql
  macro_payload := case
    when jsonb_array_length(macro_payload) > 0 then macro_payload
    else existing_macro
  end;
```

This preserves persisted rows only when the live computation produced nothing.

### Task 3: Verify the contract and confirm no React follow-up is required

**Files:**
- Verify: `app/insights.tsx`
- Verify: `components/CorrelationStats.tsx`
- Run: `scripts/insights-live-correlation-overlay-fix.test.cjs`
- Run: `scripts/insights-hybrid-personal-correlations.test.cjs`
- Run: `scripts/insights-section-tabs.test.cjs`

- [ ] **Step 1: Re-run the focused migration tests to verify GREEN**

Run:

```powershell
node .\scripts\insights-live-correlation-overlay-fix.test.cjs
node .\scripts\insights-hybrid-personal-correlations.test.cjs
```

Expected:

- both tests pass,
- the live overlay test proves the new macro labels and precedence rule exist,
- the hybrid personal test still proves the personal section contract.

- [ ] **Step 2: Run the existing Insights UI regression**

Run:

```powershell
node .\scripts\insights-section-tabs.test.cjs
```

Expected:

- PASS,
- no regression to the `Personal Correlations`, `Macro Correlations`, and `Top Synergy Pairs` tab structure.

- [ ] **Step 3: Only if needed, patch the normalizer minimally**

If the UI needs stable keys from the new contract, extend the existing normalizer in `app/insights.tsx` like:

```ts
function normalizeSummaryRows(value: unknown) {
  return toArray(value).map((entry, index) => ({
    key: toStringValue(entry.key, `summary-${index}`),
    metricKey: toStringValue(entry.metricKey, ""),
    label:
      toStringValue(entry.label, "") ||
      toStringValue(entry.title, "") ||
      "Signal",
    value: toFiniteNumber(entry.value),
  }));
}
```

Do not make this edit unless verification shows the current label/value path is insufficient.
