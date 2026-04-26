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

console.log("supabase-foundation.test.ts passed");
