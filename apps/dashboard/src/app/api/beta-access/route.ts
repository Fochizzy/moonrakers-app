import { NextResponse } from "next/server";

import {
  isDuplicateRequestError,
  parseBetaAccessRequest,
} from "@/lib/beta/betaAccessRequest";
import {
  buildApplicantEmail,
  buildNotificationEmail,
} from "@/lib/beta/betaEmails";
import { readBrevoConfig, sendBrevoEmail } from "@/lib/beta/sendBrevoEmail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * The signed-out beta access form posts here.
 *
 * Order matters: the row is written first and the emails are sent after. A
 * Brevo outage then costs a notification, not an applicant — the address is
 * already in `beta_access_requests` either way.
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

  const { email } = parsed;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("beta_access_requests")
    .insert({ email, source: "preview" });

  if (error && isDuplicateRequestError(error)) {
    return NextResponse.json({
      ok: true,
      alreadyRequested: true,
      message: "You are already on the list — sit tight for the invite.",
    });
  }

  if (error) {
    console.error("[beta-access] could not record request", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Could not record that request. Try again in a moment.",
      },
      { status: 502 },
    );
  }

  const config = readBrevoConfig(process.env);
  const notifyTo = process.env.BETA_NOTIFY_TO?.trim() || "info@moonrakersapp.org";

  // Both sends are awaited together: neither should block the other, and the
  // applicant's confirmation is not more important than the notification.
  const [applicantResult, notificationResult] = await Promise.all([
    sendBrevoEmail({ config, email: buildApplicantEmail(email), to: email }),
    sendBrevoEmail({
      config,
      email: buildNotificationEmail(email),
      to: notifyTo,
    }),
  ]);

  if (!applicantResult.ok) {
    console.error("[beta-access] applicant email failed", applicantResult.reason);
  }

  if (!notificationResult.ok) {
    console.error(
      "[beta-access] notification email failed",
      notificationResult.reason,
    );
  }

  if (applicantResult.ok && !applicantResult.skipped) {
    const { error: stampError } = await supabase
      .from("beta_access_requests")
      .update({ notified_at: new Date().toISOString() })
      .eq("email", email);

    if (stampError) {
      // Only affects the "who still needs a confirmation" query, so it is not
      // worth failing a request that otherwise succeeded.
      console.warn("[beta-access] could not stamp notified_at", stampError);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyRequested: false,
    message: "Request received. Check your inbox for a confirmation.",
  });
}
