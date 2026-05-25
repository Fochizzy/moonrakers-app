import assert from "node:assert/strict";

import { createSupabaseClient } from "../lib/supabase.ts";

const client = createSupabaseClient({
  EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_demo",
});

const authClient = (client as any).auth;

assert.equal(
  authClient.flowType,
  "implicit",
  "Moonrakers email auth should use the client-only implicit flow instead of PKCE.",
);
assert.equal(
  authClient.detectSessionInUrl,
  false,
  "Moonrakers handles auth callback URLs itself.",
);

console.log("supabase-client-auth-mode.test.ts passed");
