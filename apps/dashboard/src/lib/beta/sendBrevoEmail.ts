import type { BetaEmail } from "./betaEmails";

/**
 * Brevo's transactional endpoint, which is what the app already sends through.
 *
 * The REST API rather than SMTP because this runs in a Cloudflare Worker, and
 * Workers cannot open the raw TCP connection an SMTP relay needs.
 */
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type BrevoConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
};

export type SendResult =
  | { ok: true; skipped: true }
  | { messageId: string | null; ok: true; skipped: false }
  | { ok: false; reason: string };

/**
 * Reads config from the environment. Returns null when the key is absent, which
 * is the signal to skip sending rather than to fail: the request row is already
 * saved by then, and losing the notification is better than losing the person.
 */
export function readBrevoConfig(
  env: Record<string, string | undefined>,
): BrevoConfig | null {
  // BREVO_API_KEY must be a v3 API key from Brevo's "API keys" tab — the value
  // starting `xkeysib-`. The SMTP credential (`xsmtpsib-`) is a different
  // secret for a different protocol; this endpoint answers it with
  // 401 {"message":"Key not found"}, which reads like a revoked key rather
  // than the wrong kind of key. Revoking the SMTP credential in Brevo does not
  // affect this one, and vice versa.
  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    // Must be a sender Brevo has verified, or the API rejects the send outright
    // with "sender not valid" — add it under Senders before deploying a change
    // to this value.
    //
    // Deliverability: `moonrakersapp.org` is authenticated. DKIM is published
    // as CNAMEs at `brevo1._domainkey` and `brevo2._domainkey` (Brevo uses two
    // selectors, not the single `brevo._domainkey` you might go looking for),
    // so signatures carry `d=moonrakersapp.org` and align with this From
    // address. SPF lists Brevo alongside IONOS, and DMARC is published at
    // p=none. Nothing here needs the `auth.` subdomain any more.
    fromEmail: env.BETA_FROM_EMAIL?.trim() || "info@moonrakersapp.org",
    fromName: env.BETA_FROM_NAME?.trim() || "Moonrakers Command",
    replyTo: env.BETA_REPLY_TO?.trim() || "info@moonrakersapp.org",
  };
}

export async function sendBrevoEmail({
  config,
  email,
  to,
  fetchImpl = fetch,
}: {
  config: BrevoConfig | null;
  email: BetaEmail;
  fetchImpl?: typeof fetch;
  to: string;
}): Promise<SendResult> {
  if (!config) {
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.fromEmail, name: config.fromName },
        to: [{ email: to }],
        replyTo: { email: config.replyTo },
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: ["beta-access"],
      }),
    });

    if (!response.ok) {
      // Brevo puts the useful part in the body, not the status text.
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        reason: `Brevo responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      };
    }

    const payload = (await response.json().catch(() => null)) as {
      messageId?: string;
    } | null;

    return { ok: true, skipped: false, messageId: payload?.messageId ?? null };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Brevo request failed",
    };
  }
}
