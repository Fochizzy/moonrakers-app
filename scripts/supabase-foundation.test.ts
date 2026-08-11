import assert from "node:assert/strict";

import {
  buildSupabaseRedirectUrl,
  formatSupabaseConfigError,
  readSupabaseEnv,
} from "../lib/supabase.ts";

assert.throws(() => readSupabaseEnv({}), /EXPO_PUBLIC_SUPABASE_URL/);

const env = readSupabaseEnv({
  EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_demo",
});

assert.equal(env.url, "https://example.supabase.co");
assert.equal(env.publishableKey, "sb_publishable_demo");

const fallbackEnv = readSupabaseEnv(
  {},
  {
    EXPO_PUBLIC_SUPABASE_URL: "https://fallback.supabase.co",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fallback",
  },
);

assert.equal(fallbackEnv.url, "https://fallback.supabase.co");
assert.equal(fallbackEnv.publishableKey, "sb_publishable_fallback");

// loadProcessSupabaseEnv always owns both keys, so an un-inlined build hands
// readSupabaseEnv explicit undefined values. The expo-extra fallback must survive.
const undefinedSourceEnv = readSupabaseEnv(
  {
    EXPO_PUBLIC_SUPABASE_URL: undefined,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  },
  {
    EXPO_PUBLIC_SUPABASE_URL: "https://fallback.supabase.co",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fallback",
  },
);

assert.equal(undefinedSourceEnv.url, "https://fallback.supabase.co");
assert.equal(undefinedSourceEnv.publishableKey, "sb_publishable_fallback");

// Partial inlining resolves each key independently.
const partialEnv = readSupabaseEnv(
  {
    EXPO_PUBLIC_SUPABASE_URL: "https://process.supabase.co",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  },
  {
    EXPO_PUBLIC_SUPABASE_URL: "https://fallback.supabase.co",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fallback",
  },
);

assert.equal(partialEnv.url, "https://process.supabase.co");
assert.equal(partialEnv.publishableKey, "sb_publishable_fallback");
assert.match(
  formatSupabaseConfigError(new Error("Missing EXPO_PUBLIC_SUPABASE_URL")),
  /Missing local Supabase config/,
);
assert.match(
  formatSupabaseConfigError({
    message: "Could not find the 'player_name' column of 'profiles' in the schema cache",
  }),
  /does not match the Moonrakers schema/,
);
assert.match(
  formatSupabaseConfigError({
    message: "duplicate key value violates unique constraint",
    details: "Key (player_name)=(Fochizzy) already exists.",
  }),
  /Fochizzy/,
);
assert.match(
  formatSupabaseConfigError({
    message:
      "get_chart_dataset failed: Could not find the function public.get_chart_dataset(chart_key, compare_player_id, focus_player_id, graph_mode, line_mode, metric_key, opponent_id, profile_id, scoped_player_ids, selected_game_id) in the schema cache",
  }),
  /analytics schema update/,
);
assert.match(
  formatSupabaseConfigError({
    message:
      "get_stats_screen failed: Could not find the function public.get_stats_screen(profile_id) in the schema cache",
  }),
  /analytics schema update|schema-cache refresh/i,
);
assert.match(
  formatSupabaseConfigError({
    message: "permission denied for function get_stats_screen",
  }),
  /analytics schema update|backend sync|schema-cache refresh/i,
);
assert.equal(
  buildSupabaseRedirectUrl("moonrakers"),
  "moonrakers://auth/callback",
);
assert.equal(
  buildSupabaseRedirectUrl("moonrakers", { type: "recovery" }),
  "moonrakers://auth/callback?type=recovery",
);
assert.equal(
  buildSupabaseRedirectUrl("moonrakers", { type: "email" }),
  "moonrakers://auth/callback?type=email",
);
assert.equal(
  buildSupabaseRedirectUrl(
    "moonrakers",
    { type: "recovery" },
    { currentOrigin: "https://moonrakers.example" },
  ),
  "https://moonrakers.example/auth/callback?type=recovery",
);
assert.equal(
  buildSupabaseRedirectUrl(
    "moonrakers",
    { type: "email" },
    { currentOrigin: "https://moonrakers.example/" },
  ),
  "https://moonrakers.example/auth/callback?type=email",
);

console.log("supabase-foundation.test.ts passed");
