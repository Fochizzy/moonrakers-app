import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { dashboardEnv } from "../env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    dashboardEnv.NEXT_PUBLIC_SUPABASE_URL,
    dashboardEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies directly.
          }
        },
      },
    },
  );
}
