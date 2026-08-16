import { NextResponse } from "next/server";

import { parseBetaAccessRequest } from "@/lib/beta/betaAccessRequest";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Removes one signup, from the admin console.
 *
 * The authorisation that matters is in RLS: `beta_access_requests` only deletes
 * for an authenticated user in `private.beta_admins`. The checks here exist to
 * return a useful status rather than a silent no-op — without the row count
 * check below, a non-admin's delete succeeds against zero rows and looks
 * exactly like a successful delete.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = parseBetaAccessRequest(
    (payload as { email?: unknown } | null)?.email,
  );

  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, message: parsed.message },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in first." },
      { status: 401 },
    );
  }

  // `select()` on a delete returns the rows that actually went, which is the
  // only way to tell "removed it" apart from "RLS hid it from you".
  const { data, error } = await supabase
    .from("beta_access_requests")
    .delete()
    .eq("email", parsed.email)
    .select("id");

  if (error) {
    console.error("[beta-delete] delete failed", error);
    return NextResponse.json(
      { ok: false, message: "Could not remove that signup." },
      { status: 502 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, message: "That address is not on the signup list." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, removed: data.length });
}
