import { NextResponse } from "next/server";

import { parseBetaAccessRequest } from "@/lib/beta/betaAccessRequest";
import { buildInviteEmail } from "@/lib/beta/betaEmails";
import { readBrevoConfig, sendBrevoEmail } from "@/lib/beta/sendBrevoEmail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Sends the Play Store invite to one applicant, from the admin console.
 *
 * The authorisation that matters is in RLS: `beta_access_requests` only selects
 * and updates for an authenticated user in `private.beta_admins`. The checks
 * here exist to return a useful status rather than a silent no-op.
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

  // A non-admin's select returns nothing, so this doubles as the permission
  // check and as "is that address actually on the list".
  const { data: row, error: lookupError } = await supabase
    .from("beta_access_requests")
    .select("id, email")
    .eq("email", parsed.email)
    .maybeSingle();

  if (lookupError) {
    console.error("[beta-invite] lookup failed", lookupError);
    return NextResponse.json(
      { ok: false, message: "Could not read the signup list." },
      { status: 502 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { ok: false, message: "That address is not on the signup list." },
      { status: 404 },
    );
  }

  const config = readBrevoConfig(process.env);

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        message: "BREVO_API_KEY is not set, so no invite could be sent.",
      },
      { status: 503 },
    );
  }

  const result = await sendBrevoEmail({
    config,
    email: buildInviteEmail(),
    to: parsed.email,
  });

  if (!result.ok) {
    console.error("[beta-invite] send failed", result.reason);
    return NextResponse.json(
      { ok: false, message: "Brevo rejected the send. Nothing was recorded." },
      { status: 502 },
    );
  }

  const invitedAt = new Date().toISOString();
  const { error: stampError } = await supabase
    .from("beta_access_requests")
    .update({ invited_at: invitedAt })
    .eq("id", row.id);

  if (stampError) {
    console.error("[beta-invite] could not stamp invited_at", stampError);
    return NextResponse.json({
      ok: true,
      invitedAt: null,
      message: "Invite sent, but the console could not record it.",
    });
  }

  return NextResponse.json({ ok: true, invitedAt, message: "Invite sent." });
}
