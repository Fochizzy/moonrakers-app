import { createBrowserClient } from "@supabase/ssr";

import { dashboardEnv } from "../env";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    dashboardEnv.NEXT_PUBLIC_SUPABASE_URL,
    dashboardEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
