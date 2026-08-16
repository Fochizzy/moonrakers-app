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

  // A missing key is survivable — the address is already saved — but it is not
  // normal, and skipping quietly is how every confirmation for a live signup
  // went unsent without anything showing up in the logs.
  if (!config) {
    console.error(
      "[beta-access] BREVO_API_KEY is not set: request recorded, no email sent",
    );
  }

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

  // Nothing is stamped back onto the row: the table has no delivery column, and
  // the anon role that gets here is insert-only, so an update would fail the
  // column check and RLS both. Brevo's dashboard is the delivery record.
  const confirmationSent = applicantResult.ok && !applicantResult.skipped;

  return NextResponse.json({
    ok: true,
    alreadyRequested: false,
    // Only promise an inbox when one was actually written to. Saying "check
    // your inbox" after a skipped send is how a broken key looks like success.
    message: confirmationSent
      ? "Request received. Check your inbox for a confirmation."
      : "Request received — you are on the list. The invite comes by email.",
  });
}
